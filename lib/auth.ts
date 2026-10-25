// Accounts: phone number + password (most users have a phone, not an email).
// Passwords: scrypt with a per-user salt. Sessions: random 256-bit tokens, only their
// SHA-256 hash is stored, sent as an HttpOnly, Secure, SameSite=Lax cookie.

import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getDb } from "./db.ts";
import { HttpError } from "./security.ts";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SESSION_DAYS = 30;

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-pa_session" : "pa_session";

export type Role = "worker" | "agency" | "legal" | "admin";
export type User = { id: string; phone: string; name: string; memory_enabled: boolean; role: Role; premium_until: Date | string | null };

const USER_COLS = "u.id, u.phone, u.name, u.memory_enabled, u.role, u.premium_until";

export function isPremium(u: Pick<User, "premium_until" | "role">): boolean {
  if (u.role === "legal" || u.role === "admin") return true;
  return !!u.premium_until && new Date(u.premium_until).getTime() > Date.now();
}

/**
 * Staff roles are granted by configuration, not by any API: STAFF_PHONES="01711111111:admin,01811111111:legal".
 * Applied at every login, so removing a number from the list demotes it on next login.
 */
function staffRole(phone: string): Role | null {
  for (const entry of (process.env.STAFF_PHONES ?? "").split(",")) {
    const [p, r] = entry.trim().split(":");
    if (p && normalisePhone(p) === phone && (r === "legal" || r === "admin")) return r;
  }
  return null;
}

async function syncStaffRole(user: User): Promise<User> {
  const staff = staffRole(user.phone);
  const want: Role | null = staff ?? (user.role === "legal" || user.role === "admin" ? "worker" : null);
  if (!want || want === user.role) return user;
  const db = await requireDb();
  await db.query("UPDATE users SET role = $1 WHERE id = $2", [want, user.id]);
  return { ...user, role: want };
}

const COMMON = new Set(["12345678", "123456789", "password", "password1", "11111111", "00000000", "bangladesh", "qwerty123", "abcd1234", "iloveyou"]);

