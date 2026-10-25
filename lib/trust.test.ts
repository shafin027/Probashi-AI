import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTrust } from "./trust.ts";
import { checkAgencyOffer, scrubPersonalData } from "./marketplace.ts";
import { tierFor, referralPack } from "./cases.ts";
import { callerFromSip } from "./phone.ts";
import { pinProblem } from "./auth.ts";

const base = { licenceStatus: "active" as const, validUntil: "2028-01-01", platformVerified: true, reviews: [], substantiatedCases: 0, blockedOffers: 0, today: new Date("2026-10-25") };

test("no active licence means danger, whatever the reviews say", () => {
  const t = computeTrust({ ...base, licenceStatus: "cancelled", reviews: Array(20).fill({ rating: 5, promiseKept: true }) });
  assert.equal(t.level, "danger");
  assert.ok(t.score <= 10);
  assert.equal(computeTrust({ ...base, licenceStatus: null }).score, 0);
});

test("one review can't swing the score much (Bayesian prior)", () => {
  const none = computeTrust(base).score;
  const oneBad = computeTrust({ ...base, reviews: [{ rating: 1, promiseKept: false }] }).score;
  const manyBad = computeTrust({ ...base, reviews: Array(30).fill({ rating: 1, promiseKept: false }) }).score;
  assert.ok(none - oneBad <= 12, `${none} -> ${oneBad}`);
  assert.ok(manyBad < 40, `many bad reviews -> ${manyBad}`);
  const manyGood = computeTrust({ ...base, reviews: Array(30).fill({ rating: 5, promiseKept: true }) });
  assert.equal(manyGood.level, "high");
});

test("substantiated complaints and blocked offers lower the score, with reasons", () => {
  const t = computeTrust({ ...base, substantiatedCases: 3, blockedOffers: 2 });
  assert.ok(t.score < computeTrust(base).score - 30);
  assert.ok(t.reasons.some((r) => r.en.includes("substantiated")));
  assert.ok(t.reasons.some((r) => r.en.includes("blocked")));
});

test("agency offers above the government ceiling or with free visas are blocked", () => {
  const agency = { rl: "RL-1001", name: "Shapla", district: "Dhaka", licenceStatus: "valid" as const, verifiedComplaints: 0, placementsLastYear: 0, sponsored: false };
  const ok = checkAgencyOffer({ countryCode: "SA", jobTitle: "Cleaner", employer: "Al Noor Co", salaryLocal: 1200, totalCostBdt: 160000, contractMonths: 24, seats: 5, details: "Food and housing provided" }, agency);
  assert.equal(ok.allowed, true, JSON.stringify(ok.reasons));
  const pricey = checkAgencyOffer({ countryCode: "SA", jobTitle: "Cleaner", employer: "Al Noor Co", salaryLocal: 1200, totalCostBdt: 450000, contractMonths: 24, seats: 5, details: "" }, agency);
  assert.equal(pricey.allowed, false);
  assert.ok(pricey.reasons.some((r) => r.en.includes("government ceiling")));
  const free = checkAgencyOffer({ countryCode: "SA", jobTitle: "Cleaner", employer: "Al Noor Co", salaryLocal: 1200, totalCostBdt: 100000, contractMonths: 24, seats: 5, details: "azad visa available" }, agency);
  assert.equal(free.allowed, false);
  const lapsed = checkAgencyOffer({ countryCode: "SA", jobTitle: "Cleaner", employer: "Al Noor Co", salaryLocal: 1200, totalCostBdt: 100000, contractMonths: 24, seats: 5, details: "" }, { ...agency, licenceStatus: "expired" });
  assert.equal(lapsed.allowed, false);
});

test("personal data is scrubbed from public text", () => {
  const s = scrubPersonalData("Call me on 01712-345678 or +8801812345678, mail a@b.com, passport AB1234567, NID 1990123456789");
  assert.ok(!/\d{6}/.test(s), s);
  assert.ok(!s.includes("a@b.com"));
});

test("emergencies always get a caseworker; other free reports get self-help", () => {
  const free = { role: "worker" as const, premium_until: null };
  assert.equal(tierFor(free, "trafficking", false), "legal_aid");
  assert.equal(tierFor(free, "overcharge", true), "legal_aid");
  assert.equal(tierFor(free, "overcharge", false), "self_help");
  assert.equal(tierFor({ role: "worker", premium_until: new Date(Date.now() + 86400000) }, "overcharge", false), "legal_aid");
  assert.ok(referralPack("trafficking", "abroad").some((r) => r.contact === "+8809610102030"));
  assert.ok(referralPack("overcharge", "bangladesh").some((r) => r.contact === "16135"));
});

test("caller number comes from SIP headers; PINs must not be trivial", () => {
  assert.equal(callerFromSip([{ name: "From", value: '"Rahim" <sip:+8801712345678@pstn.twilio.com>;tag=1' }]), "8801712345678");
  assert.equal(callerFromSip([{ name: "P-Asserted-Identity", value: "<tel:+8801812345678>" }, { name: "From", value: "<sip:anonymous@x>" }]), "8801812345678");
  assert.equal(callerFromSip([{ name: "From", value: "<sip:anonymous@invalid>" }]), null);
  assert.equal(pinProblem("1234"), "Choose a PIN that isn't a simple pattern");
  assert.equal(pinProblem("0000"), "Choose a PIN that isn't a simple pattern");
  assert.equal(pinProblem("12a4"), "PIN must be 4 to 6 digits");
  assert.equal(pinProblem("4827"), null);
});
