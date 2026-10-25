import { z } from "zod";
import { handle, limit, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { registerAgency } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

const Body = z.object({ rl: z.string().max(30), name: z.string().max(150), contactPhone: z.string().max(20), address: z.string().max(300) }).strict();

/** Claims an RL number. Verified automatically only when the official list matches (see lib/marketplace.ts). */
export const POST = handle(async (req) => {
  const user = await requireUser(req, ["agency"]);
  await limit(req, "agency-register", 10);
  const agency = await registerAgency(user, await parseBody(req, Body));
  return json({ agency }, 201);
});
