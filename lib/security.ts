// Request hardening shared by every API route: method, content type, same-origin,
// body-size cap, and upload validation by magic bytes (never trust the declared type).

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...SECURITY_HEADERS, ...extra },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  // Never leak internals (stack traces, upstream messages) to the client.
  console.error("unhandled api error:", err instanceof Error ? err.name : typeof err);
  return json({ error: "Something went wrong. Please try again." }, 500);
}

function allowedOrigins(req: Request): Set<string> {
  const set = new Set<string>();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    set.add(`https://${host}`);
    set.add(`http://${host}`);
  }
  for (const o of (process.env.ALLOWED_ORIGINS ?? "").split(",")) if (o.trim()) set.add(o.trim().replace(/\/$/, ""));
  return set;
}

/**
 * Blocks cross-site POSTs (CSRF / other sites burning our AI budget). Browsers always
 * send Origin on cross-origin POSTs; same-origin fetches send it too in modern browsers.
 * Requests with no Origin (curl, server-to-server) are allowed only outside production.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_NO_ORIGIN !== "1") {
      throw new HttpError(403, "Forbidden");
    }
    return;
  }
  if (!allowedOrigins(req).has(origin)) throw new HttpError(403, "Forbidden");
}

/** Reads a JSON body with a hard byte cap, so a huge upload can't exhaust memory. */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") throw new HttpError(405, "Method not allowed");
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) throw new HttpError(415, "Content-Type must be application/json");
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "Request too large");
  if (!req.body) throw new HttpError(400, "Empty body");

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request too large");
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}

export type UploadType = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf";

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Detects the real file type from its first bytes. Returns null for anything we don't accept. */
export function sniffType(bytes: Uint8Array): UploadType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP") return "image/webp";
  if (b.length >= 6 && (String.fromCharCode(...b.subarray(0, 6)) === "GIF87a" || String.fromCharCode(...b.subarray(0, 6)) === "GIF89a")) return "image/gif";
  if (b.length >= 5 && String.fromCharCode(...b.subarray(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

/**
 * Validates an uploaded base64 document: well-formed base64, size within limit, and the
 * real bytes match the declared type. Rejects disguised files (e.g. an HTML or EXE renamed .jpg).
 */
export function validateUpload(declared: string, data: string, maxBytes: number): UploadType {
  if (data.length === 0 || data.length % 4 !== 0 || !BASE64_RE.test(data)) throw new HttpError(400, "File is not valid base64");
  const bytes = Buffer.from(data, "base64");
  if (bytes.byteLength > maxBytes) throw new HttpError(413, `File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`);
  const real = sniffType(bytes.subarray(0, 16));
  if (!real) throw new HttpError(415, "Only JPG, PNG, WebP, GIF or PDF files are accepted");
  if (real !== declared) throw new HttpError(415, "File content does not match its type");
  if (real === "application/pdf" && /\/(JavaScript|JS|Launch|EmbeddedFile)\b/.test(bytes.toString("latin1"))) {
    // Active PDF content is never needed for a job offer and is a common malware vector.
    throw new HttpError(415, "PDF contains active content and was rejected");
  }
  return real;
}

/** Trims and caps every string the AI returns, so a bad response can't flood the UI. */
export function clampText(s: string, max: number): string {
  const t = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Checks the real audio container from its bytes; rejects anything that isn't audio. */
export function sniffAudio(b: Uint8Array): boolean {
  const s = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length < 12) return false;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return true; // webm/matroska
  if (s(0, 4) === "OggS") return true;
  if (s(4, 8) === "ftyp") return true; // mp4/m4a
  if (s(0, 4) === "RIFF" && s(8, 12) === "WAVE") return true;
  if (s(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return true; // mp3/aac
  return false;
}

