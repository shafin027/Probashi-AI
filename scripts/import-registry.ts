// Imports the official recruiting-agency licence list into the database, then re-checks
// every registered agency against it (lapsed licences pause their offers).
//
//   1. Export the list from BMET RAIMS (raims.oep.gov.bd/agencies) as CSV, with at least
//      the columns: RL No, Agency Name, Status (and ideally Valid Until, Address, Phone).
//   2. DATABASE_URL=postgres://... node --experimental-strip-types scripts/import-registry.ts list.csv "RAIMS export 2026-10-25"
//
// Admins can also upload the CSV from the API (POST /api/admin/registry).

import { readFileSync } from "node:fs";
import { importRegistry } from "../lib/registry.ts";
import { reverifyAll } from "../lib/marketplace.ts";

const [file, source] = process.argv.slice(2);
if (!file || !source) {
  console.error('usage: node --experimental-strip-types scripts/import-registry.ts <file.csv> "<source description>"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const report = await importRegistry(readFileSync(file, "utf8"), source);
console.log(`imported ${report.imported} agencies, skipped ${report.skipped.length}`);
for (const s of report.skipped.slice(0, 20)) console.log(`  line ${s.line}: ${s.reason}`);
if (report.imported) console.log("re-verified:", await reverifyAll());
process.exit(0);
