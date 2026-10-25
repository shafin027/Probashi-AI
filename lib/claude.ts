import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSE_SYSTEM,
  ANALYSIS_JSON_SCHEMA,
  AnalysisSchema,
  analysisInstruction,
  ASK_JSON_SCHEMA,
  ASK_SYSTEM,
  AskSchema,
  memoryBlock,
  type AnalyseParams,
  type Analysis,
  type AskResult,
} from "./prompts.ts";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

export function claudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Stay inside the route's 60s budget: one retry, 45s per attempt.
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 45_000, maxRetries: 1 });
  return client;
}

function textOf(response: Anthropic.Beta.BetaMessage): string {
  if (response.stop_reason === "refusal") throw new Error("refusal");
  if (response.stop_reason === "max_tokens") throw new Error("max_tokens");
  return response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
}

export async function analyseWithClaude(params: AnalyseParams): Promise<Analysis> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (params.doc) {
    if (params.doc.mediaType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: params.doc.data } });
    } else {
      content.push({ type: "image", source: { type: "base64", media_type: params.doc.mediaType, data: params.doc.data } });
    }
  }
  content.push({ type: "text", text: analysisInstruction(params) });

  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: ANALYSIS_JSON_SCHEMA } },
    system: [{ type: "text", text: ANALYSE_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  });
  return AnalysisSchema.parse(JSON.parse(textOf(response)));
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function askClaude(history: ChatTurn[], memories: string[]): Promise<AskResult> {
  const mem = memoryBlock(memories);
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t, i) =>
    // Memory rides along with the latest user turn, after the cached system prompt.
    i === history.length - 1 && mem ? { role: t.role, content: `${mem}\n\n${t.content}` } : { role: t.role, content: t.content },
  );
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: ASK_JSON_SCHEMA } },
    system: [{ type: "text", text: ASK_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages,
  });
  return AskSchema.parse(JSON.parse(textOf(response)));
}
