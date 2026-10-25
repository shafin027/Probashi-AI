// Sealed premium report. The paid part of a report is encrypted (AES-256-GCM) before it
// leaves the server, so the browser holds only an opaque token until payment is verified.
// Tampered or expired tokens fail authentication and are rejected.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const TTL_MS = 24 * 60 * 60 * 1000;
let warned = false;

function key(): Buffer {
  const secret = process.env.REPORT_SECRET;
  if (secret && secret.length >= 32) return createHash("sha256").update(secret).digest();
  if (process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn("REPORT_SECRET is missing or shorter than 32 chars. Set it in the deployment environment.");
  }
  // Fallback keeps local dev and demos working; deterministic per deployment config.
  return createHash("sha256").update(`probashi-dev:${process.env.ANTHROPIC_API_KEY ?? "no-key"}`).digest();
}

export function seal(payload: unknown, now = Date.now()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.from(JSON.stringify({ exp: now + TTL_MS, payload }), "utf8");
  const enc = Buffer.concat([cipher.update(body), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function unseal<T>(token: string, now = Date.now()): T | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const dec = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
    const { exp, payload } = JSON.parse(dec.toString("utf8")) as { exp: number; payload: T };
    if (typeof exp !== "number" || exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
