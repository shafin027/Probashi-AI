// Provider switch. Claude is used when ANTHROPIC_API_KEY is set; otherwise OpenAI.
// If the primary provider fails, the other one (if configured) is tried once.

import { analyseWithClaude, askClaude, claudeEnabled, type ChatTurn } from "./claude.ts";
import { analyseWithOpenAI, askOpenAI, openaiEnabled } from "./openai.ts";
import type { AnalyseParams, Analysis, AskResult } from "./prompts.ts";

export type Provider = "anthropic" | "openai";

export function providers(): Provider[] {
  const list: Provider[] = [];
  if (claudeEnabled()) list.push("anthropic");
  if (openaiEnabled()) list.push("openai");
  return list;
}

export function aiEnabled(): boolean {
  return providers().length > 0;
}

async function withFallback<T>(run: (p: Provider) => Promise<T>): Promise<{ result: T; provider: Provider }> {
  const list = providers();
  let lastErr: unknown = new Error("no provider");
  for (const p of list) {
    try {
      return { result: await run(p), provider: p };
    } catch (err) {
      lastErr = err;
      console.error(`ai provider ${p} failed:`, err instanceof Error ? err.name : "unknown");
    }
  }
  throw lastErr;
}

export function analyse(params: AnalyseParams): Promise<{ result: Analysis; provider: Provider }> {
  return withFallback((p) => (p === "anthropic" ? analyseWithClaude(params) : analyseWithOpenAI(params)));
}

export function ask(history: ChatTurn[], memories: string[]): Promise<{ result: AskResult; provider: Provider }> {
  return withFallback((p) => (p === "anthropic" ? askClaude(history, memories) : askOpenAI(history, memories)));
}
