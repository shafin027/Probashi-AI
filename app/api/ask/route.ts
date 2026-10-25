import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { aiEnabled, askClaude } from "@/lib/claude.ts";
import { clientIp, rateLimit } from "@/lib/ratelimit.ts";
import { offlineAnswer } from "@/lib/faq.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const last = body.messages[body.messages.length - 1];
  if (last.role !== "user") return NextResponse.json({ error: "Last message must be from the user" }, { status: 400 });

  if (!aiEnabled()) {
    return NextResponse.json({ answer: offlineAnswer(last.content), mode: "offline" });
  }
  if (!rateLimit(`ask:${clientIp(req)}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ answer: offlineAnswer(last.content), mode: "offline", notice: "AI limit reached for this hour." });
  }
  try {
    const answer = await askClaude(body.messages);
    return NextResponse.json({ answer, mode: "ai" });
  } catch (err) {
    console.error("ask failed", err);
    const notice = err instanceof Anthropic.RateLimitError ? "AI is busy right now." : "AI service unavailable.";
    return NextResponse.json({ answer: offlineAnswer(last.content), mode: "offline", notice });
  }
}
