import { getDb } from "@/lib/db.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Real usage counters for social proof. Returns null values when there is no database. */
export async function GET() {
  const db = await getDb();
  if (!db) return json({ offersChecked: null, dangersFlagged: null });
  try {
    const rows = await db.query<{ key: string; value: string | number }>("SELECT key, value FROM stats WHERE key IN ('offers_checked', 'dangers_flagged')");
    const get = (k: string) => Number(rows.find((r) => r.key === k)?.value ?? 0);
    return json({ offersChecked: get("offers_checked"), dangersFlagged: get("dangers_flagged") }, 200, { "Cache-Control": "public, max-age=60" });
  } catch {
    return json({ offersChecked: null, dangersFlagged: null });
  }
}
