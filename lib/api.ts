// Small helpers shared by the marketplace, cases and staff routes.

import type { z } from "zod";
import { assertSameOrigin, errorResponse, HttpError, readJson } from "./security.ts";
import { clientIp, rateLimit } from "./ratelimit.ts";

/** Same-origin check + size-capped JSON + strict schema, in one call. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T, maxBytes = 16 * 1024): Promise<z.infer<T>> {
  assertSameOrigin(req);
  const parsed = schema.safeParse(await readJson(req, maxBytes));
  if (!parsed.success) throw new HttpError(400, "Invalid request");
  return parsed.data;
}

export async function limit(req: Request, key: string, max: number, windowMs = 60 * 60 * 1000): Promise<void> {
  if (!(await rateLimit(`${key}:${clientIp(req)}`, max, windowMs))) throw new HttpError(429, "Too many requests. Please wait a while.");
}

/** Wraps a handler so every error becomes a safe JSON response. */
export function handle<A extends unknown[]>(fn: (req: Request, ...rest: A) => Promise<Response>) {
  return async (req: Request, ...rest: A): Promise<Response> => {
    try {
      return await fn(req, ...rest);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
