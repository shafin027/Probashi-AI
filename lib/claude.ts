import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { COUNTRIES, HELPLINES } from "./data/countries.ts";
import type { RuleResult } from "./rules.ts";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/** Shared, stable knowledge pack. Kept byte-identical across requests so it caches. */
const KNOWLEDGE = [
  "DESTINATION FACTS (cite the source name when you use a figure):",
  ...COUNTRIES.map(
    (c) =>
      `- ${c.name} (${c.nameBn}): official max cost ${c.officialCostBdt ? `Tk ${c.officialCostBdt}` : "none"} [${c.officialCostSource}]; reported real cost ${
        c.reportedCostBdt ? `Tk ${c.reportedCostBdt[0]}–${c.reportedCostBdt[1]}` : "unknown"
      } [${c.reportedCostSource}]; wage: ${c.minWageNote}; warnings: ${c.warnings.join(" ")}; mission: ${c.embassy}`,
  ),
  "",
  "GENERAL RULES OF SAFE MIGRATION FROM BANGLADESH:",
  "- Recruit only through a BMET-licensed recruiting agency (RL number). Check it on bmet.gov.bd.",
  "- Every worker needs BMET emigration clearance (smart card) and registration (Ami Probashi app). This also gives Wage Earners' Welfare Board insurance and death/disability benefits.",
  "- Pay by bank or MFS to the agency, and get a receipt. Money paid to a dalal cannot be recovered through BMET arbitration.",
  "- Never accept 'free/azad visa', visit visas for work, or offers whose visa job title differs from the promised job.",
  "- Read and keep a copy of the employment contract in a language you understand. Check employer name, salary, hours, overtime, food, housing, contract length, and who pays the return ticket.",
  "- Complaints: BMET arbitration (in person or online), Probash Bandhu call centre 16135, Overseas Employment and Migrants Act 2013 (fraud and overcharging are criminal offences).",
  "- Remittance: use banks or licensed MFS (government gives a 2.5% incentive on formal remittance). Hundi is illegal and gives no protection.",
  "",
  "HELPLINES: " + HELPLINES.map((h) => `${h.name}: ${h.number}`).join("; "),
].join("\n");

const ANALYSE_SYSTEM = `You are Probashi AI, a safety advisor for Bangladeshi migrant workers and their families.
Readers may have low literacy. Write Bangla in simple, warm, everyday words (cholito bhasha). Keep sentences short.
You check job offers, visas, contracts and payment demands for signs of fraud, overcharging and unsafe migration.
Be honest about uncertainty: if a document is unclear, say what you could not read. Never invent employer details.
Never tell someone an offer is definitely real. You can only say what looks safe or risky, and they should verify with BMET.
Use only the facts below and what is in the user's document. If you lack a fact, say so.

${KNOWLEDGE}`;

const ASK_SYSTEM = `You are Probashi AI, a voice-friendly helper for Bangladeshi people who are going abroad to work, or already working abroad, and their families.
Answer in the language the user writes in (Bangla by default). Use simple words and short paragraphs. Use at most 6 bullet points.
Give practical next steps. When you use a fact from the knowledge pack, name its source in brackets.
If the question is outside migration, work, money or family safety, answer briefly and steer back.
If someone is in danger (abuse, passport confiscated, not paid, trafficked), give the helpline numbers and the embassy first.
Do not give legal certainty. Suggest BMET or a lawyer for disputes. Never help anyone deceive authorities or evade immigration law.

${KNOWLEDGE}`;

const severity = z.enum(["high", "medium", "low"]);
export const AnalysisSchema = z.object({
  extracted: z.object({
    documentType: z.string(),
    employer: z.string(),
    jobTitle: z.string(),
    country: z.string(),
    salary: z.number(),
    salaryCurrency: z.string(),
    contractMonths: z.number(),
    visaType: z.enum(["work", "visit", "free", "unknown"]),
  }),
  aiFlags: z.array(z.object({ severity, title: z.string(), titleBn: z.string(), detail: z.string() })),
  summaryBn: z.string(),
  summaryEn: z.string(),
  nextStepsBn: z.array(z.string()),
  negotiationScriptBn: z.string(),
  questionsToAskAgency: z.array(z.string()),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["extracted", "aiFlags", "summaryBn", "summaryEn", "nextStepsBn", "negotiationScriptBn", "questionsToAskAgency"],
  properties: {
    extracted: {
      type: "object",
      additionalProperties: false,
      description: "Fields read from the document. Use empty string or 0 when not present.",
      required: ["documentType", "employer", "jobTitle", "country", "salary", "salaryCurrency", "contractMonths", "visaType"],
      properties: {
        documentType: { type: "string" },
        employer: { type: "string" },
        jobTitle: { type: "string" },
        country: { type: "string" },
        salary: { type: "number", description: "Monthly salary in local currency, 0 if unknown" },
        salaryCurrency: { type: "string" },
        contractMonths: { type: "number" },
        visaType: { type: "string", enum: ["work", "visit", "free", "unknown"] },
      },
    },
    aiFlags: {
      type: "array",
      description: "Extra red flags you found that are NOT already in the rule-engine list.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "title", "titleBn", "detail"],
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          titleBn: { type: "string" },
          detail: { type: "string" },
        },
      },
    },
    summaryBn: { type: "string", description: "3-5 sentence verdict in simple Bangla" },
    summaryEn: { type: "string", description: "Same verdict in English, 2-3 sentences" },
    nextStepsBn: { type: "array", items: { type: "string" }, description: "3-6 concrete next steps in Bangla" },
    negotiationScriptBn: { type: "string", description: "What to say to the agency to bring the cost down and get papers, in Bangla" },
    questionsToAskAgency: { type: "array", items: { type: "string" }, description: "5-8 questions in Bangla to ask before paying" },
  },
} as const;

export type DocImage = { mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf"; data: string };

export async function analyseWithClaude(params: {
  userFields: string;
  offerText: string;
  rules: RuleResult;
  doc?: DocImage;
}): Promise<Analysis> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (params.doc) {
    if (params.doc.mediaType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: params.doc.data } });
    } else {
      content.push({ type: "image", source: { type: "base64", media_type: params.doc.mediaType, data: params.doc.data } });
    }
  }
  const ruleSummary = params.rules.flags.map((f) => `[${f.severity}] ${f.title}: ${f.detail}`).join("\n") || "none";
  content.push({
    type: "text",
    text: `Check this overseas job offer.

What the user told us:
${params.userFields}

Offer text / message they received:
${params.offerText || "(none)"}

Rule-engine flags already found (do not repeat them in aiFlags):
${ruleSummary}

Cost analysis: ${JSON.stringify(params.rules.cost)}

${params.doc ? "A document is attached. Read it carefully: extract the fields and look for mismatches (job title vs. promised job, salary vs. what they were told, employer name, visa category, dates, signs of editing)." : "No document attached. Leave extracted fields empty or 0 unless they are in the text."}`,
  });

  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: ANALYSIS_JSON_SCHEMA } },
    system: [{ type: "text", text: ANALYSE_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new Error("The AI declined to analyse this document.");
  if (response.stop_reason === "max_tokens") throw new Error("The AI response was cut off. Please try again.");
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return AnalysisSchema.parse(JSON.parse(text));
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function askClaude(history: ChatTurn[]): Promise<string> {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: [{ type: "text", text: ASK_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: history,
  });
  if (response.stop_reason === "refusal") {
    return "দুঃখিত, এই প্রশ্নের উত্তর দিতে পারছি না। জরুরি হলে প্রবাস বন্ধু কল সেন্টার 16135-এ ফোন করুন।";
  }
  return response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
}
