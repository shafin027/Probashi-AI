import { currentUser, hasPhonePin, publicUser } from "@/lib/auth.ts";
import { errorResponse, json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await currentUser(req);
    return json({ user: user ? { ...publicUser(user), hasPhonePin: await hasPhonePin(user.id) } : null });
  } catch (err) {
    return errorResponse(err);
  }
}
