import { z } from "zod";
import { handle, parseBody } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { reverifyAll } from "@/lib/marketplace.ts";
import { importRegistry } from "@/lib/registry.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Admin uploads the latest official list (CSV export of raims.oep.gov.bd/agencies). */
export const POST = handle(async (req) => {
  await requireUser(req, ["admin"]);
  const { csv, source } = await parseBody(req, z.object({ csv: z.string().min(10).max(4_000_000), source: z.string().min(3).max(200) }).strict(), 4_200_000);
  const report = await importRegistry(csv, source);
  const reverify = report.imported ? await reverifyAll() : null;
  return json({ report: { imported: report.imported, skipped: report.skipped.slice(0, 50), skippedCount: report.skipped.length }, reverify });
});
