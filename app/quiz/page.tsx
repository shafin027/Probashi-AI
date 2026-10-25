"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loupe } from "@lucasmarkes/hairline/react";
import { pickRound, ROUND_SIZE, type QuizLevel, type Scenario } from "@/lib/quiz.ts";
import { track, useJourney } from "@/components/journey.tsx";

export default function QuizPage() {
  const { progress, setQuizBest, complete } = useJourney();
  const [level, setLevel] = useState<QuizLevel>("easy");
  const reduce = useReducedMotion();
  const [round, setRound] = useState<Scenario[]>([]);
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    // Flow channel: users pick their own challenge (?level=hard links straight to the hard round).
    const initial: QuizLevel = new URLSearchParams(window.location.search).get("level") === "hard" ? "hard" : "easy";
    setLevel(initial);
    setRound(pickRound(Math.random(), initial));
  }, []);

  const current = round[i];
  const finished = round.length > 0 && i >= round.length;
  const pct = Math.round((correct / ROUND_SIZE) * 100);

  useEffect(() => {
    if (!finished) return;
    track(`quiz_round:${level}`);
    if (pct >= 80) track(`quiz_pass:${level}`);
    if (level === "easy") setQuizBest(pct);
    else if (pct >= 80) complete("quiz_hard");
  }, [finished, pct, level, setQuizBest, complete]);

  function choose(scam: boolean) {
    if (answer !== null || !current) return;
    setAnswer(scam);
    if (scam === current.scam) setCorrect((c) => c + 1);
  }

  function next() {
    setAnswer(null);
    setI((x) => x + 1);
  }

  function restart(next: QuizLevel = level) {
    setLevel(next);
    setRound(pickRound(Math.random(), next));
    setI(0);
    setCorrect(0);
    setAnswer(null);
  }

  const right = current && answer !== null && answer === current.scam;

  return (
    <div className="container section" style={{ maxWidth: 820 }}>
      <div className="quiz-head">
        <div>
          <span className="badge">প্রতারণা চিনুন · Scam spotter</span>
          <h1 style={{ marginTop: 10 }}>আপনি কি দালালের ফাঁদ চিনতে পারবেন?</h1>
          <p className="muted">{ROUND_SIZE} real situations, taken from reported cases. Score 80% or more to earn the Scam Spotter step. Best so far: {progress.quizBest}%.</p>
          <div className="choice-row" role="group" aria-label="Difficulty">
            <button type="button" className="choice" aria-pressed={level === "easy"} onClick={() => restart("easy")}>সহজ · Standard</button>
            <button type="button" className="choice" aria-pressed={level === "hard"} onClick={() => restart("hard")}>কঠিন · Hard (subtle traps)</button>
          </div>
        </div>
        <div className="quiz-figure" aria-hidden>
          <Loupe intensity={0.6} play label="A magnifying loupe passing over a page" />
        </div>
      </div>

      {current && !finished && (
        <>
          <div className="quiz-progress" role="progressbar" aria-valuemin={0} aria-valuemax={ROUND_SIZE} aria-valuenow={i + 1} aria-label="Question">
            {round.map((_, k) => (
              <span key={k} className={k < i ? "done" : k === i ? "now" : ""} />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              className="card quiz-card"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="small muted">প্রশ্ন {i + 1} / {ROUND_SIZE}</div>
              <p className="quiz-q">{current.bn}</p>
              <p className="muted small">{current.en}</p>
              <div className="quiz-actions">
                <button type="button" className={`quiz-btn scam ${answer === true ? "picked" : ""}`} onClick={() => choose(true)} disabled={answer !== null}>
                  🚩 প্রতারণা <span>Scam</span>
                </button>
                <button type="button" className={`quiz-btn safe ${answer === false ? "picked" : ""}`} onClick={() => choose(false)} disabled={answer !== null}>
                  ✅ নিরাপদ <span>Looks safe</span>
                </button>
              </div>
              {answer !== null && (
                <motion.div
                  className={`verdict ${right ? "verdict-safe" : "verdict-danger"}`}
                  style={{ marginTop: 16 }}
                  role="status"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <strong>{right ? "ঠিক! Correct." : "ভুল হয়েছে, ঠিক আছে, এখনই শিখে নিন."}</strong>
                  <p style={{ margin: "6px 0" }}>{current.whyBn}</p>
                  <p className="small muted" style={{ margin: 0 }}>{current.whyEn}</p>
                  <button className="btn" type="button" style={{ marginTop: 12 }} onClick={next} autoFocus>
                    {i + 1 < ROUND_SIZE ? "পরের প্রশ্ন →" : "ফলাফল দেখুন →"}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {finished && (
        <motion.div className="card center" initial={reduce ? false : { opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <div style={{ fontSize: "3rem" }} aria-hidden>{pct === 100 ? "🏆" : pct >= 80 ? "🏅" : "📚"}</div>
          <h2>{correct}/{ROUND_SIZE} সঠিক · {pct}%</h2>
          <p className="muted">
            {pct >= 80
              ? level === "hard"
                ? "অসাধারণ! আপনি সূক্ষ্ম ফাঁদও ধরতে পারেন। Hard round passed."
                : "দারুণ! আপনি প্রতারণা চিনতে পারেন। Scam Spotter step earned."
              : "আরেকবার চেষ্টা করুন। প্রতিবার নতুন পরিস্থিতি আসে। Try again: every round is different."}
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            {pct >= 80 && level === "easy" ? (
              <button className="btn" type="button" onClick={() => restart("hard")}>কঠিন রাউন্ডে যান · Try the hard round →</button>
            ) : (
              <button className="btn" type="button" onClick={() => restart()}>আবার খেলুন · New round</button>
            )}
            <a
              className="btn btn-ghost"
              target="_blank"
              rel="noreferrer"
              onClick={() => complete("shared_quiz")}
              href={`https://wa.me/?text=${encodeURIComponent(`আমি দালালের ফাঁদ চেনার কুইজে ${pct}% পেয়েছি। তুমি কত পাও দেখো, টাকা দেওয়ার আগে: ${typeof window !== "undefined" ? window.location.origin : ""}/quiz`)}`}
            >
              পরিবারকে খেলতে দিন · Share with family
            </a>
            <Link className="btn btn-ghost" href="/journey">আমার প্রস্তুতি →</Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
