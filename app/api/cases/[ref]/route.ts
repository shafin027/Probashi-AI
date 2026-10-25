import { z } from "zod";
import { handle, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { getCase, workerMessage } from "@/lib/cases.ts";
import { HttpError, json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ ref: string }> };
const refOf = async (ctx: Ctx) => {
  const ref = (await ctx.params).ref;
  if (!/^PA-\d{4}-[A-Z0-9]{5}$/.test(ref)) throw new HttpError(404, "Case not found");
  return ref;
};

/** The reporter (or staff) sees the case and its timeline; workers never see internal notes. */
export const GET = handle(async (req, ctx: Ctx) => {
  const user = await requireUser(req);
  return json(await getCase(user, await refOf(ctx)));
});

export const POST = handle(async (req, ctx: Ctx) => {
  const user = await requireUser(req);
  const { message } = await parseBody(req, z.object({ message: z.string().max(4000) }).strict());
  await workerMessage(user, await refOf(ctx), message);
  return json({ ok: true }, 201);
});
