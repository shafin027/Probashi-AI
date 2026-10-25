import { z } from "zod";
import { aiEnabled, ask } from "@/lib/ai.ts";
import { currentUser } from "@/lib/auth.ts";
import { recall, remember } from "@/lib/memory.ts";
import { clientIp, rateLimit, withinDailyAiBudget } from "@/lib/ratelimit.ts";
import { offlineAnswer, offlineSuggestions } from "@/lib/faq.ts";
import { assertSameOrigin, clampText, errorResponse, HttpError, json, readJson } from "@/lib/security.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z
  .object({
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }).strict())
      .min(1)
      .max(20),
  })
  .strict();

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const parsed = BodySchema.safeParse(await readJson(req, 64 * 1024));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    const messages = parsed.data.messages;
    const last = messages[messages.length - 1];
    if (messages[0].role !== "user" || last.role !== "user") throw new HttpError(400, "Conversation must start and end with the user");

    const offline = (notice?: string) => json({ answer: offlineAnswer(last.content), suggestions: offlineSuggestions(last.content), mode: "offline", notice });
    if (!aiEnabled()) return offline();
    if (!(await rateLimit(`ask:${clientIp(req)}`, 40, 60 * 60 * 1000)) || !(await withinDailyAiBudget())) return offline("AI limit reached for now.");

    const user = await currentUser(req);
    const memories = await recall(user, last.content);
    try {
      const { result } = await ask(messages, memories);
      const answer = clampText(result.answer, 4000);
      const suggestions = result.suggestions.slice(0, 3).map((s) => clampText(s, 80)).filter(Boolean);
      await remember(user, "chat", `User asked: ${last.content.slice(0, 400)}`);
      return json({ answer, suggestions, mode: "ai", personalised: memories.length > 0 });
    } catch (err) {
      console.error("ask failed:", err instanceof Error ? err.name : "unknown");
      return offline("AI service unavailable.");
    }
  } catch (err) {
    return errorResponse(err);
  }
}
