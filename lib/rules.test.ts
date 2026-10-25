import { test } from "node:test";
import assert from "node:assert/strict";
import { analyseOffer } from "./rules.ts";
import { lookupAgency, showSponsoredBadge } from "./data/agencies.ts";

test("clean offer through a valid agency is safe", () => {
  const r = analyseOffer({
    countryCode: "MY",
    agencyQuery: "RL-1001",
    salaryLocal: 1800,
    askedCostBdt: 80000,
    visaType: "work",
    paidTo: "agency",
    receipt: true,
    bmetClearance: true,
    foundVia: "agency",
  });
  assert.equal(r.verdict, "safe");
  assert.equal(r.flags.length, 0);
});

test("free visa with a dalal is dangerous", () => {
  const r = analyseOffer({ countryCode: "SA", offerText: "Saudi free visa, pay 6 lakh advance", paidTo: "individual" });
  assert.equal(r.verdict, "danger");
  const ids = r.flags.map((f) => f.id);
  assert.ok(ids.includes("free-visa"));
  assert.ok(ids.includes("paid-individual"));
  assert.ok(ids.includes("advance"));
});

test("overcharge ratio and repayment months are computed", () => {
  const r = analyseOffer({ countryCode: "MY", agencyQuery: "RL-1001", askedCostBdt: 450000, salaryLocal: 1700 });
  assert.ok(r.cost.overchargeRatio! > 5);
  assert.ok(r.cost.monthsToRepay! > 10);
  assert.ok(r.flags.some((f) => f.id === "overcharge" && f.severity === "high"));
});

test("below minimum wage is flagged", () => {
  const r = analyseOffer({ countryCode: "MY", agencyQuery: "RL-1001", salaryLocal: 1200 });
  assert.ok(r.flags.some((f) => f.id === "below-min-wage"));
});

test("cancelled licence is high severity", () => {
  const r = analyseOffer({ countryCode: "QA", agencyQuery: "rl 1004" });
  assert.ok(r.flags.some((f) => f.id === "agency-licence" && f.severity === "high"));
});

test("bangla digits resolve RL numbers", () => {
  assert.equal(lookupAgency("আরএল ১০০২")?.rl, "RL-1002");
});

test("sponsored badge is removed when complaints exceed the limit", () => {
  const a = lookupAgency("RL-1001")!;
  assert.equal(showSponsoredBadge(a), true);
  assert.equal(showSponsoredBadge({ ...a, verifiedComplaints: 9 }), false);
});

test("russia offers are high risk", () => {
  const r = analyseOffer({ countryCode: "RO", destinationText: "Russia security guard job" });
  assert.ok(r.flags.some((f) => f.id === "risk-destination"));
});
