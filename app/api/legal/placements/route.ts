import { z } from "zod";
import { handle, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { staffDecidePlacement } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

export const PATCH = handle(async (req) => {
  await requireUser(req, ["legal", "admin"]);
  const { id, decision } = await parseBody(req, z.object({ id: z.uuid(), decision: z.enum(["confirmed", "rejected"]) }).strict());
  await staffDecidePlacement(id, decision);
  return json({ ok: true });
});
