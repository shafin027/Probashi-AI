import { after } from "next/server";
import { acceptConfig, callerFromSip, callerHash, lookupCaller, phoneLineEnabled, realtimeClient, recordCallStart, runSideband, type CallState } from "@/lib/phone.ts";
import { rateLimit } from "@/lib/ratelimit.ts";
import { errorResponse, HttpError, json } from "@/lib/security.ts";

export const runtime = "nodejs";
// The sideband connection lives as long as the call. Vercel Pro with Fluid compute allows 800 s.
export const maxDuration = 800;

const MAX_BODY = 64 * 1024;

/**
 * OpenAI Realtime SIP webhook (`realtime.call.incoming`). Authenticated by its signature
 * (OPENAI_WEBHOOK_SECRET), not by origin: this endpoint is server-to-server.
 */
export async function POST(req: Request) {
  try {
    if (!phoneLineEnabled()) throw new HttpError(503, "Phone line is not enabled");
    if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY) throw new HttpError(413, "Too large");
    const raw = await req.text();
    if (raw.length > MAX_BODY) throw new HttpError(413, "Too large");
    let event;
    try {
      event = await realtimeClient().webhooks.unwrap(raw, req.headers);
    } catch {
      throw new HttpError(401, "Invalid signature");
    }
    if (event.type !== "realtime.call.incoming") return json({ ok: true, ignored: event.type });

    const { call_id: callId, sip_headers: sipHeaders } = event.data;
    const caller = callerFromSip(sipHeaders ?? []);
    const calls = realtimeClient().realtime.calls;
    if (!(await rateLimit(`phone-calls:${callerHash(caller ?? "unknown")}`, 8, 60 * 60 * 1000))) {
      await calls.reject(callId, { status_code: 486 }).catch(() => {});
      return json({ ok: true, rejected: "rate_limited" });
    }
    if (!(await rateLimit("phone-calls:all", Number(process.env.PHONE_MAX_CALLS_PER_HOUR ?? 120), 60 * 60 * 1000))) {
      await calls.reject(callId, { status_code: 503 }).catch(() => {});
      return json({ ok: true, rejected: "busy" });
    }

    const knownNumber = await lookupCaller(caller);
    await calls.accept(callId, acceptConfig(knownNumber));
    await recordCallStart(callId, caller);
    const state: CallState = { callId, callerNumber: caller, knownUser: knownNumber, user: null, failures: 0, transcript: [], tools: [], hangup: false, transferTo: null, instructionsUpdate: null };
    after(() => runSideband(state));
    return json({ ok: true, accepted: callId });
  } catch (err) {
    return errorResponse(err);
  }
}
