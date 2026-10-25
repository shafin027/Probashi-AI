// Rate limiting and an AI spend cap. On Vercel, serverless instances don't share memory,
// so set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for limits that hold across
// instances. Without them we fall back to per-instance memory (fine for local and demos).

const buckets = new Map<string, { count: number; resetAt: number }>();

function memoryHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

async function redisHit(key: string, limit: number, windowMs: number): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", `rl:${key}`],
        ["PEXPIRE", `rl:${key}`, String(windowMs), "NX"],
      ]),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown }[];
    const count = Number(data[0]?.result);
    return Number.isFinite(count) ? count <= limit : null;
  } catch {
    return null; // fail open to memory limiter rather than taking the site down
  }
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const remote = await redisHit(key, limit, windowMs);
  return remote ?? memoryHit(key, limit, windowMs);
}

/** Global daily cap on AI calls, so a botnet can't run up an unlimited bill. */
export async function withinDailyAiBudget(): Promise<boolean> {
  const limit = Number(process.env.AI_DAILY_LIMIT ?? "2000");
  const day = new Date().toISOString().slice(0, 10);
  return rateLimit(`ai-budget:${day}`, limit, 26 * 60 * 60 * 1000);
}

export function clientIp(req: Request): string {
  // Vercel sets x-real-ip / x-forwarded-for from the true client address.
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
