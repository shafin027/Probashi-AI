import { z } from "zod";
import { openaiEnabled, transcribe } from "@/lib/openai.ts";
import { clientIp, rateLimit, withinDailyAiBudget } from "@/lib/ratelimit.ts";
import { assertSameOrigin, clampText, errorResponse, HttpError, json, readJson, sniffAudio } from "@/lib/security.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO = 3 * 1024 * 1024; // about 2–3 minutes of opus audio
const Body = z
  .object({
    mimeType: z.string().regex(/^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a|aac)(;\s*codecs=[\w.,-]+)?$/),
    data: z.string().max(Math.ceil((MAX_AUDIO * 4) / 3) + 8),
  })
  .strict();

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!openaiEnabled()) throw new HttpError(503, "Natural voice is not configured");
    if (!(await rateLimit(`stt:${clientIp(req)}`, 40, 60 * 60 * 1000)) || !(await withinDailyAiBudget())) throw new HttpError(429, "Voice limit reached. Please type instead.");
    const parsed = Body.safeParse(await readJson(req, Math.ceil((MAX_AUDIO * 4) / 3) + 4096));
    if (!parsed.success) throw new HttpError(400, "Invalid audio");
    const audio = Buffer.from(parsed.data.data, "base64");
    if (audio.byteLength > MAX_AUDIO) throw new HttpError(413, "Recording too long");
    if (!sniffAudio(audio.subarray(0, 16))) throw new HttpError(415, "Not an audio recording");
    try {
      const text = clampText(await transcribe(audio, parsed.data.mimeType.split(";")[0]), 2000);
      return json({ text });
    } catch (err) {
      console.error("stt failed:", err instanceof Error ? err.name : "unknown");
      throw new HttpError(502, "Could not understand the recording. Please try again.");
    }
  } catch (err) {
    return errorResponse(err);
  }
}
