import { z } from "zod";
import { handle, limit, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { CATEGORIES, createCase, myCases, referralPack, type Category } from "@/lib/cases.ts";
import { resolveAgency } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z
  .object({
    category: z.enum(Object.keys(CATEGORIES) as [Category, ...Category[]]),
    description: z.string().max(4000),
    agency: z.string().max(200),
    amountLostBdt: z.number().int().nonnegative().max(50_000_000).nullable(),
    whereNow: z.enum(["bangladesh", "abroad"]),
    countryCode: z.string().regex(/^([A-Z]{2})?$/),
    urgent: z.boolean(),
    consentContact: z.boolean(),
  })
  .strict();

export const GET = handle(async (req) => {
  const user = await requireUser(req);
  return json({ cases: await myCases(user) });
});

/** Files a report. Premium members and every emergency go to a legal-aid caseworker. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  await limit(req, "case", 10);
  const b = await parseBody(req, Body, 16 * 1024);
  const agency = b.agency.trim() ? await resolveAgency(b.agency) : null;
  const c = await createCase(user, {
    category: b.category,
    description: b.description,
    agencyId: agency?.profileId ?? null,
    agencyText: agency ? `${agency.name} (${agency.rl})` : b.agency,
    amountLostBdt: b.amountLostBdt,
    whereNow: b.whereNow,
    countryCode: b.countryCode,
    urgent: b.urgent,
    consentContact: b.consentContact,
  });
  return json({ case: c, referrals: referralPack(c.category, c.where_now) }, 201);
});
