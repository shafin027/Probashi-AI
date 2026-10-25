import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFacts } from "./extract.ts";

test("English offer letter", () => {
  const f = extractFacts("Position: Cleaner Monthly salary: SAR 1200\nRecruiting agent fee payable in Bangladesh: BDT 650,000");
  assert.deepEqual(f, { costBdt: 650000, salary: 1200, currency: "SAR" });
});

test("Bangla lakh/hazar and Bangla digits", () => {
  const f = extractFacts("বেতন: মাসে ১,৫০০ রিঙ্গিত। খরচ: ৪ লাখ ৫০ হাজার টাকা");
  assert.equal(f.costBdt, 450000);
  assert.equal(f.salary, 1500);
  assert.equal(f.currency, "MYR");
});

test("decimal lakh and taka suffix", () => {
  assert.equal(extractFacts("6.5 lakh").costBdt, 650000);
  assert.equal(extractFacts("pay 400000 taka now").costBdt, 400000);
});

test("nothing found returns empty", () => {
  assert.deepEqual(extractFacts("Hello, job offer letter"), {});
});
