import { z } from "zod";
import { clearSessionCookie, currentUser, isPremium, publicUser, setPhonePin } from "@/lib/auth.ts";
import { getDb } from "@/lib/db.ts";
import { assertSameOrigin, errorResponse, HttpError, json, readJson } from "@/lib/security.ts";

export const runtime = "nodejs";

const Patch = z.object({ memoryEnabled: z.boolean().optional(), phonePin: z.string().max(10).nullable().optional() }).strict();

async function requireUser(req: Request) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "Please log in");
  const db = await getDb();
  if (!db) throw new HttpError(503, "Accounts are not available right now");
  return { user, db };
}

/** Turn memory on/off (off erases what was remembered); set or remove the phone-line PIN. */
export async function PATCH(req: Request) {
  try {
    assertSameOrigin(req);
    const { user, db } = await requireUser(req);
    const parsed = Patch.safeParse(await readJson(req, 1024));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    const { memoryEnabled, phonePin } = parsed.data;
    if (phonePin !== undefined) {
      if (phonePin !== null && !isPremium(user)) throw new HttpError(402, "The AI phone line is a Premium feature");
      await setPhonePin(user, phonePin);
    }
    if (memoryEnabled !== undefined) {
      await db.query("UPDATE users SET memory_enabled = $1 WHERE id = $2", [memoryEnabled, user.id]);
      if (!memoryEnabled) await db.query("DELETE FROM memories WHERE user_id = $1", [user.id]);
    }
    return json({ user: publicUser({ ...user, memory_enabled: memoryEnabled ?? user.memory_enabled }) });
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
