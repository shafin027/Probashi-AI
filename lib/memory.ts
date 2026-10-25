// Per-user long-term memory in a vector store (pgvector). Things a logged-in user tells
// us (checked offers, destination, questions) are embedded and recalled by meaning, so
// later answers can be personalised. Only stored when the user has memory turned on.

import { getDb, toVector } from "./db.ts";
import { embed, openaiEnabled } from "./openai.ts";
import type { User } from "./auth.ts";

const MAX_PER_USER = 300;

export type MemoryKind = "check" | "chat" | "profile";

export async function remember(user: User | null, kind: MemoryKind, content: string): Promise<void> {
  if (!user?.memory_enabled) return;
  const db = await getDb();
  if (!db) return;
  const text = content.replace(/\s+/g, " ").trim().slice(0, 1000);
  if (text.length < 8) return;
  try {
    const dup = await db.query<{ id: string }>("SELECT id FROM memories WHERE user_id = $1 AND content = $2 LIMIT 1", [user.id, text]);
    if (dup.length) return;
    let vec: string | null = null;
    if (openaiEnabled()) vec = toVector((await embed([text]))[0]);
    await db.query("INSERT INTO memories (user_id, kind, content, embedding) VALUES ($1, $2, $3, $4)", [user.id, kind, text, vec]);
    await db.query(
      "DELETE FROM memories WHERE user_id = $1 AND id NOT IN (SELECT id FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2)",
      [user.id, MAX_PER_USER],
    );
  } catch (err) {
    // Memory is a bonus; never fail the user's request because of it.
    console.error("remember failed:", err instanceof Error ? err.name : "unknown");
  }
}

/** Most relevant memories for a query: vector similarity when embeddings exist, else most recent. */
export async function recall(user: User | null, query: string, k = 6): Promise<string[]> {
  if (!user?.memory_enabled) return [];
  const db = await getDb();
  if (!db) return [];
  try {
    const queryVec = openaiEnabled() ? await embed([query.slice(0, 2000)]).then((v) => v[0], () => null) : null;
    if (queryVec) {
      const vec = toVector(queryVec);
      const rows = await db.query<{ content: string }>(
        `SELECT content FROM memories WHERE user_id = $1 AND embedding IS NOT NULL
         ORDER BY embedding <=> $2::vector LIMIT $3`,
        [user.id, vec, k],
      );
      if (rows.length) return rows.map((r) => r.content);
    }
    const rows = await db.query<{ content: string }>("SELECT content FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2", [user.id, k]);
    return rows.map((r) => r.content);
  } catch (err) {
    console.error("recall failed:", err instanceof Error ? err.name : "unknown");
    return [];
  }
}

export async function listMemories(user: User) {
  const db = await getDb();
  if (!db) return [];
  return db.query<{ id: string; kind: string; content: string; created_at: string }>(
    "SELECT id, kind, content, created_at FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
    [user.id],
  );
}

export async function forget(user: User, id?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (id) await db.query("DELETE FROM memories WHERE user_id = $1 AND id = $2", [user.id, id]);
  else await db.query("DELETE FROM memories WHERE user_id = $1", [user.id]);
}
