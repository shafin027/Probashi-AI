import { handle, limit } from "@/lib/api.ts";
import { currentUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db.ts";
import { agencyView } from "@/lib/marketplace.ts";
import { HttpError, json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public agency profile: official licence row, confidence score, verified reviews, live offers. */
export const GET = handle(async (req, { params }: { params: Promise<{ rl: string }> }) => {
  await limit(req, "agency-view", 240);
  const view = await agencyView(decodeURIComponent((await params).rl));
  if (!view.registry) throw new HttpError(404, "This RL number is not on the official licence list");
  const user = await currentUser(req);
  let mine: { placement: { id: string; status: string } | null; reviewed: boolean } | null = null;
  const db = await getDb();
  if (user && db && view.profile) {
    const [p] = await db.query<{ id: string; status: string }>("SELECT id, status FROM placements WHERE agency_id = $1 AND worker_id = $2", [view.profile.id, user.id]);
    const [r] = await db.query<{ id: string }>("SELECT id FROM reviews WHERE agency_id = $1 AND worker_id = $2", [view.profile.id, user.id]);
    mine = { placement: p ?? null, reviewed: !!r };
  }
  const { agency: _internal, ...pub } = view;
  return json({ ...pub, mine });
});
