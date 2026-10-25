// Agencies on the platform: registration (verified against the official licence list),
// offers (every offer is run through the same rule engine workers use), placements
// (proof a worker really went through an agency) and reviews (only from placements).

import { getDb } from "./db.ts";
import { HttpError } from "./security.ts";
import { normalisePhone, type User } from "./auth.ts";
import { checkAgainstRegistry, effectiveStatus, normaliseRl, registryByRl, searchRegistry, type CheckResult, type RegistryRow } from "./registry.ts";
import { computeTrust, type Trust } from "./trust.ts";
import { analyseOffer, type Flag } from "./rules.ts";
import { findCountry } from "./data/countries.ts";
import type { Agency } from "./data/agencies.ts";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new HttpError(503, "This feature needs the database, which is not available right now");
  return db;
}

/** pending: waiting for staff (name/phone didn't match automatically) · verified · suspended (licence lapsed) · rejected */
export type AgencyStatus = "pending" | "verified" | "suspended" | "rejected";

export type AgencyRecord = {
  id: string;
  owner_user_id: string;
  rl_number: string;
  name: string;
  contact_phone: string;
  address: string;
  status: AgencyStatus;
  check_result: CheckResult & { phoneMatches?: boolean };
  checked_at: string;
  verified_at: string | null;
  created_at: string;
};

const AGENCY_COLS = "id, owner_user_id, rl_number, name, contact_phone, address, status, check_result, checked_at, verified_at, created_at";

/** Personal data never belongs in a public review: phone numbers, emails, passport/NID-like numbers. */
export function scrubPersonalData(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email removed]")
    .replace(/(\+?88)?0?1[3-9][\d\s-]{8,10}/g, "[number removed]")
    .replace(/\b[A-Z]{1,2}\d{6,8}\b/g, "[ID removed]")
    .replace(/\b\d{10,17}\b/g, "[number removed]")
    .replace(/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
}

// ---------------------------------------------------------------- registration

export type RegisterAgencyInput = { rl: string; name: string; contactPhone: string; address: string };

/**
 * Registers the logged-in agency account against an RL number.
 * Automatic verification needs all three: licence active on the official list, name matches,
 * and the account's phone is the phone the official list has for that agency (proof of control,
 * so nobody can claim a real agency just by knowing its RL number). Otherwise staff review it
 * by calling the official number.
 */
