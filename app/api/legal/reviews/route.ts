import { z } from "zod";
import { handle, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { setReviewStatus } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

export const PATCH = handle(async (req) => {
  await requireUser(req, ["legal", "admin"]);
  const { id, status } = await parseBody(req, z.object({ id: z.uuid(), status: z.enum(["published", "hidden"]) }).strict());
  await setReviewStatus(id, status);
  return json({ ok: true });
});
