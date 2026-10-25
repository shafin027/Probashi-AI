// Issue reports ("cases"). A worker reports a problem; it is forwarded to our legal-aid
// team. Premium members get a caseworker and follow-up. Emergencies (abuse, trafficking,
// detention, passport held abroad) are forwarded for everyone: safety is never paywalled.
// Every case also gets the official free channels, because we help alongside them, not instead.

import { randomBytes } from "node:crypto";
import { getDb } from "./db.ts";
import { HttpError } from "./security.ts";
import { isPremium, type User } from "./auth.ts";
import { scrubPersonalData } from "./marketplace.ts";

export { CATEGORIES, EMERGENCY, STATUSES, referralPack, type Category, type CaseStatus } from "./case-meta.ts";
import { CATEGORIES, EMERGENCY, referralPack, type Category, type CaseStatus } from "./case-meta.ts";

export type CaseInput = {
  category: Category;
  description: string;
  agencyId: string | null;
  agencyText: string;
  amountLostBdt: number | null;
  whereNow: "bangladesh" | "abroad";
  countryCode: string;
  urgent: boolean;
  consentContact: boolean;
};

export type CaseRow = {
  id: string;
  ref: string;
  user_id: string;
  agency_id: string | null;
  agency_text: string;
  category: Category;
  description: string;
  amount_lost_bdt: number | null;
  where_now: "bangladesh" | "abroad";
  country_code: string;
  urgent: boolean;
  tier: "legal_aid" | "self_help";
  status: CaseStatus;
  assigned_to: string | null;
  substantiated: boolean;
  consent_contact: boolean;
  created_at: string;
  updated_at: string;
};

export type CaseEvent = { id: string; actor_role: string; kind: string; body: string; internal: boolean; created_at: string };

const CASE_COLS = "c.id, c.ref, c.user_id, c.agency_id, c.agency_text, c.category, c.description, c.amount_lost_bdt, c.where_now, c.country_code, c.urgent, c.tier, c.status, c.assigned_to, c.substantiated, c.consent_contact, c.created_at, c.updated_at";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new HttpError(503, "Reports need the database, which is not available right now");
  return db;
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newRef(): string {
  const d = new Date();
  const rand = [...randomBytes(5)].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
  return `PA-${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}-${rand}`;
}

/** Who gets a caseworker: premium members, and everyone with an emergency. */
export function tierFor(user: Pick<User, "premium_until" | "role">, category: Category, urgent: boolean): CaseRow["tier"] {
  return isPremium(user) || EMERGENCY.includes(category) || urgent ? "legal_aid" : "self_help";
}

