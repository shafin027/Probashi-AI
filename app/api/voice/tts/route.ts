import { z } from "zod";
import { openaiEnabled, speak } from "@/lib/openai.ts";
import { clientIp, rateLimit, withinDailyAiBudget } from "@/lib/ratelimit.ts";
import { assertSameOrigin, errorResponse, HttpError, readJson } from "@/lib/security.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ text: z.string().min(1).max(1500) }).strict();

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!openaiEnabled()) throw new HttpError(503, "Natural voice is not configured");
    if (!(await rateLimit(`tts:${clientIp(req)}`, 60, 60 * 60 * 1000)) || !(await withinDailyAiBudget())) throw new HttpError(429, "Voice limit reached");
    const parsed = Body.safeParse(await readJson(req, 16 * 1024));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    // Strip markdown and emoji so the voice reads only words.
    const text = parsed.data.text.replace(/[*_#`>|~]/g, "").replace(/\p{Extended_Pictographic}/gu, "").trim();
    if (!text) throw new HttpError(400, "Nothing to read");
    try {
      const audio = await speak(text);
      return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    } catch (err) {
      console.error("tts failed:", err instanceof Error ? err.name : "unknown");
      throw new HttpError(502, "Voice is unavailable right now");
    }
  } catch (err) {
    return errorResponse(err);
  }
}
