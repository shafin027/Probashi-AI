"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useFeatures } from "./features.tsx";
import { ALL_MILESTONES, EMPTY_PROGRESS, levelFor, mergeProgress, nextStep, sanitiseProgress, score, type MilestoneId, type Progress } from "@/lib/journey.ts";

/** Fire-and-forget aggregate event (no user id); never blocks the UI. */
export function track(event: string) {
  try {
    void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event }), keepalive: true }).catch(() => {});
  } catch {}
}

type Celebration = { id: number; title: string; sub: string; points: number };
type Ctx = { progress: Progress; points: number; complete: (id: MilestoneId, opts?: { quiet?: boolean }) => void; setQuizBest: (pct: number) => void; ready: boolean };

const JourneyContext = createContext<Ctx>({ progress: EMPTY_PROGRESS, points: 0, complete: () => {}, setQuizBest: () => {}, ready: false });
const KEY = "pa-journey-v1";

function readLocal(): Progress {
  try {
    return sanitiseProgress(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return EMPTY_PROGRESS;
  }
}

function writeLocal(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

/** Progress lives in the browser for guests and syncs to the account when logged in. */
export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const { me, loaded } = useFeatures();
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [ready, setReady] = useState(false);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const syncedFor = useRef<string | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    setProgress(readLocal());
    setReady(true);
  }, []);

  const push = useCallback(async (p: Progress) => {
    try {
      const res = await fetch("/api/progress", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
      if (res.ok) {
        const merged = sanitiseProgress((await res.json()).progress);
        setProgress(merged);
        writeLocal(merged);
      }
    } catch {}
  }, []);

  // On login: merge browser progress with the account's, both ways.
  useEffect(() => {
    if (!loaded || !ready || !me || syncedFor.current === me.phone) return;
    syncedFor.current = me.phone;
    void push(readLocal());
  }, [loaded, ready, me, push]);

  const celebrate = useCallback((c: Omit<Celebration, "id">) => {
    const id = Date.now() + Math.random();
    setCelebrations((cs) => [...cs, { ...c, id }]);
    setTimeout(() => setCelebrations((cs) => cs.filter((x) => x.id !== id)), 4200);
  }, []);

  const current = useRef(progress);
  useEffect(() => {
    current.current = progress;
  }, [progress]);

  const update = useCallback(
    (fn: (p: Progress) => Progress, quiet = false) => {
      const prev = current.current;
      const next = fn(prev);
      if (next === prev) return;
      current.current = next;
      setProgress(next);
      writeLocal(next);
      const newly = ALL_MILESTONES.filter((m) => next.done.includes(m.id) && !prev.done.includes(m.id));
      for (const m of newly) track(`milestone:${m.id}`);
      if (!quiet) for (const m of newly) celebrate({ title: m.bn, sub: m.en, points: m.points });
      const lvl = levelFor(score(next));
      if (lvl.min > levelFor(score(prev)).min) {
        track(`level:${lvl.en.toLowerCase().replace(/\s+/g, "_")}`);
        // Goal chaining: the level-up message names the next meaningful goal (counters post-reward reset).
        const upcoming = nextStep(next);
        if (!quiet) celebrate({ title: `${lvl.emoji} নতুন ধাপ: ${lvl.bn}`, sub: upcoming ? `Level up: ${lvl.en}. Next: ${upcoming.en}` : `Level up: ${lvl.en}`, points: 0 });
      }
      if (me) void push(next);
    },
    [celebrate, me, push],
  );

  const complete = useCallback(
    (id: MilestoneId, opts?: { quiet?: boolean }) =>
      update((p) => (p.done.includes(id) ? p : { ...p, done: [...p.done, id], updatedAt: Date.now() }), opts?.quiet),
    [update],
  );

  const setQuizBest = useCallback(
    (pct: number) =>
      update((p) => {
        const best = Math.max(p.quizBest, pct);
        const done = pct >= 80 && !p.done.includes("quiz_passed") ? [...p.done, "quiz_passed" as MilestoneId] : p.done;
        return best === p.quizBest && done === p.done ? p : mergeProgress(p, { done, quizBest: best, updatedAt: Date.now() });
      }),
    [update],
  );

  return (
    <JourneyContext.Provider value={{ progress, points: score(progress), complete, setQuizBest, ready }}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence>
          {celebrations.map((c) => (
            <motion.div
              key={c.id}
              className="toast"
              role="status"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduce ? 0 : 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
            >
              <span className="toast-medal" aria-hidden>{c.points ? "🏅" : "⭐"}</span>
              <span>
                <strong>{c.title}</strong>
                <span className="small muted" style={{ display: "block" }}>
                  {c.sub}
                  {c.points ? ` · +${c.points} নিরাপত্তা পয়েন্ট` : ""}
                </span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </JourneyContext.Provider>
  );
}

export function useJourney() {
  return useContext(JourneyContext);
}

/** Small readiness ring for the nav and cards. */
export function ReadinessRing({ points, size = "sm" }: { points: number; size?: "sm" | "lg" }) {
  const lvl = levelFor(points);
  return (
    <span
      className={`ring ${size === "sm" ? "xs" : ""}`}
      data-score={points}
      aria-hidden
      style={{ ["--v" as string]: Math.max(points, 2), ["--c" as string]: points >= 80 ? "var(--safe)" : points >= 50 ? "var(--forest-bright)" : "var(--caution)" }}
    />
  );
}
