"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FLAGS = [
  { bn: "ফ্রি/আজাদ ভিসা: উপসাগরীয় দেশে অবৈধ", sev: "high" },
  { bn: "খরচ সরকারি সীমার ৩.৯ গুণ", sev: "high" },
  { bn: "টাকা দালালকে, এজেন্সিকে নয়", sev: "high" },
  { bn: "পাসপোর্ট দালালের কাছে", sev: "medium" },
];

/**
 * The product story in 6 seconds (gsap-react + gsap-timeline skills): a document is scanned,
 * red flags surface one by one, the safety score falls, the verdict lands.
 * The HTML renders the FINAL state, so no-JS, screenshots and reduced-motion users see the full result;
 * the timeline only plays when motion is allowed, and pauses off-screen (gsap-performance).
 */
export function HeroDemo() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const ring = root.current!.querySelector<HTMLElement>(".demo-ring")!;
        const score = { v: 100 };
        const setScore = () => {
          ring.style.setProperty("--v", String(Math.max(3, Math.round(score.v))));
          ring.dataset.score = String(Math.round(score.v));
        };
        const doc = root.current!.querySelector<HTMLElement>(".demo-doc")!;
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.6, defaults: { ease: "power3.out" } });
        tl.set(".demo-flag", { autoAlpha: 0, x: -14 })
          .set(".demo-verdict", { autoAlpha: 0, y: 8 })
          .set(score, { v: 100, onComplete: setScore })
          .fromTo(".demo-scan", { y: 0, autoAlpha: 1 }, { y: () => doc.clientHeight - 4, duration: 1.6, ease: "sine.inOut" })
          .to(".demo-scan", { autoAlpha: 0, duration: 0.2 })
          .to(".demo-flag", { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.32 }, "-=0.9")
          .to(score, { v: 4, duration: 1.4, ease: "power2.inOut", onUpdate: setScore }, "<")
          .to(".demo-verdict", { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.3");
        ScrollTrigger.create({ trigger: root.current, start: "top bottom", end: "bottom top", onToggle: (self) => (self.isActive ? tl.play() : tl.pause()) });
        return () => tl.kill();
      });
    },
    { scope: root },
  );

  return (
    <div className="demo" ref={root} role="img" aria-label="Example: a Saudi Arabia offer letter is checked and flagged as dangerous, safety score 4 out of 100">
      <div className="demo-doc" aria-hidden>
        <div className="demo-doc-head">
          <span className="demo-chip">OFFER LETTER</span>
          <span className="small muted">Riyadh · Saudi Arabia</span>
        </div>
        {[92, 70, 84, 58, 76, 64, 88, 50].map((w, i) => (
          <span key={i} className={`demo-line ${i === 3 || i === 5 ? "hot" : ""}`} style={{ width: `${w}%` }} />
        ))}
        <span className="demo-scan" />
      </div>
      <div className="demo-panel" aria-hidden>
        <div className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
          <span className="ring sm demo-ring" data-score="4" style={{ ["--v" as string]: 4, ["--c" as string]: "var(--danger)" }} />
          <div className="demo-verdict">
            <strong style={{ color: "var(--danger)" }}>বিপদ! টাকা দেবেন না</strong>
            <div className="small muted">Danger: 4 red flags found</div>
          </div>
        </div>
        <ul className="demo-flags">
          {FLAGS.map((f) => (
            <li key={f.bn} className={`demo-flag ${f.sev}`}>{f.bn}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
