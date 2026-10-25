import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_POINTS, levelFor, mergeProgress, nextStep, sanitiseProgress, score } from "./journey.ts";
import { pickRound, ROUND_SIZE } from "./quiz.ts";

test("milestones add up to 100", () => assert.equal(MAX_POINTS, 100));

test("score and levels", () => {
  const p = sanitiseProgress({ done: ["checked_offer", "verified_agency", "true_cost"] });
  assert.equal(score(p), 35);
  assert.equal(levelFor(35).en, "Aware");
  assert.equal(levelFor(100).en, "Safe migrant");
  assert.equal(nextStep(p)?.id, "quiz_passed");
});

test("sanitise drops unknown ids, duplicates and bad numbers", () => {
  const p = sanitiseProgress({ done: ["checked_offer", "checked_offer", "hack", 5], quizBest: 999, updatedAt: "x" });
  assert.deepEqual(p.done, ["checked_offer"]);
  assert.equal(p.quizBest, 100);
  assert.equal(p.updatedAt, 0);
});

test("merge never loses progress", () => {
  const m = mergeProgress(sanitiseProgress({ done: ["checked_offer"], quizBest: 50 }), sanitiseProgress({ done: ["true_cost"], quizBest: 83 }));
  assert.deepEqual(m.done.sort(), ["checked_offer", "true_cost"]);
  assert.equal(m.quizBest, 83);
});

test("quiz rounds vary and always include a safe example", () => {
  const a = pickRound(0.1).map((s) => s.id).join();
  const b = pickRound(0.7).map((s) => s.id).join();
  assert.notEqual(a, b);
  for (const seed of [0.01, 0.2, 0.33, 0.5, 0.9]) {
    const r = pickRound(seed);
    assert.equal(r.length, ROUND_SIZE);
    assert.ok(r.some((s) => !s.scam));
    assert.equal(new Set(r.map((s) => s.id)).size, ROUND_SIZE);
  }
});
