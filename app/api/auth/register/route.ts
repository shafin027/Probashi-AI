import { z } from "zod";
import { createSession, publicUser, register, sessionCookie } from "@/lib/auth.ts";
import { clientIp, rateLimit } from "@/lib/ratelimit.ts";
import { assertSameOrigin, errorResponse, HttpError, json, readJson } from "@/lib/security.ts";

export const runtime = "nodejs";

const Body = z.object({ phone: z.string().max(20), name: z.string().max(80), password: z.string().max(200), accountType: z.enum(["worker", "agency"]).optional() }).strict();

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!(await rateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000))) throw new HttpError(429, "Too many sign-ups from this network. Try again later.");
    const parsed = Body.safeParse(await readJson(req, 4096));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    const user = await register(parsed.data.phone, parsed.data.name, parsed.data.password, parsed.data.accountType ?? "worker");
    const { token, maxAge } = await createSession(user.id);
    return json({ user: publicUser(user) }, 201, { "Set-Cookie": sessionCookie(token, maxAge) });
  } catch (err) {
    return errorResponse(err);
  }
}
