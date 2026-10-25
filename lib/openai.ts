// OpenAI: natural Bangla voice (speech-to-text, text-to-speech), embeddings for the
// memory vector store, and a fallback provider for analysis and chat when no
// Anthropic key is configured.

import OpenAI, { toFile } from "openai";
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
import type { ChatTurn } from "./claude.ts";

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
export const STT_MODEL = process.env.OPENAI_STT_MODEL || "gpt-4o-transcribe";
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
export const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "marin";
export const EMBED_MODEL = "text-embedding-3-small";

export function openaiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let client: OpenAI | null = null;
function getClient(): OpenAI {
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 1 });
  return client;
}

function parseJsonReply(completion: OpenAI.Chat.Completions.ChatCompletion): unknown {
  const choice = completion.choices[0];
  if (!choice) throw new Error("empty");
  if (choice.message.refusal) throw new Error("refusal");
  if (choice.finish_reason === "length") throw new Error("max_tokens");
  return JSON.parse(choice.message.content ?? "");
}

export async function analyseWithOpenAI(params: AnalyseParams): Promise<Analysis> {
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
  if (params.doc) {
    const dataUrl = `data:${params.doc.mediaType};base64,${params.doc.data}`;
    if (params.doc.mediaType === "application/pdf") parts.push({ type: "file", file: { filename: "offer.pdf", file_data: dataUrl } });
    else parts.push({ type: "image_url", image_url: { url: dataUrl, detail: "high" } });
  }
  parts.push({ type: "text", text: analysisInstruction(params) });
  const completion = await getClient().chat.completions.create({
    model: OPENAI_MODEL,
    reasoning_effort: "low",
    max_completion_tokens: 8000,
    response_format: { type: "json_schema", json_schema: { name: "offer_analysis", strict: true, schema: ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown> } },
    messages: [
      { role: "system", content: ANALYSE_SYSTEM },
      { role: "user", content: parts },
    ],
  });
  return AnalysisSchema.parse(parseJsonReply(completion));
}

export async function askOpenAI(history: ChatTurn[], memories: string[]): Promise<AskResult> {
  const mem = memoryBlock(memories);
  const completion = await getClient().chat.completions.create({
    model: OPENAI_MODEL,
    reasoning_effort: "low",
    max_completion_tokens: 3000,
    response_format: { type: "json_schema", json_schema: { name: "chat_reply", strict: true, schema: ASK_JSON_SCHEMA as unknown as Record<string, unknown> } },
    messages: [
      { role: "system", content: ASK_SYSTEM },
      ...history.map((t, i) => ({ role: t.role, content: i === history.length - 1 && mem ? `${mem}\n\n${t.content}` : t.content })),
    ],
  });
  return AskSchema.parse(parseJsonReply(completion));
}

export async function transcribe(audio: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : mimeType.includes("wav") ? "wav" : "mp3";
  const result = await getClient().audio.transcriptions.create({
    file: await toFile(audio, `speech.${ext}`, { type: mimeType }),
    model: STT_MODEL,
    language: "bn",
    // Vocabulary hint improves accuracy on migration terms and place names.
    prompt: "প্রবাসী শ্রমিক, ভিসা, দালাল, এজেন্সি, বিএমইটি, সৌদি আরব, মালয়েশিয়া, কাতার, দুবাই, বেতন, রিয়াল, রিঙ্গিত, পাসপোর্ট, আকামা",
  });
  return result.text.trim();
}

const TTS_INSTRUCTIONS =
  "Speak natural, warm Bangladeshi Bangla like a kind, experienced elder sibling from Dhaka who helps migrant workers. " +
  "Conversational pace, gentle and reassuring, clear pronunciation of numbers and money amounts. Not robotic, not overly formal. " +
  "If the text contains English words, pronounce them the way Bangladeshi speakers naturally do.";

export async function speak(text: string): Promise<ArrayBuffer> {
  const res = await getClient().audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
    instructions: TTS_INSTRUCTIONS,
    response_format: "mp3",
  });
  return res.arrayBuffer();
}

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await getClient().embeddings.create({ model: EMBED_MODEL, input: texts });
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
