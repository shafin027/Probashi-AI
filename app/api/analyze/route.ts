import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { analyseOffer, type Flag, type OfferInput } from "@/lib/rules.ts";
import { aiEnabled, analyseWithClaude, type Analysis, type DocImage } from "@/lib/claude.ts";
import { clientIp, rateLimit } from "@/lib/ratelimit.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DOC_BYTES = 5 * 1024 * 1024;

const BodySchema = z.object({
  input: z.object({
    countryCode: z.string().max(4),
    destinationText: z.string().max(200).optional(),
    jobTitle: z.string().max(200).optional(),
    salaryLocal: z.number().nonnegative().optional(),
    askedCostBdt: z.number().nonnegative().optional(),
    agencyQuery: z.string().max(120).optional(),
    visaType: z.enum(["work", "visit", "free", "unknown"]).optional(),
    paidTo: z.enum(["agency", "individual", "unknown"]).optional(),
    receipt: z.boolean().optional(),
    bmetClearance: z.boolean().optional(),
    foundVia: z.enum(["agency", "social", "relative", "unknown"]).optional(),
    passportHandedOver: z.boolean().optional(),
    offerText: z.string().max(4000).optional(),
  }),
  doc: z
    .object({
      mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]),
      data: z.string(),
    })
    .optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.doc && (body.doc.data.length * 3) / 4 > MAX_DOC_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  const input: OfferInput = body.input;
  let rules = analyseOffer(input);

  let ai: Analysis | null = null;
  let aiError: string | null = null;
  const wantsAi = aiEnabled() && (body.doc || input.offerText || input.jobTitle);
  if (wantsAi) {
    if (!rateLimit(`analyze:${clientIp(req)}`, 15, 60 * 60 * 1000)) {
      aiError = "AI limit reached for this hour. Showing rule-based results only.";
    } else {
      try {
        ai = await analyseWithClaude({
          userFields: JSON.stringify({ ...input, offerText: undefined }),
          offerText: input.offerText ?? "",
          rules,
          doc: body.doc as DocImage | undefined,
        });
        // Fill gaps from the document, then re-run the rules on the merged facts.
        const ex = ai.extracted;
        const merged: OfferInput = {
          ...input,
          jobTitle: input.jobTitle || ex.jobTitle || undefined,
          salaryLocal: input.salaryLocal || ex.salary || undefined,
          visaType: input.visaType && input.visaType !== "unknown" ? input.visaType : ex.visaType,
          destinationText: [input.destinationText, ex.country].filter(Boolean).join(" ") || undefined,
        };
        rules = analyseOffer(merged);
      } catch (err) {
        console.error("analyse failed", err);
        aiError =
          err instanceof Anthropic.RateLimitError
            ? "AI is busy right now. Showing rule-based results only."
            : err instanceof Anthropic.APIError
              ? "AI service error. Showing rule-based results only."
              : "AI could not read this document. Showing rule-based results only.";
      }
    }
  }

  // AI flags can add risk but can never remove a rule-engine flag.
  const ruleIds = new Set(rules.flags.map((f) => f.title.toLowerCase()));
  const aiFlags: Flag[] = (ai?.aiFlags ?? [])
    .filter((f) => !ruleIds.has(f.title.toLowerCase()))
    .slice(0, 6)
    .map((f, i) => ({ id: `ai-${i}`, ...f }));
  const flags = [...rules.flags, ...aiFlags];
  const weights = { high: 30, medium: 12, low: 5 } as const;
  const score = Math.max(0, 100 - flags.reduce((s, f) => s + weights[f.severity], 0));
  const verdict = flags.some((f) => f.severity === "high") || score < 50 ? "danger" : score < 80 ? "caution" : "safe";

  return NextResponse.json({
    score,
    verdict,
    flags,
    cost: rules.cost,
    agency: rules.agency,
    country: rules.country ? { name: rules.country.name, nameBn: rules.country.nameBn, currency: rules.country.currency, officialCostSource: rules.country.officialCostSource, warnings: rules.country.warnings, embassy: rules.country.embassy } : null,
    ai,
    aiMode: ai ? "ai" : aiEnabled() ? "rules-fallback" : "rules-only",
    aiError,
  });
}
