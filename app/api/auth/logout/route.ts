import { clearSessionCookie, destroySession } from "@/lib/auth.ts";
import { assertSameOrigin, errorResponse, json } from "@/lib/security.ts";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await destroySession(req);
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  } catch (err) {
    return errorResponse(err);
  }
}
