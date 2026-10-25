// Database access. Production: Postgres with pgvector (Neon, Supabase, Vercel Postgres)
// via DATABASE_URL. Development/tests: embedded PGlite (Postgres in WASM, with pgvector),
// in memory or in PGLITE_DIR. All queries are parameterised; no string-built SQL.

import type { Pool } from "pg";

export const EMBED_DIM = 1536; // OpenAI text-embedding-3-small

type Querier = { query<T>(sql: string, params?: unknown[]): Promise<T[]> };

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  memory_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  content text NOT NULL,
  embedding vector(${EMBED_DIM}),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memories_user_idx ON memories(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS progress (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stats (
  key text PRIMARY KEY,
  value bigint NOT NULL DEFAULT 0
);

-- Roles: worker (default), agency, legal (legal-aid caseworker), admin.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'worker';
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_pin_hash text;

-- Official licence list (BMET RAIMS export). Imported, never edited by agencies.
CREATE TABLE IF NOT EXISTS agency_registry (
  rl_number text PRIMARY KEY,
  name text NOT NULL,
  name_norm text NOT NULL,
  status text NOT NULL,
  valid_until date,
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  source text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agency_registry_name_idx ON agency_registry(name_norm);

-- Agencies that registered on the platform (claimed an RL number).
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rl_number text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_phone text NOT NULL,
  address text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  check_result jsonb NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  job_title text NOT NULL,
  employer text NOT NULL DEFAULT '',
  salary_local integer NOT NULL,
  total_cost_bdt integer NOT NULL,
  contract_months integer NOT NULL,
  seats integer NOT NULL DEFAULT 1,
  details text NOT NULL DEFAULT '',
  status text NOT NULL,
  check_result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS offers_live_idx ON offers(status, country_code, created_at DESC);

-- A worker's claim that they migrated through an agency. Reviews count as verified only
-- when the claim is confirmed by the agency or by our staff (the agency can't reject it).
CREATE TABLE IF NOT EXISTS placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_code text NOT NULL,
  year integer NOT NULL,
  evidence text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  confirmed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, worker_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  placement_id uuid NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  promise_kept boolean NOT NULL,
  cost_paid_bdt integer,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'published',
  agency_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, worker_id)
);

-- Issue reports, forwarded to the legal-aid team.
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  agency_text text NOT NULL DEFAULT '',
  category text NOT NULL,
  description text NOT NULL,
  amount_lost_bdt integer,
  where_now text NOT NULL,
  country_code text NOT NULL DEFAULT '',
  urgent boolean NOT NULL DEFAULT false,
  tier text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  substantiated boolean NOT NULL DEFAULT false,
  consent_contact boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cases_queue_idx ON cases(status, urgent DESC, created_at);
CREATE INDEX IF NOT EXISTS cases_user_idx ON cases(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role text NOT NULL,
  kind text NOT NULL,
  body text NOT NULL,
  internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS case_events_idx ON case_events(case_id, created_at);

-- AI phone line. Caller numbers are stored hashed; transcripts are not stored.
CREATE TABLE IF NOT EXISTS calls (
  call_id text PRIMARY KEY,
  caller_hash text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  verified boolean NOT NULL DEFAULT false,
  pin_failures integer NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
`;

/** Increments a public counter (real usage numbers only; never seeded or inflated). */
export async function bumpStat(key: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.query("INSERT INTO stats (key, value) VALUES ($1, 1) ON CONFLICT (key) DO UPDATE SET value = stats.value + 1", [key]);
  } catch {
    // counters are best-effort
  }
}

let ready: Promise<Querier | null> | null = null;

async function connectPostgres(url: string): Promise<Querier> {
  const { Pool } = (await import("pg")).default ?? (await import("pg"));
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool: Pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: local ? undefined : { rejectUnauthorized: process.env.DATABASE_SSL_NO_VERIFY !== "1" },
  });
  await pool.query(SCHEMA);
  return { query: async (sql, params) => (await pool.query(sql, params as unknown[])).rows };
}

async function connectPglite(): Promise<Querier> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { vector } = await import("@electric-sql/pglite-pgvector");
  const db = await PGlite.create(process.env.PGLITE_DIR || "memory://", { extensions: { vector } });
  await db.exec(SCHEMA);
  return { query: async <T,>(sql: string, params?: unknown[]) => (await db.query<T>(sql, params)).rows };
}

/** Returns a database handle, or null when accounts/memory are not configured. */
export function getDb(): Promise<Querier | null> {
  ready ??= (async () => {
    try {
      if (process.env.DATABASE_URL) return await connectPostgres(process.env.DATABASE_URL);
      // Embedded DB is for dev/tests; serverless instances don't share it, so it's off in production unless forced.
      if (process.env.NODE_ENV !== "production" || process.env.ALLOW_EMBEDDED_DB === "1") return await connectPglite();
      return null;
    } catch (err) {
      console.error("database unavailable:", err instanceof Error ? err.message : "unknown");
      ready = null; // retry on next request
      return null;
    }
  })();
  return ready;
}

export function toVector(v: number[]): string {
  return `[${v.map((x) => (Number.isFinite(x) ? x : 0)).join(",")}]`;
}