export async function createCase(user: User, input: CaseInput): Promise<CaseRow> {
  const db = await requireDb();
  const [{ n }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM cases WHERE user_id = $1 AND created_at > now() - interval '1 day'", [user.id]);
  if (n >= 5) throw new HttpError(429, "You have filed several reports today. Our team will contact you; for emergencies call 999.");
  const description = scrubPersonalData(input.description).slice(0, 4000);
  if (description.length < 20) throw new HttpError(400, "Please describe what happened in a few sentences");
  const urgent = input.urgent || EMERGENCY.includes(input.category);
  const tier = tierFor(user, input.category, urgent);
  const rows = await db.query<CaseRow>(
    `INSERT INTO cases AS c (ref, user_id, agency_id, agency_text, category, description, amount_lost_bdt, where_now, country_code, urgent, tier, status, consent_contact)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING ${CASE_COLS}`,
    [newRef(), user.id, input.agencyId, input.agencyText.replace(/[<>]/g, "").slice(0, 200), input.category, description, input.amountLostBdt, input.whereNow, input.countryCode, urgent, tier, tier === "legal_aid" ? "new" : "self_help", input.consentContact],
  );
  const c = rows[0];
  await addEvent(c.id, user, "worker", "created", tier === "legal_aid" ? "Report filed and forwarded to the legal-aid team." : "Report filed. Official free channels shared; upgrade to forward it to a caseworker.", false);
  return c;
}

async function addEvent(caseId: string, actor: User | null, role: string, kind: string, body: string, internal: boolean): Promise<void> {
  const db = await requireDb();
  await db.query("INSERT INTO case_events (case_id, actor_id, actor_role, kind, body, internal) VALUES ($1, $2, $3, $4, $5, $6)", [caseId, actor?.id ?? null, role, kind, body.slice(0, 4000), internal]);
  await db.query("UPDATE cases SET updated_at = now() WHERE id = $1", [caseId]);
}

export async function myCases(user: User): Promise<CaseRow[]> {
  const db = await requireDb();
  return db.query<CaseRow>(`SELECT ${CASE_COLS} FROM cases c WHERE c.user_id = $1 ORDER BY c.created_at DESC LIMIT 50`, [user.id]);
}

const isStaff = (u: User) => u.role === "legal" || u.role === "admin";

/** A case and its timeline. Workers see only their own cases and never internal notes. */
export async function getCase(user: User, ref: string): Promise<{ case: CaseRow; events: CaseEvent[]; referrals: ReturnType<typeof referralPack>; reporter?: { name: string; phone: string } }> {
  const db = await requireDb();
  const rows = await db.query<CaseRow>(`SELECT ${CASE_COLS} FROM cases c WHERE c.ref = $1`, [ref]);
  const c = rows[0];
  if (!c || (!isStaff(user) && c.user_id !== user.id)) throw new HttpError(404, "Case not found");
  const events = await db.query<CaseEvent>(
    `SELECT id, actor_role, kind, body, internal, created_at FROM case_events WHERE case_id = $1 ${isStaff(user) ? "" : "AND NOT internal"} ORDER BY created_at`,
    [c.id],
  );
  let reporter: { name: string; phone: string } | undefined;
  if (isStaff(user) && c.consent_contact) {
    const [u] = await db.query<{ name: string; phone: string }>("SELECT name, phone FROM users WHERE id = $1", [c.user_id]);
    reporter = u;
  }
  return { case: c, events, referrals: referralPack(c.category, c.where_now), reporter };
}

export async function workerMessage(user: User, ref: string, body: string): Promise<void> {
  const { case: c } = await getCase(user, ref);
  if (c.user_id !== user.id) throw new HttpError(403, "Only the reporter can add messages here");
  if (["closed"].includes(c.status)) throw new HttpError(409, "This case is closed");
  const text = scrubPersonalData(body);
  if (text.length < 2) throw new HttpError(400, "Message is empty");
  await addEvent(c.id, user, "worker", "message", text, false);
}

/** After a member upgrades, forward their self-help cases to the legal-aid queue. */
export async function forwardSelfHelpCases(user: User): Promise<number> {
  const db = await requireDb();
  const rows = await db.query<{ id: string }>("UPDATE cases SET tier = 'legal_aid', status = 'new', updated_at = now() WHERE user_id = $1 AND status = 'self_help' RETURNING id", [user.id]);
  for (const r of rows) await addEvent(r.id, user, "system", "forwarded", "Forwarded to the legal-aid team after upgrading to Premium.", false);
  return rows.length;
}

// ---------------------------------------------------------------- staff

export async function caseQueue(filter: { status?: CaseStatus; mine?: boolean }, staff: User) {
  const db = await requireDb();
  const where: string[] = ["c.tier = 'legal_aid'"];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    where.push(`c.status = $${params.length}`);
  } else where.push("c.status NOT IN ('resolved', 'closed')");
  if (filter.mine) {
    params.push(staff.id);
    where.push(`c.assigned_to = $${params.length}`);
  }
  return db.query<CaseRow & { assignee: string | null; agency_name: string | null }>(
    `SELECT ${CASE_COLS}, s.name AS assignee, a.name AS agency_name FROM cases c
     LEFT JOIN users s ON s.id = c.assigned_to LEFT JOIN agencies a ON a.id = c.agency_id
     WHERE ${where.join(" AND ")} ORDER BY c.urgent DESC, c.created_at ASC LIMIT 200`,
    params,
  );
}

export type StaffUpdate = { status?: CaseStatus; assignToMe?: boolean; substantiated?: boolean; message?: string; note?: string };

export async function staffUpdate(staff: User, ref: string, u: StaffUpdate): Promise<void> {
  if (!isStaff(staff)) throw new HttpError(403, "Staff only");
  const db = await requireDb();
  const { case: c } = await getCase(staff, ref);
  if (u.assignToMe) {
    await db.query("UPDATE cases SET assigned_to = $1, status = CASE WHEN status = 'new' THEN 'triaged' ELSE status END WHERE id = $2", [staff.id, c.id]);
    await addEvent(c.id, staff, staff.role, "assigned", `Caseworker ${staff.name} is handling this case.`, false);
  }
  if (u.status && u.status !== c.status) {
    if (u.status === "self_help") throw new HttpError(400, "Invalid status");
    await db.query("UPDATE cases SET status = $1 WHERE id = $2", [u.status, c.id]);
    await addEvent(c.id, staff, staff.role, "status", `Status: ${u.status}`, false);
  }
  if (u.substantiated !== undefined && u.substantiated !== c.substantiated) {
    if (u.substantiated && !c.agency_id) throw new HttpError(400, "Link the case to an agency before marking it substantiated");
    await db.query("UPDATE cases SET substantiated = $1 WHERE id = $2", [u.substantiated, c.id]);
    await addEvent(c.id, staff, staff.role, "substantiated", u.substantiated ? "Complaint substantiated against the agency (counts in its public score)." : "Substantiation removed.", true);
  }
  if (u.message?.trim()) await addEvent(c.id, staff, staff.role, "message", u.message.trim(), false);
  if (u.note?.trim()) await addEvent(c.id, staff, staff.role, "note", u.note.trim(), true);
}

export async function caseSummaryForUser(userId: string): Promise<string> {
  const db = await getDb();
  if (!db) return "";
  const rows = await db.query<{ ref: string; category: Category; status: string; updated_at: string }>(
    "SELECT ref, category, status, updated_at FROM cases WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5",
    [userId],
  );
  return rows.map((r) => `${r.ref}: ${CATEGORIES[r.category]?.en ?? r.category}, status ${r.status}, updated ${String(r.updated_at).slice(0, 10)}`).join("\n");
}
