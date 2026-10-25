import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/ratelimit.ts";
import { assertSameOrigin, errorResponse, HttpError, json, readJson } from "@/lib/security.ts";
import { unseal } from "@/lib/seal.ts";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    token: z.string().min(40).max(20_000).regex(/^[A-Za-z0-9_-]+$/),
    phone: z.string().regex(/^01[3-9]\d{8}$/),
    paymentId: z.string().max(100).optional(),
  })
  .strict();

type Premium = { negotiationScriptBn: string; questionsToAskAgency: string[] };

/**
 * Unlocks the paid report. PAYMENT_MODE=demo (default) accepts the demo checkout.
 * PAYMENT_MODE=live must verify paymentId with the bKash/SSLCommerz server API
 * before unsealing. That integration needs merchant credentials, so until it
 * is wired up live mode refuses rather than unlocking for free.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!(await rateLimit(`unlock:${clientIp(req)}`, 30, 60 * 60 * 1000))) throw new HttpError(429, "Too many requests");
    const parsed = BodySchema.safeParse(await readJson(req, 32 * 1024));
    if (!parsed.success) throw new HttpError(400, "Invalid request");

    const mode = process.env.PAYMENT_MODE ?? "demo";
    if (mode !== "demo") throw new HttpError(501, "Live payments are not enabled yet");

    const premium = unseal<Premium>(parsed.data.token);
    if (!premium) throw new HttpError(410, "This report has expired or is invalid. Please run the check again.");
    return json({ premium, receipt: { mode: "demo", amountBdt: 299, phone: `${parsed.data.phone.slice(0, 3)}*****${parsed.data.phone.slice(-3)}` } });
  } catch (err) {
    return errorResponse(err);
  }
}
