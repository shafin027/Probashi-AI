"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Padlock, Vault } from "@lucasmarkes/hairline/react";
import { useJourney } from "./journey.tsx";
import { levelFor, nextStep } from "@/lib/journey.ts";

/**
 * Slide-up on first view (Motion skill timing: 0.6s, [0.22,1,0.36,1], once). Content is never hidden:
 * only position animates, so jumping past a section, printing or a screenshot still shows everything.
 */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y: 22 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Real usage counters only. Renders nothing until there is real data. */
export function LiveStats() {
  const [s, setS] = useState<{ offersChecked: number | null; dangersFlagged: number | null } | null>(null);
  useEffect(() => {
    fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => {});
  }, []);
  if (!s || !s.offersChecked) return null;
  return (
    <div className="live-stats" aria-live="polite">
      <span className="pulse-dot" aria-hidden />
      <span>
        <strong>{s.offersChecked.toLocaleString("bn-BD")}</strong> টি অফার যাচাই হয়েছে, এর মধ্যে <strong>{(s.dangersFlagged ?? 0).toLocaleString("bn-BD")}</strong> টিতে বিপদ ধরা পড়েছে
        <span className="small muted"> · live count, not a marketing number</span>
      </span>
    </div>
  );
}

export function JourneyTeaser() {
  const { progress, points, ready } = useJourney();
  if (!ready) return null;
  const level = levelFor(points);
  const step = nextStep(progress);
  return (
    <Reveal>
      <div className="card journey-teaser">
        <div className="ring" data-score={points} role="img" aria-label={`Your readiness ${points} of 100`} style={{ ["--v" as string]: Math.max(points, 2), ["--c" as string]: points >= 80 ? "var(--safe)" : "var(--primary)" }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="small muted">আপনার নিরাপদ যাত্রার প্রস্তুতি · Your safety readiness</div>
          <h3 style={{ margin: "2px 0" }}>{level.emoji} {level.bn} <span className="muted small">({level.en})</span></h3>
          {step ? (
            <p className="small" style={{ margin: 0 }}>পরের ধাপ: <strong>{step.bn}</strong> <span className="badge">+{step.points}</span></p>
          ) : (
            <p className="small" style={{ margin: 0 }}>সব ধাপ সম্পন্ন। You are fully prepared. 🏅</p>
          )}
        </div>
        <Link className="btn" href={step && !step.manual ? step.href : "/journey"}>
          {points === 0 ? "প্রস্তুতি শুরু করুন" : "চালিয়ে যান"} →
        </Link>
      </div>
    </Reveal>
  );
}

export function TrustFigure({ kind }: { kind: "vault" | "padlock" }) {
  return (
    <div className="hairline-wrap trust-figure" aria-hidden>
      {kind === "vault" ? <Vault intensity={0.6} play label="A vault door with a dial and bolts" /> : <Padlock intensity={0.6} play label="A padlock" />}
    </div>
  );
}
