import { timingSafeEqual } from "node:crypto";
import { reverifyAll } from "@/lib/marketplace.ts";
import { errorResponse, HttpError, json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Daily (vercel.json cron): re-check every agency's licence; lapsed licences pause offers. */
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const got = Buffer.from(req.headers.get("authorization") ?? "");
    const want = Buffer.from(`Bearer ${secret}`);
    if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) throw new HttpError(401, "Unauthorized");
    return json(await reverifyAll());
  } catch (err) {
    return errorResponse(err);
  }
}
