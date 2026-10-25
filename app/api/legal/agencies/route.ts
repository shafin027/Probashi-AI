import { z } from "zod";
import { handle, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { reviewAgency } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

/** Staff verify a pending agency after calling the phone number on the official licence list. */
export const PATCH = handle(async (req) => {
  await requireUser(req, ["legal", "admin"]);
  const { id, decision } = await parseBody(req, z.object({ id: z.uuid(), decision: z.enum(["verified", "rejected"]) }).strict());
  await reviewAgency(id, decision);
  return json({ ok: true });
});
