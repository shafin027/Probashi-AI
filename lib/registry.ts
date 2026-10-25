// The official recruiting-agency licence list. Source of truth: BMET's RAIMS public list
// (raims.oep.gov.bd/agencies), which gives every licensed agency's RL number, name,
// address, licence status and validity date. We import it as CSV (scripts/import-registry.mjs
// or the admin endpoint) and verify every agency that registers here against it.
// Agencies cannot edit registry rows; a lapsed or cancelled licence hides their offers.

import { getDb } from "./db.ts";
import { HttpError } from "./security.ts";
import { DEMO_AGENCIES } from "./data/agencies.ts";

export type LicenceStatus = "active" | "suspended" | "cancelled" | "expired";

export type RegistryRow = {
  rl_number: string;
  name: string;
  status: LicenceStatus;
  valid_until: string | null;
  address: string;
  phone: string;
  source: string;
  imported_at: string;
};

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

/** "RL 1234", "rl-01234", "আরএল-১২৩৪" all become "RL-1234". */
export function normaliseRl(input: string): string {
  const digits = toAscii(input).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits && digits.length <= 6 ? `RL-${digits}` : "";
}

const STOP = new Set(["ltd", "limited", "pvt", "private", "co", "company", "and", "the", "bd", "bangladesh", "demo"]);

/** Lower-case, punctuation-free, legal suffixes removed: "M/S. Shapla Overseas Ltd." -> "shapla overseas". */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bm\s*\/\s*s\b\.?/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .join(" ");
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) m.set(t.slice(i, i + 2), (m.get(t.slice(i, i + 2)) ?? 0) + 1);
  return m;
}

/** Dice similarity over character bigrams, 0..1. Tolerates small spelling differences. */
export function nameSimilarity(a: string, b: string): number {
  const x = normaliseName(a);
  const y = normaliseName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const A = bigrams(x);
  const B = bigrams(y);
  let overlap = 0;
  let total = 0;
  for (const [k, v] of A) {
    overlap += Math.min(v, B.get(k) ?? 0);
    total += v;
  }
  for (const v of B.values()) total += v;
  return (2 * overlap) / total;
}

/** Effective status today: an "active" licence past its validity date counts as expired. */
export function effectiveStatus(row: Pick<RegistryRow, "status" | "valid_until">, today = new Date()): LicenceStatus {
  if (row.status !== "active") return row.status;
  if (row.valid_until && new Date(`${row.valid_until.slice(0, 10)}T23:59:59Z`) < today) return "expired";
  return "active";
}

export type VerifyOutcome = "verified" | "name_mismatch" | "not_found" | "inactive" | "registry_unavailable";

export type CheckResult = {
  outcome: VerifyOutcome;
  rl: string;
  registryName: string | null;
  similarity: number | null;
  licenceStatus: LicenceStatus | null;
  validUntil: string | null;
  source: string | null;
  checkedAt: string;
};

export const NAME_MATCH_THRESHOLD = 0.82;

/** Pure decision: does a claimed (RL, name) pair match the official row? */
export function decide(rl: string, claimedName: string, row: RegistryRow | null, today = new Date()): CheckResult {
  const base = { rl, checkedAt: today.toISOString() };
  if (!row) return { ...base, outcome: "not_found", registryName: null, similarity: null, licenceStatus: null, validUntil: null, source: null };
  const status = effectiveStatus(row, today);
  const similarity = Math.round(nameSimilarity(claimedName, row.name) * 100) / 100;
  const common = { registryName: row.name, similarity, licenceStatus: status, validUntil: row.valid_until?.slice(0, 10) ?? null, source: row.source };
  if (status !== "active") return { ...base, ...common, outcome: "inactive" };
  if (similarity < NAME_MATCH_THRESHOLD) return { ...base, ...common, outcome: "name_mismatch" };
  return { ...base, ...common, outcome: "verified" };
}

