import { handle, limit } from "@/lib/api.ts";
import { searchAgencies } from "@/lib/marketplace.ts";
import { registrySize } from "@/lib/registry.ts";
import { HttpError, json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public search of the official licence list, with each agency's confidence score. */
export const GET = handle(async (req) => {
  await limit(req, "agency-search", 120);
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 120).trim() ?? "";
  if (q.length < 2) throw new HttpError(400, "Type an agency name or RL number");
  const results = await searchAgencies(q);
  return json({
    registrySize: await registrySize(),
    results: results.map((v) => ({ rl: v.rl, registry: v.registry, profile: v.profile, trust: v.trust })),
  });
});
