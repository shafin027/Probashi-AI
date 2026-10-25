import { z } from "zod";
import { handle, limit, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { writeReview } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

const Body = z
  .object({
    agencyId: z.uuid(),
    rating: z.number().int().min(1).max(5),
    promiseKept: z.boolean(),
    costPaidBdt: z.number().int().nonnegative().max(5_000_000).nullable(),
    body: z.string().max(1500),
  })
  .strict();

export const POST = handle(async (req) => {
  const user = await requireUser(req, ["worker"]);
  await limit(req, "review", 20);
  return json(await writeReview(user, await parseBody(req, Body)), 201);
});
