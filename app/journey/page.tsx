"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Elevator } from "@lucasmarkes/hairline/react";
import { useJourney } from "@/components/journey.tsx";
import { useFeatures } from "@/components/features.tsx";
import { LEVELS, levelFor, nextLevel, nextStep, PHASES, phaseScore, phaseUnlocked } from "@/lib/journey.ts";
import { HELPLINES } from "@/lib/data/countries.ts";

const VCARD = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Probash Bandhu Call Centre (16135)",
  "TEL;TYPE=work,voice:16135",
  "NOTE:Expatriates' Welfare Ministry helpline. Saved with Probashi AI.",
  "END:VCARD",
].join("\n");

export default function JourneyPage() {
  const { progress, points, complete } = useJourney();
  const { me, accounts } = useFeatures();
  const reduce = useReducedMotion();
  const level = levelFor(points);
  const upcoming = nextLevel(points);
  const step = nextStep(progress);
  const levelIndex = LEVELS.indexOf(level);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const helpLink = `https://wa.me/?text=${encodeURIComponent(`বিদেশে চাকরির অফার পেয়েছ? টাকা দেওয়ার আগে ফ্রি যাচাই করে নাও, ২০ সেকেন্ড লাগে: ${origin}/check`)}`;
  const quizLink = `https://wa.me/?text=${encodeURIComponent(`দালালের ফাঁদ চিনতে পারো? ২ মিনিটের কুইজটা খেলে দেখো: ${origin}/quiz`)}`;
  const shareText = `আমি Probashi AI-তে নিরাপদ বিদেশযাত্রার প্রস্তুতি নিচ্ছি: ${points}/100 (${level.bn})। তুমিও টাকা দেওয়ার আগে যাচাই করো: ${typeof window !== "undefined" ? window.location.origin : ""}/journey`;

  return (
    <div className="container section stack">
      <div className="journey-hero card">
        <div>
          <span className="badge">নিরাপদ যাত্রার প্রস্তুতি · Safe Migration Readiness</span>
          <h1 style={{ marginTop: 10 }}>
            {level.emoji} {level.bn}
            <span className="en" style={{ fontSize: "1rem" }}>{level.en}</span>
          </h1>
          <div className="row" style={{ gap: 18, alignItems: "center" }}>
            <div className="ring lg" data-score={points} role="img" aria-label={`Readiness ${points} of 100`} style={{ ["--v" as string]: Math.max(points, 2), ["--c" as string]: points >= 80 ? "var(--safe)" : "var(--primary)" }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="meter" aria-hidden>
                <motion.span initial={reduce ? false : { width: 0 }} animate={{ width: `${points}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
              </div>
              <p className="small muted" style={{ marginTop: 8 }}>
                {upcoming ? `আর ${upcoming.min - points} পয়েন্টে পরের ধাপ “${upcoming.bn}”। ${upcoming.min - points} points to “${upcoming.en}”.` : "সব ধাপ শেষ! You're fully prepared."}
              </p>
              <p className="small muted" style={{ margin: 0 }}>
                Points come only from steps that really protect you. Nothing here is for show.
              </p>
            </div>
          </div>
          {step && (
            <div className="next-step">
              <div>
                <div className="small muted">পরের সবচেয়ে জরুরি কাজ · Your next step</div>
                <strong>{step.bn}</strong> <span className="badge">+{step.points}</span>
                <div className="small muted">{step.why}</div>
              </div>
              {step.manual ? (
                <a className="btn" href={step.href} target={step.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{step.cta} ↗</a>
              ) : (
                <Link className="btn" href={step.href}>{step.cta} →</Link>
              )}
            </div>
          )}
        </div>
        <div className="hairline-wrap" aria-hidden>
          <Elevator intensity={0.55} play label="Elevator rising through four floors, like the four readiness levels" />
          <ol className="floors">
            {[...LEVELS].reverse().map((l, i) => (
              <li key={l.en} className={LEVELS.length - 1 - i <= levelIndex ? "reached" : ""}>{l.emoji} {l.bn}</li>
            ))}
          </ol>
        </div>
      </div>

      {PHASES.map((phase, pi) => {
        const unlocked = phaseUnlocked(progress, phase.id);
        const pts = phase.id === "before" ? points : phaseScore(progress, phase.id);
        return (
          <section key={phase.id} className={`phase ${unlocked ? "" : "locked"}`} aria-labelledby={`phase-${phase.id}`}>
            <div className="phase-head">
              <div>
                <span className="badge">ধাপ {pi + 1} / {PHASES.length}</span>
                <h2 id={`phase-${phase.id}`} style={{ margin: "6px 0 0" }}>
                  {phase.bn} <span className="muted small">· {phase.en}</span>
                </h2>
              </div>
              <div className="phase-meter">
                <div className="meter" aria-hidden><span style={{ width: `${pts}%` }} /></div>
                <span className="small muted">{pts}/100</span>
              </div>
            </div>
            {!unlocked ? (
              <div className="card phase-lock">
                <span aria-hidden style={{ fontSize: "1.6rem" }}>🔒</span>
                <div>
                  <strong>“{levelFor(phase.unlockAt).bn}” হলে খুলবে</strong>
                  <div className="small muted">
                    Unlocks at {phase.unlockAt} readiness: first protect yourself before you pay. আরও {phase.unlockAt - points} পয়েন্ট বাকি।
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-2">
                {phase.milestones.map((m, i) => {
                  const done = progress.done.includes(m.id);
                  const share = m.id === "helped_someone" ? helpLink : m.id === "shared_quiz" ? quizLink : null;
                  return (
                    <motion.div
                      key={m.id}
                      className={`card milestone ${done ? "done" : ""}`}
                      initial={reduce ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="milestone-check" aria-hidden>{done ? "✓" : i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                          <strong>{m.bn}</strong>
                          <span className="badge">{done ? (m.manual ? "সম্পন্ন (নিজে জানানো)" : "সম্পন্ন") : `+${m.points}`}</span>
                        </div>
                        <div className="small">{m.en}{m.manual && <span className="self-reported"> · self-reported</span>}</div>
                        <div className="small muted">{m.why}</div>
                        {!done && (
                          <div className="row" style={{ marginTop: 10, gap: 8 }}>
                            {share ? (
                              <a className="btn btn-sm" href={share} target="_blank" rel="noreferrer" onClick={() => complete(m.id)}>
                                WhatsApp-এ পাঠান · Share
                              </a>
                            ) : m.manual ? (
                              <>
                                <a className="btn btn-ghost btn-sm" href={m.href} target={m.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{m.cta}</a>
                                <button className="btn btn-sm" type="button" onClick={() => complete(m.id)}>✓ আমি করেছি</button>
                              </>
                            ) : (
                              <Link className="btn btn-ghost btn-sm" href={m.href}>{m.cta} →</Link>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <div className="card" id="emergency">
        <h3>📞 জরুরি নম্বর · Emergency numbers</h3>
        <p className="small muted">Save these on your phone before you travel, and share them with your family.</p>
        <ul>
          {HELPLINES.map((h) => (
            <li key={h.name}>
              {h.name}: <strong>{h.number}</strong>
            </li>
          ))}
        </ul>
        <div className="row">
          <a className="btn btn-ghost" download="probash-bandhu-16135.vcf" href={`data:text/vcard;charset=utf-8,${encodeURIComponent(VCARD)}`} onClick={() => complete("emergency_saved")}>
            📇 ফোনে সেভ করুন (contact card)
          </a>
          <a className="btn btn-ghost" href="tel:16135">📞 16135</a>
        </div>
      </div>

      <div className="card row" style={{ justifyContent: "space-between" }}>
        <div>
          <strong>পরিবারকে জানান · Show your family</strong>
          <div className="small muted">Going abroad is a family decision. Share your readiness, not your documents.</div>
        </div>
        <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>WhatsApp-এ পাঠান</a>
      </div>

      {accounts && !me && (
        <p className="small muted">
          Progress is saved on this phone. <Link href="/login">Log in</Link> to keep it safe across devices.
        </p>
      )}
    </div>
  );
}