export async function registerAgency(user: User, input: RegisterAgencyInput): Promise<AgencyRecord> {
  if (user.role !== "agency") throw new HttpError(403, "Create an agency account to register an agency");
  const db = await requireDb();
  const rl = normaliseRl(input.rl);
  if (!rl) throw new HttpError(400, "Enter the RL (licence) number, e.g. RL-1234");
  const name = input.name.replace(/[<>\u0000-\u001F]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (name.length < 3) throw new HttpError(400, "Enter the agency's registered name");
  const contactPhone = normalisePhone(input.contactPhone);
  if (!contactPhone) throw new HttpError(400, "Enter a valid contact mobile number");

  const existing = await db.query<{ owner_user_id: string }>("SELECT owner_user_id FROM agencies WHERE rl_number = $1 OR owner_user_id = $2", [rl, user.id]);
  if (existing.some((e) => e.owner_user_id === user.id)) throw new HttpError(409, "This account has already registered an agency");
  if (existing.length) throw new HttpError(409, "This RL number is already registered. If it is your agency, contact our team.");

  const check = await checkAgainstRegistry(rl, name);
  if (check.outcome === "not_found") throw new HttpError(422, `${rl} is not on the official BMET licence list. Only licensed agencies can register.`);
  if (check.outcome === "inactive") throw new HttpError(422, `${rl}'s licence is ${check.licenceStatus} on the official list. Only agencies with an active licence can register.`);

  const official = await registryByRl(rl);
  const officialPhone = official?.phone ? normalisePhone(official.phone) : null;
  const phoneMatches = !!officialPhone && (officialPhone === user.phone || officialPhone === contactPhone) && contactPhone === user.phone;
  const status: AgencyStatus = check.outcome === "verified" && phoneMatches ? "verified" : "pending";

  const rows = await db.query<AgencyRecord>(
    `INSERT INTO agencies (owner_user_id, rl_number, name, contact_phone, address, status, check_result, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING RETURNING ${AGENCY_COLS}`,
    [user.id, rl, check.registryName ?? name, contactPhone, input.address.replace(/[<>]/g, "").trim().slice(0, 300), status, JSON.stringify({ ...check, phoneMatches }), status === "verified" ? new Date() : null],
  );
  if (!rows[0]) throw new HttpError(409, "This RL number is already registered");
  return rows[0];
}

export async function agencyForOwner(userId: string): Promise<AgencyRecord | null> {
  const db = await requireDb();
  const rows = await db.query<AgencyRecord>(`SELECT ${AGENCY_COLS} FROM agencies WHERE owner_user_id = $1`, [userId]);
  return rows[0] ?? null;
}

export async function agencyById(id: string): Promise<AgencyRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await requireDb();
  const rows = await db.query<AgencyRecord>(`SELECT ${AGENCY_COLS} FROM agencies WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Staff decision on a pending agency (after calling the official number on the licence list). */
export async function reviewAgency(id: string, decision: "verified" | "rejected"): Promise<void> {
  const db = await requireDb();
  const a = await agencyById(id);
  if (!a) throw new HttpError(404, "Agency not found");
  if (decision === "verified") {
    const fresh = await checkAgainstRegistry(a.rl_number, a.name);
    if (fresh.outcome === "inactive" || fresh.outcome === "not_found") throw new HttpError(422, "The licence is not active on the official list; it can't be verified");
  }
  await db.query("UPDATE agencies SET status = $1, verified_at = CASE WHEN $1 = 'verified' THEN now() ELSE verified_at END WHERE id = $2", [decision, id]);
  if (decision === "rejected") await db.query("UPDATE offers SET status = 'paused' WHERE agency_id = $1 AND status = 'live'", [id]);
}

/**
 * Re-checks every registered agency against the current official list (run daily by cron).
 * A lapsed, suspended or cancelled licence suspends the agency and pauses its offers at once.
 */
export async function reverifyAll(): Promise<{ checked: number; suspended: number; restored: number }> {
  const db = await requireDb();
  const all = await db.query<AgencyRecord>(`SELECT ${AGENCY_COLS} FROM agencies WHERE status IN ('verified', 'suspended')`);
  let suspended = 0;
  let restored = 0;
  for (const a of all) {
    const check = await checkAgainstRegistry(a.rl_number, a.name);
    if (check.outcome === "registry_unavailable") break; // never suspend everyone because an import failed
    const ok = check.outcome === "verified";
    if (!ok && a.status === "verified") {
      suspended++;
      await db.query("UPDATE agencies SET status = 'suspended', check_result = $2, checked_at = now() WHERE id = $1", [a.id, JSON.stringify(check)]);
      await db.query("UPDATE offers SET status = 'paused' WHERE agency_id = $1 AND status = 'live'", [a.id]);
    } else if (ok && a.status === "suspended" && a.verified_at) {
      restored++;
      await db.query("UPDATE agencies SET status = 'verified', check_result = $2, checked_at = now() WHERE id = $1", [a.id, JSON.stringify(check)]);
    } else {
      await db.query("UPDATE agencies SET checked_at = now() WHERE id = $1", [a.id]);
    }
  }
  await db.query("UPDATE offers SET status = 'expired' WHERE status = 'live' AND expires_at < now()");
  return { checked: all.length, suspended, restored };
}

// ---------------------------------------------------------------- offers

export type OfferInputData = {
  countryCode: string;
  jobTitle: string;
  employer: string;
  salaryLocal: number;
  totalCostBdt: number;
  contractMonths: number;
  seats: number;
  details: string;
};

export type OfferCheck = { allowed: boolean; reasons: { bn: string; en: string }[]; flags: Flag[]; score: number; officialCostBdt: number | null };

/** Pure: may this offer be published? Same rule engine as /check, plus marketplace rules. */
export function checkAgencyOffer(o: OfferInputData, agency: Agency): OfferCheck {
  const country = findCountry(o.countryCode);
  const reasons: OfferCheck["reasons"] = [];
  if (!country) reasons.push({ bn: "এই দেশ সমর্থিত নয়", en: "Unsupported destination" });
  const rules = analyseOffer({
    countryCode: o.countryCode,
    jobTitle: o.jobTitle,
    salaryLocal: o.salaryLocal,
    askedCostBdt: o.totalCostBdt,
    agencyQuery: agency.rl,
    resolvedAgency: agency,
    visaType: "work",
    paidTo: "agency",
    receipt: true,
    bmetClearance: true,
    foundVia: "agency",
    passportHandedOver: false,
    offerText: `${o.details} ${o.employer}`,
  });
  const official = country?.officialCostBdt ?? null;
  if (official && o.totalCostBdt > official) {
    reasons.push({ bn: `মোট খরচ সরকার নির্ধারিত সীমা ৳${official.toLocaleString("en-IN")} এর বেশি`, en: `Total cost is above the government ceiling of Tk ${official.toLocaleString("en-IN")}` });
  }
  if (country?.minWageLocal && o.salaryLocal < country.minWageLocal) {
    reasons.push({ bn: "বেতন ন্যূনতম মজুরির কম", en: `Salary is below the ${country.currency} ${country.minWageLocal} minimum wage` });
  }
  for (const f of rules.flags.filter((f) => f.severity === "high" && f.id !== "overcharge")) reasons.push({ bn: f.titleBn, en: f.title });
  if (!o.employer.trim()) reasons.push({ bn: "নিয়োগকর্তার নাম দিন", en: "Employer name is required" });
  return { allowed: reasons.length === 0, reasons, flags: rules.flags, score: rules.score, officialCostBdt: official };
}

export type OfferRow = {
  id: string;
  agency_id: string;
  country_code: string;
  job_title: string;
  employer: string;
  salary_local: number;
  total_cost_bdt: number;
  contract_months: number;
  seats: number;
  details: string;
  status: "live" | "blocked" | "paused" | "withdrawn" | "expired";
  check_result: OfferCheck;
  created_at: string;
  expires_at: string;
};

const OFFER_COLS = "o.id, o.agency_id, o.country_code, o.job_title, o.employer, o.salary_local, o.total_cost_bdt, o.contract_months, o.seats, o.details, o.status, o.check_result, o.created_at, o.expires_at";

export async function createOffer(user: User, data: OfferInputData): Promise<OfferRow> {
  const db = await requireDb();
  const agency = await agencyForOwner(user.id);
  if (!agency) throw new HttpError(403, "Register your agency first");
  if (agency.status !== "verified") throw new HttpError(403, "Only verified agencies can publish offers");
  const [{ n }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM offers WHERE agency_id = $1 AND created_at > now() - interval '1 day'", [agency.id]);
  if (n >= 20) throw new HttpError(429, "Daily offer limit reached");
  const view = await agencyView(agency.rl_number);
  if (!view.agency || view.agency.licenceStatus !== "valid") throw new HttpError(403, "Your licence is not active on the official list");
  const check = checkAgencyOffer(data, view.agency);
  const clean = (s: string, max: number) => s.replace(/[<>\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const rows = await db.query<OfferRow>(
    `INSERT INTO offers AS o (agency_id, country_code, job_title, employer, salary_local, total_cost_bdt, contract_months, seats, details, status, check_result, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now() + interval '60 days') RETURNING ${OFFER_COLS}`,
    [agency.id, data.countryCode, clean(data.jobTitle, 80), clean(data.employer, 120), data.salaryLocal, data.totalCostBdt, data.contractMonths, data.seats, clean(data.details, 1000), check.allowed ? "live" : "blocked", JSON.stringify(check)],
  );
  return rows[0];
}

export async function withdrawOffer(user: User, offerId: string): Promise<void> {
  const db = await requireDb();
  const agency = await agencyForOwner(user.id);
  if (!agency) throw new HttpError(403, "Register your agency first");
  await db.query("UPDATE offers SET status = 'withdrawn' WHERE id = $1 AND agency_id = $2 AND status IN ('live', 'paused', 'blocked')", [offerId, agency.id]);
}

export async function offersForAgency(agencyId: string, onlyLive: boolean): Promise<OfferRow[]> {
  const db = await requireDb();
  return db.query<OfferRow>(`SELECT ${OFFER_COLS} FROM offers o WHERE o.agency_id = $1 ${onlyLive ? "AND o.status = 'live' AND o.expires_at > now()" : ""} ORDER BY o.created_at DESC LIMIT 50`, [agencyId]);
}

export type PublicOffer = Omit<OfferRow, "check_result" | "status"> & { agency: { id: string; name: string; rl: string; trust: Trust } };

/** Live offers from verified agencies only, newest first. */
export async function liveOffers(countryCode?: string): Promise<PublicOffer[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.query<OfferRow & { agency_name: string; rl_number: string }>(
    `SELECT ${OFFER_COLS}, a.name AS agency_name, a.rl_number FROM offers o JOIN agencies a ON a.id = o.agency_id
     WHERE o.status = 'live' AND o.expires_at > now() AND a.status = 'verified' ${countryCode ? "AND o.country_code = $1" : ""}
     ORDER BY o.created_at DESC LIMIT 60`,
    countryCode ? [countryCode] : [],
  );
  const trustCache = new Map<string, Trust>();
  const out: PublicOffer[] = [];
  for (const r of rows) {
    if (!trustCache.has(r.rl_number)) trustCache.set(r.rl_number, (await agencyView(r.rl_number)).trust);
    const { check_result: _c, status: _s, agency_name, rl_number, ...offer } = r;
    out.push({ ...offer, agency: { id: r.agency_id, name: agency_name, rl: rl_number, trust: trustCache.get(rl_number)! } });
  }
  return out;
}

// ---------------------------------------------------------------- placements and reviews

export async function claimPlacement(user: User, agencyId: string, countryCode: string, year: number, evidence: string): Promise<{ id: string; status: string }> {
  if (user.role !== "worker") throw new HttpError(403, "Only worker accounts can add a placement");
  const db = await requireDb();
  const agency = await agencyById(agencyId);
  if (!agency) throw new HttpError(404, "Agency not found");
  if (agency.owner_user_id === user.id) throw new HttpError(403, "You can't review your own agency");
  const rows = await db.query<{ id: string; status: string }>(
    `INSERT INTO placements (agency_id, worker_id, country_code, year, evidence) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (agency_id, worker_id) DO UPDATE SET evidence = EXCLUDED.evidence WHERE placements.status <> 'rejected'
     RETURNING id, status`,
    [agencyId, user.id, countryCode, year, scrubPersonalData(evidence).slice(0, 300)],
  );
  if (!rows[0]) throw new HttpError(409, "This placement was rejected by our team. Contact support if this is a mistake.");
  return rows[0];
}

/**
 * Agency confirms or disputes a worker's placement. It cannot reject: a disputed claim
 * goes to staff, so an agency can't silence bad reviews by denying everyone.
 */
export async function agencyRespondPlacement(user: User, placementId: string, action: "confirm" | "dispute"): Promise<void> {
  const db = await requireDb();
  const agency = await agencyForOwner(user.id);
  if (!agency) throw new HttpError(403, "Register your agency first");
  const res = await db.query<{ id: string }>(
    `UPDATE placements SET status = $1, confirmed_by = CASE WHEN $1 = 'confirmed' THEN 'agency' ELSE confirmed_by END
     WHERE id = $2 AND agency_id = $3 AND status = 'pending' RETURNING id`,
    [action === "confirm" ? "confirmed" : "disputed", placementId, agency.id],
  );
  if (!res[0]) throw new HttpError(404, "Placement not found or already decided");
}

export async function staffDecidePlacement(placementId: string, decision: "confirmed" | "rejected"): Promise<void> {
  const db = await requireDb();
  const res = await db.query<{ id: string }>("UPDATE placements SET status = $1, confirmed_by = 'staff' WHERE id = $2 RETURNING id", [decision, placementId]);
  if (!res[0]) throw new HttpError(404, "Placement not found");
}

export type ReviewInput = { agencyId: string; rating: number; promiseKept: boolean; costPaidBdt: number | null; body: string };

export async function writeReview(user: User, r: ReviewInput): Promise<{ id: string; visible: boolean }> {
  const db = await requireDb();
  const placement = await db.query<{ id: string; status: string }>("SELECT id, status FROM placements WHERE agency_id = $1 AND worker_id = $2", [r.agencyId, user.id]);
  const p = placement[0];
  if (!p || p.status === "rejected") throw new HttpError(403, "Add your placement with this agency first. Only workers who went through an agency can review it.");
  const body = scrubPersonalData(r.body).slice(0, 1500);
  if (body.length < 20) throw new HttpError(400, "Please write at least a sentence about your experience");
  const rows = await db.query<{ id: string }>(
    `INSERT INTO reviews (agency_id, worker_id, placement_id, rating, promise_kept, cost_paid_bdt, body) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (agency_id, worker_id) DO UPDATE SET rating = EXCLUDED.rating, promise_kept = EXCLUDED.promise_kept,
       cost_paid_bdt = EXCLUDED.cost_paid_bdt, body = EXCLUDED.body, created_at = now()
     RETURNING id`,
    [r.agencyId, user.id, p.id, r.rating, r.promiseKept, r.costPaidBdt, body],
  );
  return { id: rows[0].id, visible: p.status === "confirmed" };
}

export async function replyToReview(user: User, reviewId: string, reply: string): Promise<void> {
  const db = await requireDb();
  const agency = await agencyForOwner(user.id);
  if (!agency || agency.status !== "verified") throw new HttpError(403, "Only the verified agency can reply");
  const text = scrubPersonalData(reply).slice(0, 800);
  if (text.length < 5) throw new HttpError(400, "Reply is too short");
  const res = await db.query<{ id: string }>("UPDATE reviews SET agency_reply = $1 WHERE id = $2 AND agency_id = $3 AND agency_reply IS NULL RETURNING id", [text, reviewId, agency.id]);
  if (!res[0]) throw new HttpError(404, "Review not found or already answered");
}

export async function setReviewStatus(reviewId: string, status: "published" | "hidden"): Promise<void> {
  const db = await requireDb();
  await db.query("UPDATE reviews SET status = $1 WHERE id = $2", [status, reviewId]);
}

export type PublicReview = { id: string; rating: number; promise_kept: boolean; cost_paid_bdt: number | null; body: string; agency_reply: string | null; created_at: string; worker: string; country_code: string; year: number };

async function publicReviews(agencyId: string): Promise<PublicReview[]> {
  const db = await requireDb();
  return db.query<PublicReview>(
    `SELECT r.id, r.rating, r.promise_kept, r.cost_paid_bdt, r.body, r.agency_reply, r.created_at, p.country_code, p.year,
            left(u.name, 1) || '.' AS worker
     FROM reviews r JOIN placements p ON p.id = r.placement_id JOIN users u ON u.id = r.worker_id
     WHERE r.agency_id = $1 AND r.status = 'published' AND p.status = 'confirmed'
     ORDER BY r.created_at DESC LIMIT 50`,
    [agencyId],
  );
}

// ---------------------------------------------------------------- public views

export type AgencyView = {
  rl: string;
  registry: RegistryRow | null;
  profile: Pick<AgencyRecord, "id" | "name" | "status" | "checked_at" | "verified_at"> | null;
  trust: Trust;
  reviews: PublicReview[];
  offers: OfferRow[];
  /** Shape the rule engine understands. */
  agency: Agency | null;
};

export async function agencyView(rlRaw: string): Promise<AgencyView> {
  const rl = normaliseRl(rlRaw);
  const registry = rl ? await registryByRl(rl) : null;
  const db = await getDb();
  const profile = db && rl ? ((await db.query<AgencyRecord>(`SELECT ${AGENCY_COLS} FROM agencies WHERE rl_number = $1`, [rl]))[0] ?? null) : null;
  const status = registry ? effectiveStatus(registry) : null;
  let reviews: PublicReview[] = [];
  let offers: OfferRow[] = [];
  let substantiated = 0;
  let blocked = 0;
  let placements = 0;
  if (db && profile) {
    reviews = await publicReviews(profile.id);
    offers = profile.status === "verified" ? await offersForAgency(profile.id, true) : [];
    [{ substantiated, blocked, placements }] = await db.query<{ substantiated: number; blocked: number; placements: number }>(
      `SELECT (SELECT count(*)::int FROM cases WHERE agency_id = $1 AND substantiated) AS substantiated,
              (SELECT count(*)::int FROM offers WHERE agency_id = $1 AND status = 'blocked') AS blocked,
              (SELECT count(*)::int FROM placements WHERE agency_id = $1 AND status = 'confirmed' AND created_at > now() - interval '1 year') AS placements`,
      [profile.id],
    );
  }
  const trust = computeTrust({
    licenceStatus: status,
    validUntil: registry?.valid_until ?? null,
    platformVerified: profile?.status === "verified",
    reviews: reviews.map((r) => ({ rating: r.rating, promiseKept: r.promise_kept })),
    substantiatedCases: substantiated,
    blockedOffers: blocked,
  });
  const licence = { active: "valid", suspended: "suspended", cancelled: "cancelled", expired: "expired" } as const;
  const agency: Agency | null = registry
    ? {
        rl,
        name: registry.name,
        district: registry.address,
        licenceStatus: licence[status!],
        verifiedComplaints: substantiated,
        placementsLastYear: placements,
        sponsored: false,
        validUntil: registry.valid_until,
        profileId: profile?.status === "verified" ? profile.id : null,
        trust: { score: trust.score, level: trust.level, labelBn: trust.labelBn, labelEn: trust.labelEn, reviewCount: trust.reviewCount, averageRating: trust.averageRating },
      }
    : null;
  return {
    rl,
    registry,
    profile: profile ? { id: profile.id, name: profile.name, status: profile.status, checked_at: profile.checked_at, verified_at: profile.verified_at } : null,
    trust,
    reviews,
    offers,
    agency,
  };
}

/** Registry-backed lookup for the rule engine: RL number or name. */
export async function resolveAgency(query: string): Promise<Agency | null> {
  const rows = await searchRegistry(query, 1);
  if (!rows[0]) return null;
  return (await agencyView(rows[0].rl_number)).agency;
}

export async function searchAgencies(query: string): Promise<AgencyView[]> {
  const rows = await searchRegistry(query, 8);
  const out: AgencyView[] = [];
  for (const r of rows) out.push(await agencyView(r.rl_number));
  return out;
}

// ---------------------------------------------------------------- agency dashboard

export async function agencyDashboard(user: User) {
  const db = await requireDb();
  const agency = await agencyForOwner(user.id);
  if (!agency) return { agency: null };
  const [offers, placements, reviews] = await Promise.all([
    offersForAgency(agency.id, false),
    db.query<{ id: string; country_code: string; year: number; evidence: string; status: string; created_at: string; worker: string }>(
      `SELECT p.id, p.country_code, p.year, p.evidence, p.status, p.created_at, u.name AS worker FROM placements p JOIN users u ON u.id = p.worker_id
       WHERE p.agency_id = $1 ORDER BY p.created_at DESC LIMIT 100`,
      [agency.id],
    ),
    publicReviews(agency.id),
  ]);
  const view = await agencyView(agency.rl_number);
  return { agency, offers, placements, reviews, trust: view.trust };
}
