import { z } from "zod";
import { handle, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { staffUpdate, STATUSES } from "@/lib/cases.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";

const Body = z
  .object({
    status: z.enum(STATUSES).optional(),
    assignToMe: z.boolean().optional(),
    substantiated: z.boolean().optional(),
    message: z.string().max(4000).optional(),
    note: z.string().max(4000).optional(),
  })
  .strict();

export const PATCH = handle(async (req, { params }: { params: Promise<{ ref: string }> }) => {
  const staff = await requireUser(req, ["legal", "admin"]);
  await staffUpdate(staff, (await params).ref, await parseBody(req, Body));
  return json({ ok: true });
});
