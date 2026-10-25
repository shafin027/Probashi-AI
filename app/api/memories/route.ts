import { z } from "zod";
import { currentUser } from "@/lib/auth.ts";
import { forget, listMemories } from "@/lib/memory.ts";
import { assertSameOrigin, errorResponse, HttpError, json, readJson } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Del = z.object({ id: z.uuid().optional() }).strict();

export async function GET(req: Request) {
  try {
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, "Please log in");
    return json({ memories: await listMemories(user) });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Delete one memory ({id}) or all of them ({}). */
export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, "Please log in");
    const parsed = Del.safeParse(await readJson(req, 1024));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    await forget(user, parsed.data.id);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
