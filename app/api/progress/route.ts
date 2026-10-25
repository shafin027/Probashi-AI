import { currentUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db.ts";
import { EMPTY_PROGRESS, mergeProgress, sanitiseProgress, type Progress } from "@/lib/journey.ts";
import { assertSameOrigin, errorResponse, HttpError, json, readJson } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function load(userId: string): Promise<Progress> {
  const db = await getDb();
  if (!db) return EMPTY_PROGRESS;
  const rows = await db.query<{ data: unknown }>("SELECT data FROM progress WHERE user_id = $1", [userId]);
  return rows[0] ? sanitiseProgress(rows[0].data) : EMPTY_PROGRESS;
}

export async function GET(req: Request) {
  try {
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, "Please log in");
    return json({ progress: await load(user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Merges the browser's progress into the account (union; never removes milestones). */
export async function PUT(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, "Please log in");
    const db = await getDb();
    if (!db) throw new HttpError(503, "Accounts are not available right now");
    const incoming = sanitiseProgress((await readJson(req, 4096)) as unknown);
    const merged = mergeProgress(await load(user.id), { ...incoming, updatedAt: Date.now() });
    await db.query(
      "INSERT INTO progress (user_id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = now()",
      [user.id, JSON.stringify(merged)],
    );
    return json({ progress: merged });
  } catch (err) {
    return errorResponse(err);
  }
}
