import { z } from "zod";
import { bumpStat } from "@/lib/db.ts";
import { ALL_MILESTONES, LEVELS } from "@/lib/journey.ts";
import { clientIp, rateLimit } from "@/lib/ratelimit.ts";
import { assertSameOrigin, errorResponse, HttpError, json, readJson } from "@/lib/security.ts";

export const runtime = "nodejs";

// Measurement for the gamification objective (skill step 7). Aggregate counters only:
// no user id, no IP stored, allow-listed event names. Never shown publicly, because
// client-sent counts can be inflated; they are for the team's funnel, not social proof.
const ALLOWED = new Set<string>([
  ...ALL_MILESTONES.map((m) => `milestone:${m.id}`),
  ...LEVELS.map((l) => `level:${l.en.toLowerCase().replace(/\s+/g, "_")}`),
  "quiz_round:easy",
  "quiz_round:hard",
  "quiz_pass:easy",
  "quiz_pass:hard",
]);

const Body = z.object({ event: z.string().max(60) }).strict();

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const parsed = Body.safeParse(await readJson(req, 512));
    if (!parsed.success || !ALLOWED.has(parsed.data.event)) throw new HttpError(400, "Unknown event");
    if (!(await rateLimit(`events:${clientIp(req)}`, 120, 60 * 60 * 1000))) throw new HttpError(429, "Too many events");
    await bumpStat(`ev:${parsed.data.event}`);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
