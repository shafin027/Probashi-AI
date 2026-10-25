import { z } from "zod";
import { handle, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { createOffer, withdrawOffer } from "@/lib/marketplace.ts";
import { COUNTRIES } from "@/lib/data/countries.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

const Offer = z
  .object({
    countryCode: z.enum(COUNTRIES.map((c) => c.code) as [string, ...string[]]),
    jobTitle: z.string().min(2).max(80),
    employer: z.string().max(120),
    salaryLocal: z.number().int().positive().max(1_000_000),
    totalCostBdt: z.number().int().nonnegative().max(5_000_000),
    contractMonths: z.number().int().min(6).max(60),
    seats: z.number().int().min(1).max(5000),
    details: z.string().max(1000),
  })
  .strict();

/** Publishes an offer. It goes live only if it passes the rule engine and the government cost ceiling. */
export const POST = handle(async (req) => {
  const user = await requireUser(req, ["agency"]);
  const offer = await createOffer(user, await parseBody(req, Offer));
  // A blocked offer is a normal outcome (the reasons are shown to the agency), not a request error.
  return json({ offer, published: offer.status === "live" }, offer.status === "live" ? 201 : 200);
});

export const DELETE = handle(async (req) => {
  const user = await requireUser(req, ["agency"]);
  const { id } = await parseBody(req, z.object({ id: z.uuid() }).strict());
  await withdrawOffer(user, id);
  return json({ ok: true });
});
