import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, effectiveStatus, nameSimilarity, normaliseName, normaliseRl, parseCsv, rowsFromCsv, type RegistryRow } from "./registry.ts";

const row = (over: Partial<RegistryRow> = {}): RegistryRow => ({
  rl_number: "RL-1234",
  name: "M/S. Shapla Overseas Ltd.",
  status: "active",
  valid_until: "2027-06-30",
  address: "Dhaka",
  phone: "01711000000",
  source: "test",
  imported_at: "2026-10-01",
  ...over,
});

test("RL numbers normalise from Bangla digits, spaces and leading zeros", () => {
  assert.equal(normaliseRl("rl 01234"), "RL-1234");
  assert.equal(normaliseRl("আরএল-১২৩৪"), "RL-1234");
  assert.equal(normaliseRl("no digits"), "");
  assert.equal(normaliseRl("12345678"), "", "too long to be an RL number");
});

test("names drop legal suffixes and punctuation; similarity tolerates typos", () => {
  assert.equal(normaliseName("M/S. Shapla Overseas Ltd."), "shapla overseas");
  assert.equal(nameSimilarity("Shapla Overseas", "M/S Shapla Overseas Limited"), 1);
  assert.ok(nameSimilarity("Shapla Oversea", "Shapla Overseas") > 0.82);
  assert.ok(nameSimilarity("Meghna Manpower", "Shapla Overseas") < 0.5);
  assert.ok(normaliseName("শাপলা ওভারসীজ").includes("শাপলা"), "keeps Bangla vowel signs");
});

test("an active licence past its validity date counts as expired", () => {
  const today = new Date("2026-10-25T00:00:00Z");
  assert.equal(effectiveStatus(row(), today), "active");
  assert.equal(effectiveStatus(row({ valid_until: "2025-12-31" }), today), "expired");
  assert.equal(effectiveStatus(row({ status: "suspended" }), today), "suspended");
});

test("verification decision: verified, name mismatch, inactive, not found", () => {
  const today = new Date("2026-10-25T00:00:00Z");
  assert.equal(decide("RL-1234", "Shapla Overseas", row(), today).outcome, "verified");
  assert.equal(decide("RL-1234", "Totally Different Agency", row(), today).outcome, "name_mismatch");
  assert.equal(decide("RL-1234", "Shapla Overseas", row({ status: "cancelled" }), today).outcome, "inactive");
  assert.equal(decide("RL-1234", "Shapla Overseas", row({ valid_until: "2026-01-01" }), today).outcome, "inactive");
  assert.equal(decide("RL-9999", "Shapla Overseas", null, today).outcome, "not_found");
});

test("CSV parser handles quotes, commas, CRLF and a BOM", () => {
  assert.deepEqual(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\r\n'), [["a", "b, c", 'say "hi"'], ["1", "2", "3"]]);
  const csv = "﻿RL No,Agency Name,License Status,Valid Until,Address,Mobile\nRL 0101,\"Padma, HR Ltd\",Active,31/12/2027,\"Sylhet\",01811000000\n102,Meghna Manpower,Cancelled,,Cumilla,\nxx,No RL,Active,,,\n103,Dup,Unknown,,,\n";
  const { rows, report } = rowsFromCsv(csv);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { rl_number: "RL-101", name: "Padma, HR Ltd", status: "active", valid_until: "2027-12-31", address: "Sylhet", phone: "01811000000" });
  assert.equal(rows[1].status, "cancelled");
  assert.deepEqual(report.skipped.map((s) => s.reason), ["Invalid RL number", "Unknown status"]);
});

test("CSV without the required columns is rejected", () => {
  const { rows, report } = rowsFromCsv("foo,bar\n1,2\n");
  assert.equal(rows.length, 0);
  assert.match(report.skipped[0].reason, /Header must include/);
});
