import { timingSafeEqual } from "node:crypto";
import { aiEnabled, providers } from "@/lib/ai.ts";
import { openaiEnabled } from "@/lib/openai.ts";
import { getDb } from "@/lib/db.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(req: Request): boolean {
  const expected = process.env.HEALTH_TOKEN ?? "";
  const got = req.headers.get("x-health-token") ?? "";
  if (expected.length < 16 || got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/**
 * Gamification objective (docs/gamification-design.md): of people who check an offer, how many also
 * verify the agency and learn the official cost, the two actions that most often stop an overcharge.
 */
async function funnel() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.query<{ key: string; value: string | number }>("SELECT key, value FROM stats WHERE key LIKE 'ev:%' OR key = 'offers_checked'");
  const get = (k: string) => Number(rows.find((r) => r.key === k)?.value ?? 0);
  const checked = get("ev:milestone:checked_offer");
  const ratio = (n: number) => (checked ? Math.round((n / checked) * 1000) / 10 : null);
  return {
    offersChecked: get("offers_checked"),
    firstChecks: checked,
    verifiedAgencyPct: ratio(get("ev:milestone:verified_agency")),
    knowsTrueCostPct: ratio(get("ev:milestone:true_cost")),
    reachedPreparedPct: ratio(get("ev:level:prepared")),
    quizPassEasy: get("ev:quiz_pass:easy"),
    quizPassHard: get("ev:quiz_pass:hard"),
    helpedSomeone: get("ev:milestone:helped_someone"),
    events: Object.fromEntries(rows.filter((r) => r.key.startsWith("ev:")).map((r) => [r.key.slice(3), Number(r.value)])),
  };
}

// Deployment check. Public callers learn only that the site is up; the detailed
// configuration report needs the HEALTH_TOKEN header and never includes secret values.
export async function GET(req: Request) {
  if (!authorised(req)) return json({ ok: true });
  return json({
    ok: true,
    ai: aiEnabled(),
    providers: providers(),
    voice: openaiEnabled(),
    database: Boolean(await getDb()),
    reportSecret: (process.env.REPORT_SECRET ?? "").length >= 32,
    sharedRateLimit: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    paymentMode: process.env.PAYMENT_MODE ?? "demo",
    funnel: await funnel(),
  });
}
