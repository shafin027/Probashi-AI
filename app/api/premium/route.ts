import { z } from "zod";
import { handle, limit, parseBody } from "@/lib/api.ts";
import { publicUser, requireUser } from "@/lib/auth.ts";
import { forwardSelfHelpCases } from "@/lib/cases.ts";
import { getDb } from "@/lib/db.ts";
import { HttpError, json } from "@/lib/security.ts";
import { PLANS } from "@/lib/plans.ts";

export const runtime = "nodejs";

/**
 * Starts or extends Premium (caseworker for every report, AI phone line, priority help).
 * PAYMENT_MODE=demo accepts the demo checkout; live mode must verify the bKash/SSLCommerz
 * payment server-side first, so until that is wired up it refuses instead of granting for free.
 */
export const POST = handle(async (req) => {
  const user = await requireUser(req, ["worker"]);
  await limit(req, "premium", 10);
  const { plan } = await parseBody(req, z.object({ plan: z.enum(["monthly", "yearly"]), paymentId: z.string().max(100).optional() }).strict());
  if ((process.env.PAYMENT_MODE ?? "demo") !== "demo") throw new HttpError(501, "Live payments are not enabled yet");
  const db = (await getDb())!;
  const [row] = await db.query<{ premium_until: string }>(
    "UPDATE users SET premium_until = greatest(coalesce(premium_until, now()), now()) + make_interval(days => $2) WHERE id = $1 RETURNING premium_until",
    [user.id, PLANS[plan].days],
  );
  const upgraded = { ...user, premium_until: row.premium_until };
  const forwarded = await forwardSelfHelpCases(upgraded);
  return json({ user: publicUser(upgraded), forwarded, receipt: { mode: "demo", amountBdt: PLANS[plan].bdt, plan } });
});
