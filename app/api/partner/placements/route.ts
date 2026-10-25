import { z } from "zod";
import { handle, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { agencyRespondPlacement } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

/** Agency confirms or disputes a worker's placement claim (it can't reject: disputes go to staff). */
export const POST = handle(async (req) => {
  const user = await requireUser(req, ["agency"]);
  const { id, action } = await parseBody(req, z.object({ id: z.uuid(), action: z.enum(["confirm", "dispute"]) }).strict());
  await agencyRespondPlacement(user, id, action);
  return json({ ok: true });
});
