import { z } from "zod";
import { analyseOffer, type Flag, type OfferInput } from "@/lib/rules.ts";
import { aiEnabled, analyse } from "@/lib/ai.ts";
import type { Analysis, DocImage } from "@/lib/prompts.ts";
import { currentUser } from "@/lib/auth.ts";
import { remember } from "@/lib/memory.ts";
import { bumpStat, getDb } from "@/lib/db.ts";
import { resolveAgency } from "@/lib/marketplace.ts";
import { COUNTRIES } from "@/lib/data/countries.ts";
import { clientIp, rateLimit, withinDailyAiBudget } from "@/lib/ratelimit.ts";
import { assertSameOrigin, clampText, errorResponse, HttpError, json, readJson, validateUpload } from "@/lib/security.ts";
import { seal } from "@/lib/seal.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DOC_BYTES = 5 * 1024 * 1024;
// base64 inflates by 4/3, plus room for the form fields.
const MAX_BODY_BYTES = Math.ceil((MAX_DOC_BYTES * 4) / 3) + 64 * 1024;

const text = (max: number) => z.string().max(max).optional();
const BodySchema = z
  .object({
    input: z
      .object({
        countryCode: z.string().regex(/^[A-Z]{2}$/),
        destinationText: text(200),
        jobTitle: text(200),
        salaryLocal: z.number().nonnegative().max(10_000_000).optional(),
        askedCostBdt: z.number().nonnegative().max(100_000_000).optional(),
        agencyQuery: text(120),
        visaType: z.enum(["work", "visit", "free", "unknown"]).optional(),
        paidTo: z.enum(["agency", "individual", "unknown"]).optional(),
        receipt: z.boolean().optional(),
        bmetClearance: z.boolean().optional(),
        foundVia: z.enum(["agency", "social", "relative", "unknown"]).optional(),
        passportHandedOver: z.boolean().optional(),
        offerText: text(4000),
      })
      .strict(),
    doc: z
      .object({
        mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]),
        data: z.string().max(MAX_BODY_BYTES),
      })
      .strict()
      .optional(),
  })
  .strict();

