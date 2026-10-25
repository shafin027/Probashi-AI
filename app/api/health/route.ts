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
  });
}
