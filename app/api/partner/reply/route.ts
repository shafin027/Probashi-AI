import { z } from "zod";
import { handle, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { replyToReview } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const user = await requireUser(req, ["agency"]);
  const { reviewId, reply } = await parseBody(req, z.object({ reviewId: z.uuid(), reply: z.string().max(800) }).strict());
  await replyToReview(user, reviewId, reply);
  return json({ ok: true });
});
