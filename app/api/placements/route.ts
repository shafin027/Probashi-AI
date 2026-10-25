import { z } from "zod";
import { handle, limit, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { claimPlacement } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

const Body = z
  .object({
    agencyId: z.uuid(),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    year: z.number().int().min(2000).max(new Date().getFullYear()),
    evidence: z.string().max(300),
  })
  .strict();

/** "I went through this agency." Needed before a review; confirmed by the agency or our staff. */
export const POST = handle(async (req) => {
  const user = await requireUser(req, ["worker"]);
  await limit(req, "placement", 20);
  const b = await parseBody(req, Body);
  return json({ placement: await claimPlacement(user, b.agencyId, b.countryCode, b.year, b.evidence) }, 201);
});
