import { handle } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { caseQueue, STATUSES, type CaseStatus } from "@/lib/cases.ts";
import { getDb } from "@/lib/db.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Legal-aid dashboard data: case queue plus the verification and moderation queues. */
export const GET = handle(async (req) => {
  const staff = await requireUser(req, ["legal", "admin"]);
  const url = new URL(req.url);
  const s = url.searchParams.get("status");
  const status = (STATUSES as readonly string[]).includes(s ?? "") ? (s as CaseStatus) : undefined;
  const db = (await getDb())!;
  const [cases, agencies, placements, reviews] = await Promise.all([
    caseQueue({ status, mine: url.searchParams.get("mine") === "1" }, staff),
    db.query("SELECT id, rl_number, name, contact_phone, check_result, created_at FROM agencies WHERE status = 'pending' ORDER BY created_at LIMIT 100"),
    db.query(
      `SELECT p.id, p.status, p.country_code, p.year, p.evidence, p.created_at, u.name AS worker, a.name AS agency
       FROM placements p JOIN users u ON u.id = p.worker_id JOIN agencies a ON a.id = p.agency_id
       WHERE p.status IN ('pending', 'disputed') ORDER BY p.status DESC, p.created_at LIMIT 100`,
    ),
    db.query(
      `SELECT r.id, r.rating, r.body, r.status, r.created_at, a.name AS agency FROM reviews r JOIN agencies a ON a.id = r.agency_id
       ORDER BY r.created_at DESC LIMIT 50`,
    ),
  ]);
  return json({ cases, agencies, placements, reviews });
});
