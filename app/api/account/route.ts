import { z } from "zod";
import { clearSessionCookie, currentUser, publicUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db.ts";
import { assertSameOrigin, errorResponse, HttpError, json, readJson } from "@/lib/security.ts";

export const runtime = "nodejs";

const Patch = z.object({ memoryEnabled: z.boolean() }).strict();

async function requireUser(req: Request) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "Please log in");
  const db = await getDb();
  if (!db) throw new HttpError(503, "Accounts are not available right now");
  return { user, db };
}

/** Turn memory on/off. Turning it off also erases what was remembered. */
export async function PATCH(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireUser(req);
    const parsed = Patch.safeParse(await readJson(req, 1024));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    await db.query("UPDATE users SET memory_enabled = $1 WHERE id = $2", [parsed.data.memoryEnabled, user.id]);
    if (!parsed.data.memoryEnabled) await db.query("DELETE FROM memories WHERE user_id = $1", [user.id]);
    return json({ user: publicUser({ ...user, memory_enabled: parsed.data.memoryEnabled }) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Permanently delete the account and everything linked to it (sessions, memories). */
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireUser(req);
    await db.query("DELETE FROM users WHERE id = $1", [user.id]);
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  } catch (err) {
    return errorResponse(err);
  }
}
