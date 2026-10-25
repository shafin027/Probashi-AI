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
`;

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
