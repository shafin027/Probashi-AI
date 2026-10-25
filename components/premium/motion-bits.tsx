"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/** Count-up number when it enters the view (motion-dev skill: useInView + animate). Renders the final value first. */
export function CountUp({ to, prefix = "", suffix = "", locale = "bn-BD", decimals = 0 }: { to: number; prefix?: string; suffix?: string; locale?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const fmt = (v: number) => `${prefix}${v.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  const [text, setText] = useState(fmt(to));
  useEffect(() => {
    if (!inView || reduce) return;
    const c = animate(0, to, { duration: 1.4, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setText(fmt(v)) });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, to]);
  return <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>{text}</span>;
}

function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => setFine(window.matchMedia("(hover: hover) and (pointer: fine)").matches), []);
  return fine;
}

/** Magnetic pull toward the cursor on desktop only (motion-dev skill: magnetic-button pattern). */
export function Magnetic({ children, strength = 0.25 }: { children: React.ReactNode; strength?: number }) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 300, damping: 20 });
  const y = useSpring(0, { stiffness: 300, damping: 20 });
  if (!fine || reduce) return <>{children}</>;
  return (
    <motion.span
      style={{ x, y, display: "inline-block" }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/** Subtle 3D tilt (lightweight-3d-effects pattern, done with Motion transforms instead of an extra library). */
export function Tilt({ children, className, max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  if (!fine || reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
}

/** The signature "verified seal": a shield whose ring and check draw themselves (Motion pathLength). */
export function Seal({ size = 56, tone = "safe", label }: { size?: number; tone?: "safe" | "danger" | "caution" | "brand"; label?: string }) {
  const reduce = useReducedMotion();
  const color = { safe: "var(--safe)", danger: "var(--danger)", caution: "var(--caution)", brand: "var(--primary)" }[tone];
  const draw = (delay: number) =>
    reduce ? {} : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as const } };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <motion.path d="M32 4 L54 12 V30 C54 45 44 55 32 60 C20 55 10 45 10 30 V12 Z" fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" {...draw(0)} />
      {tone === "danger" ? (
        <motion.path d="M24 22 L40 38 M40 22 L24 38" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" {...draw(0.5)} />
      ) : tone === "caution" ? (
        <motion.path d="M32 20 V34 M32 41 V42" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" {...draw(0.5)} />
      ) : (
        <motion.path d="M22 32 L29 39 L43 24" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" {...draw(0.5)} />
      )}
    </svg>
  );
}