// ---------------------------------------------------------------- CSV import

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<keyof Omit<RegistryRow, "source" | "imported_at">, RegExp> = {
  rl_number: /^(rl|rl\s*no\.?|rl\s*number|licen[cs]e\s*(no|number)?)$/i,
  name: /^(name|agency|agency\s*name|recruiting\s*agency)$/i,
  status: /^(status|licen[cs]e\s*status)$/i,
  valid_until: /^(valid\s*(until|till|upto|up\s*to)?|validity|expiry|expiry\s*date|expires)$/i,
  address: /^(address|office\s*address)$/i,
  phone: /^(phone|mobile|contact|telephone)$/i,
};

function parseStatus(s: string): LicenceStatus | null {
  const t = s.trim().toLowerCase();
  if (/^(active|valid|running)$/.test(t)) return "active";
  if (/suspend/.test(t)) return "suspended";
  if (/cancel|revok/.test(t)) return "cancelled";
  if (/expir|inactive/.test(t)) return "expired";
  return null;
}

function parseDate(s: string): string | null {
  const t = toAscii(s.trim());
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t); // dd/mm/yyyy (Bangladesh convention)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  m = /^(\d{1,2})\s+([a-z]{3})[a-z]*\s+(\d{4})$/i.exec(t);
  if (m && months.includes(m[2].toLowerCase())) return `${m[3]}-${String(months.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export type ImportReport = { imported: number; skipped: { line: number; reason: string }[] };

export function rowsFromCsv(text: string): { rows: Omit<RegistryRow, "source" | "imported_at">[]; report: ImportReport } {
  const table = parseCsv(text.replace(/^﻿/, ""));
  const report: ImportReport = { imported: 0, skipped: [] };
  if (table.length < 2) return { rows: [], report: { imported: 0, skipped: [{ line: 1, reason: "No data rows" }] } };
  const header = table[0].map((h) => h.trim());
  const col = {} as Record<keyof typeof HEADER_ALIASES, number>;
  for (const key of Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]) col[key] = header.findIndex((h) => HEADER_ALIASES[key].test(h));
  if (col.rl_number < 0 || col.name < 0 || col.status < 0) {
    return { rows: [], report: { imported: 0, skipped: [{ line: 1, reason: "Header must include RL number, name and status columns" }] } };
  }
  const seen = new Set<string>();
  const rows: Omit<RegistryRow, "source" | "imported_at">[] = [];
  table.slice(1).forEach((r, i) => {
    const line = i + 2;
    const rl = normaliseRl(r[col.rl_number] ?? "");
    const name = (r[col.name] ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
    const status = parseStatus(r[col.status] ?? "");
    if (!rl) return report.skipped.push({ line, reason: "Invalid RL number" });
    if (!name) return report.skipped.push({ line, reason: "Missing name" });
    if (!status) return report.skipped.push({ line, reason: "Unknown status" });
    if (seen.has(rl)) return report.skipped.push({ line, reason: `Duplicate ${rl}` });
    seen.add(rl);
    const cell = (k: keyof typeof col, max: number) => (col[k] >= 0 ? (r[col[k]] ?? "").replace(/\s+/g, " ").trim().slice(0, max) : "");
    rows.push({ rl_number: rl, name, status, valid_until: col.valid_until >= 0 ? parseDate(r[col.valid_until] ?? "") : null, address: cell("address", 300), phone: cell("phone", 40) });
  });
  report.imported = rows.length;
  return { rows, report };
}

/** Replaces the registry with a fresh import (one transaction-equivalent: upsert, then drop rows not in the file). */
export async function importRegistry(text: string, source: string): Promise<ImportReport> {
  const db = await getDb();
  if (!db) throw new HttpError(503, "Database unavailable");
  const { rows, report } = rowsFromCsv(text);
  if (!rows.length) return report;
  // A truncated export (one page of the list) would otherwise delete every agency not in it.
  const [{ n: existing }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM agency_registry");
  if (existing > 20 && rows.length < existing * 0.5) {
    throw new HttpError(422, `This file has ${rows.length} agencies but the current list has ${existing}. It looks incomplete, so nothing was changed.`);
  }
  for (const r of rows) {
    await db.query(
      `INSERT INTO agency_registry (rl_number, name, name_norm, status, valid_until, address, phone, source, imported_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (rl_number) DO UPDATE SET name = EXCLUDED.name, name_norm = EXCLUDED.name_norm, status = EXCLUDED.status,
         valid_until = EXCLUDED.valid_until, address = EXCLUDED.address, phone = EXCLUDED.phone, source = EXCLUDED.source, imported_at = now()`,
      [r.rl_number, r.name, normaliseName(r.name), r.status, r.valid_until, r.address, r.phone, source.slice(0, 200)],
    );
  }
  // An agency missing from the latest official list is no longer licensed.
  await db.query("DELETE FROM agency_registry WHERE rl_number <> ALL($1::text[])", [rows.map((r) => r.rl_number)]);
  return report;
}

// ---------------------------------------------------------------- lookups

/** Fictional demo rows, used only when DEMO_REGISTRY=1 (local dev, tests, the buildathon demo). */
export function demoRegistry(): RegistryRow[] {
  const status = { valid: "active", suspended: "suspended", cancelled: "cancelled", expired: "expired" } as const;
  return DEMO_AGENCIES.map((a) => ({
    rl_number: a.rl,
    name: a.name,
    status: status[a.licenceStatus],
    valid_until: a.licenceStatus === "valid" ? "2027-12-31" : "2025-06-30",
    address: a.district,
    // One demo agency has an official phone, so instant verification can be demonstrated.
    phone: a.rl === "RL-1001" ? "01710001001" : "",
    source: "Demo data (fictional agencies)",
    imported_at: "2026-01-01T00:00:00.000Z",
  }));
}

let seeded: Promise<void> | null = null;

async function ensureDemoSeed(): Promise<void> {
  if (process.env.DEMO_REGISTRY !== "1") return;
  seeded ??= (async () => {
    const db = await getDb();
    if (!db) return;
    const [{ n }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM agency_registry");
    if (n > 0) return;
    for (const r of demoRegistry()) {
      await db.query(
        "INSERT INTO agency_registry (rl_number, name, name_norm, status, valid_until, address, phone, source) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING",
        [r.rl_number, r.name, normaliseName(r.name), r.status, r.valid_until, r.address, r.phone, r.source],
      );
    }
  })();
  return seeded;
}

const ROW_COLS = "rl_number, name, status, to_char(valid_until, 'YYYY-MM-DD') AS valid_until, address, phone, source, imported_at";

export async function registryByRl(rl: string): Promise<RegistryRow | null> {
  await ensureDemoSeed();
  const db = await getDb();
  if (!db) return null;
  const rows = await db.query<RegistryRow>(`SELECT ${ROW_COLS} FROM agency_registry WHERE rl_number = $1`, [rl]);
  return rows[0] ?? null;
}

export async function registrySize(): Promise<number> {
  await ensureDemoSeed();
  const db = await getDb();
  if (!db) return 0;
  const [{ n }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM agency_registry");
  return n;
}

/** Search by RL number or (part of) the name. */
export async function searchRegistry(query: string, limit = 8): Promise<RegistryRow[]> {
  await ensureDemoSeed();
  const db = await getDb();
  if (!db) return [];
  const rl = normaliseRl(query);
  if (rl && /^\s*(rl|আরএল)?[\s-]*[0-9০-৯]+\s*$/i.test(query)) {
    const r = await registryByRl(rl);
    return r ? [r] : [];
  }
  const q = normaliseName(query);
  if (q.length < 3) return [];
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  return db.query<RegistryRow>(`SELECT ${ROW_COLS} FROM agency_registry WHERE name_norm LIKE $1 ORDER BY name LIMIT $2`, [like, limit]);
}

export async function checkAgainstRegistry(rlRaw: string, claimedName: string): Promise<CheckResult> {
  const rl = normaliseRl(rlRaw);
  if ((await registrySize()) === 0) {
    return { outcome: "registry_unavailable", rl, registryName: null, similarity: null, licenceStatus: null, validUntil: null, source: null, checkedAt: new Date().toISOString() };
  }
  return decide(rl, claimedName, await registryByRl(rl));
}
