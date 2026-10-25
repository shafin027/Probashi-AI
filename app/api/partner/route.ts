import { handle } from "@/lib/api.ts";
import { requireUser } from "@/lib/auth.ts";
import { agencyDashboard } from "@/lib/marketplace.ts";
import { json } from "@/lib/security.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const user = await requireUser(req, ["agency"]);
  return json(await agencyDashboard(user));
});
