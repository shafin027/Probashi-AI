import { z } from "zod";
import { createSession, login, normalisePhone, publicUser, sessionCookie } from "@/lib/auth.ts";
import { clientIp, rateLimit } from "@/lib/ratelimit.ts";
import { assertSameOrigin, errorResponse, HttpError, json, readJson } from "@/lib/security.ts";

export const runtime = "nodejs";

const Body = z.object({ phone: z.string().max(20), password: z.string().max(200) }).strict();

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const parsed = Body.safeParse(await readJson(req, 4096));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    // Brute-force protection: per network and per account.
    const phone = normalisePhone(parsed.data.phone) ?? "invalid";
    const okIp = await rateLimit(`login-ip:${clientIp(req)}`, 20, 15 * 60 * 1000);
    const okAcct = await rateLimit(`login-acct:${phone}`, 8, 15 * 60 * 1000);
    if (!okIp || !okAcct) throw new HttpError(429, "Too many attempts. Wait 15 minutes and try again.");
    const user = await login(parsed.data.phone, parsed.data.password);
    const { token, maxAge } = await createSession(user.id);
    return json({ user: publicUser(user) }, 200, { "Set-Cookie": sessionCookie(token, maxAge) });
  } catch (err) {
    return errorResponse(err);
  }
}