export function normalisePhone(input: string): string | null {
  const bn = input.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  let digits = bn.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(2);
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (pw.length > 128) return "Password is too long";
  if (COMMON.has(pw.toLowerCase())) return "This password is too common. Choose another.";
  return null;
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw.normalize("NFKC"), salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const got = await scrypt(pw.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

// Used to make failed logins for unknown phones take as long as real ones (no user enumeration by timing).
let dummyHash: Promise<string> | null = null;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function requireDb() {
  const db = await getDb();
  if (!db) throw new HttpError(503, "Accounts are not available right now");
  return db;
}

export async function register(phoneRaw: string, name: string, password: string, role: "worker" | "agency" = "worker"): Promise<User> {
  const phone = normalisePhone(phoneRaw);
  if (!phone) throw new HttpError(400, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)");
  const problem = passwordProblem(password);
  if (problem) throw new HttpError(400, problem);
  const cleanName = name.replace(/[<>\u0000-\u001F]/g, "").trim().slice(0, 60);
  if (!cleanName) throw new HttpError(400, "Please enter your name");
  const db = await requireDb();
  const hash = await hashPassword(password);
  const rows = await db.query<User>(
    "INSERT INTO users (phone, name, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (phone) DO NOTHING RETURNING id, phone, name, memory_enabled, role, premium_until",
    [phone, cleanName, hash, role],
  );
  if (!rows[0]) throw new HttpError(409, "An account with this number already exists. Please log in.");
  return syncStaffRole(rows[0]);
}

export async function login(phoneRaw: string, password: string): Promise<User> {
  const phone = normalisePhone(phoneRaw);
  const db = await requireDb();
  const rows = phone ? await db.query<User & { password_hash: string }>(`SELECT ${USER_COLS}, u.password_hash FROM users u WHERE u.phone = $1`, [phone]) : [];
  const row = rows[0];
  dummyHash ??= hashPassword(randomBytes(12).toString("hex"));
  const ok = await verifyPassword(password, row?.password_hash ?? (await dummyHash));
  if (!row || !ok) throw new HttpError(401, "Wrong phone number or password");
  const { password_hash: _omit, ...user } = row;
  return syncStaffRole(user);
}

export async function createSession(userId: string): Promise<{ token: string; maxAge: number }> {
  const db = await requireDb();
  const token = randomBytes(32).toString("base64url");
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  await db.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))", [sha256(token), userId, maxAge]);
  // Opportunistic cleanup of expired sessions.
  await db.query("DELETE FROM sessions WHERE expires_at < now()");
  return { token, maxAge };
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export async function currentUser(req: Request): Promise<User | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || token.length > 100) return null;
  const db = await getDb();
  if (!db) return null;
  const rows = await db.query<User>(
    `SELECT ${USER_COLS} FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0] ?? null;
}

export async function destroySession(req: Request): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE);
  const db = await getDb();
  if (token && db) await db.query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
}

export function sessionCookie(token: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" || SESSION_COOKIE.startsWith("__Host-") ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = SESSION_COOKIE.startsWith("__Host-") ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function publicUser(u: User) {
  return {
    name: u.name,
    phone: `${u.phone.slice(0, 3)}*****${u.phone.slice(-3)}`,
    memoryEnabled: u.memory_enabled,
    role: u.role,
    premium: isPremium(u),
    premiumUntil: u.premium_until ? new Date(u.premium_until).toISOString() : null,
  };
}

/** Loads the logged-in user or throws 401/403. Pass roles to restrict an endpoint. */
export async function requireUser(req: Request, roles?: Role[]): Promise<User> {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, "Please log in");
  if (roles && !roles.includes(user.role)) throw new HttpError(403, "You don't have access to this");
  return user;
}

// Phone-line PIN: 4–6 digits, hashed like a password. Used by the AI phone agent to
// identify a caller, because caller ID alone can be spoofed.
export function pinProblem(pin: string): string | null {
  if (!/^\d{4,6}$/.test(pin)) return "PIN must be 4 to 6 digits";
  if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) return "Choose a PIN that isn't a simple pattern";
  return null;
}

export async function setPhonePin(user: User, pin: string | null): Promise<void> {
  const db = await requireDb();
  if (pin === null) {
    await db.query("UPDATE users SET phone_pin_hash = NULL WHERE id = $1", [user.id]);
    return;
  }
  const problem = pinProblem(pin);
  if (problem) throw new HttpError(400, problem);
  await db.query("UPDATE users SET phone_pin_hash = $1 WHERE id = $2", [await hashPassword(pin), user.id]);
}

export async function hasPhonePin(userId: string): Promise<boolean> {
  const db = await requireDb();
  const rows = await db.query<{ has: boolean }>("SELECT phone_pin_hash IS NOT NULL AS has FROM users WHERE id = $1", [userId]);
  return !!rows[0]?.has;
}

/** Looks up a user by phone and checks their phone PIN (constant work whether or not the user exists). */
export async function verifyPhonePin(phoneRaw: string, pin: string): Promise<User | null> {
  const phone = normalisePhone(phoneRaw);
  const db = await requireDb();
  const rows = phone ? await db.query<User & { phone_pin_hash: string | null }>(`SELECT ${USER_COLS}, u.phone_pin_hash FROM users u WHERE u.phone = $1`, [phone]) : [];
  const row = rows[0];
  dummyHash ??= hashPassword(randomBytes(12).toString("hex"));
  const ok = await verifyPassword(pin.replace(/\D/g, ""), row?.phone_pin_hash ?? (await dummyHash));
  if (!row || !row.phone_pin_hash || !ok) return null;
  const { phone_pin_hash: _omit, ...user } = row;
  return user;
}
