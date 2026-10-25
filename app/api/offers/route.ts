import { handle, limit } from "@/lib/api.ts";
import { liveOffers } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live offers from verified agencies. Every one passed the rule engine and the cost ceiling. */
export const GET = handle(async (req) => {
  await limit(req, "offers", 240);
  const c = new URL(req.url).searchParams.get("country");
  return json({ offers: await liveOffers(c && /^[A-Z]{2}$/.test(c) ? c : undefined) });
});