function sanitise(ai: Analysis): Analysis {
  return {
    extracted: {
      ...ai.extracted,
      documentType: clampText(ai.extracted.documentType, 80),
      employer: clampText(ai.extracted.employer, 120),
      jobTitle: clampText(ai.extracted.jobTitle, 120),
      country: clampText(ai.extracted.country, 60),
      salaryCurrency: clampText(ai.extracted.salaryCurrency, 10),
      salary: Math.max(0, Math.min(ai.extracted.salary, 10_000_000)),
      contractMonths: Math.max(0, Math.min(ai.extracted.contractMonths, 240)),
    },
    aiFlags: ai.aiFlags.slice(0, 6).map((f) => ({ ...f, title: clampText(f.title, 120), titleBn: clampText(f.titleBn, 120), detail: clampText(f.detail, 400) })),
    summaryBn: clampText(ai.summaryBn, 1200),
    summaryEn: clampText(ai.summaryEn, 800),
    nextStepsBn: ai.nextStepsBn.slice(0, 8).map((s) => clampText(s, 300)),
    negotiationScriptBn: clampText(ai.negotiationScriptBn, 2500),
    questionsToAskAgency: ai.questionsToAskAgency.slice(0, 10).map((s) => clampText(s, 300)),
  };
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ip = clientIp(req);
    if (!(await rateLimit(`analyze-any:${ip}`, 60, 60 * 60 * 1000))) throw new HttpError(429, "Too many requests. Please wait a while.");

    const parsed = BodySchema.safeParse(await readJson(req, MAX_BODY_BYTES));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    const body = parsed.data;

    let doc: DocImage | undefined;
    if (body.doc) doc = { mediaType: validateUpload(body.doc.mediaType, body.doc.data, MAX_DOC_BYTES), data: body.doc.data };

    // With a database, agencies are checked against the imported official licence list
    // (plus verified reviews and substantiated complaints); without one, the demo list.
    const input: OfferInput = body.input;
    if (input.agencyQuery?.trim() && (await getDb())) input.resolvedAgency = await resolveAgency(input.agencyQuery);
    let rules = analyseOffer(input);

    let ai: Analysis | null = null;
    let aiError: string | null = null;
    if (aiEnabled() && (doc || input.offerText || input.jobTitle)) {
      if (!(await rateLimit(`analyze-ai:${ip}`, 15, 60 * 60 * 1000)) || !(await withinDailyAiBudget())) {
        aiError = "AI limit reached for now. Showing rule-based results only.";
      } else {
        try {
          const { result } = await analyse({
            userFields: JSON.stringify({ ...input, offerText: undefined }),
            offerText: input.offerText ?? "",
            rules,
            doc,
          });
          ai = sanitise(result);
          // Fill gaps from the document, then re-run the rules on the merged facts.
          const ex = ai.extracted;
          rules = analyseOffer({
            ...input,
            jobTitle: input.jobTitle || ex.jobTitle || undefined,
            salaryLocal: input.salaryLocal || ex.salary || undefined,
            visaType: input.visaType && input.visaType !== "unknown" ? input.visaType : ex.visaType,
            destinationText: [input.destinationText, ex.country].filter(Boolean).join(" ") || undefined,
          });
        } catch (err) {
          console.error("analyse failed:", err instanceof Error ? err.name : "unknown");
          aiError = "AI could not read this right now. Showing rule-based results only.";
        }
      }
    }

    // AI flags can add risk but can never remove a rule-engine flag.
    const ruleTitles = new Set(rules.flags.map((f) => f.title.toLowerCase()));
    const aiFlags: Flag[] = (ai?.aiFlags ?? []).filter((f) => !ruleTitles.has(f.title.toLowerCase())).map((f, i) => ({ id: `ai-${i}`, ...f }));
    const flags = [...rules.flags, ...aiFlags];
    const weights = { high: 30, medium: 12, low: 5 } as const;
    const score = Math.max(0, 100 - flags.reduce((s, f) => s + weights[f.severity], 0));
    const verdict = flags.some((f) => f.severity === "high") || score < 50 ? "danger" : score < 80 ? "caution" : "safe";

    // The paid section never reaches the browser in readable form until payment is verified.
    const premium = ai ? { negotiationScriptBn: ai.negotiationScriptBn, questionsToAskAgency: ai.questionsToAskAgency } : null;
    const free = ai ? { extracted: ai.extracted, summaryBn: ai.summaryBn, summaryEn: ai.summaryEn, nextStepsBn: ai.nextStepsBn } : null;

    await bumpStat("offers_checked");
    if (verdict === "danger") await bumpStat("dangers_flagged");
    const user = await currentUser(req);
    if (user) {
      const country = COUNTRIES.find((c) => c.code === input.countryCode);
      await remember(
        user,
        "check",
        `Checked a job offer for ${country?.name ?? input.countryCode}${input.jobTitle ? ` as ${input.jobTitle}` : ""}${input.askedCostBdt ? `, asked to pay Tk ${input.askedCostBdt}` : ""}${input.agencyQuery ? `, agency ${input.agencyQuery}` : ""}. Verdict: ${verdict} (score ${score}). Main issues: ${flags.slice(0, 4).map((f) => f.title).join("; ") || "none"}.`,
      );
    }

    return json({
      score,
      verdict,
      flags,
      cost: rules.cost,
      agency: rules.agency,
      country: rules.country
        ? { name: rules.country.name, nameBn: rules.country.nameBn, currency: rules.country.currency, officialCostSource: rules.country.officialCostSource, warnings: rules.country.warnings, embassy: rules.country.embassy }
        : null,
      ai: free,
      reportToken: premium ? seal(premium) : null,
      aiMode: ai ? "ai" : aiEnabled() ? "rules-fallback" : "rules-only",
      aiError,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
