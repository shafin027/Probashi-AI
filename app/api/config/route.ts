import { aiEnabled } from "@/lib/ai.ts";
import { openaiEnabled } from "@/lib/openai.ts";
import { getDb } from "@/lib/db.ts";
import { json } from "@/lib/security.ts";
import { phoneLineEnabled } from "@/lib/phone.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which features the UI can offer. Booleans only; nothing about how they are configured. */
export async function GET() {
  return json({
    ai: aiEnabled(),
    naturalVoice: openaiEnabled(),
    accounts: Boolean(await getDb()),
    phoneLine: phoneLineEnabled() ? (process.env.PHONE_LINE_NUMBER ?? null) : null,
  });
}
