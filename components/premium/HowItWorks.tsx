"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Hub, Loupe, Phone, Sieve } from "@lucasmarkes/hairline/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STEPS = [
  { t: "ছবি তুলুন বা বলুন", e: "Snap the visa, contract or WhatsApp offer, or describe it by voice in Bangla.", Fig: Phone, label: "A phone opening in layers" },
  { t: "এআই কাগজ পড়ে", e: "Vision AI reads employer, job, salary and visa type, and spots mismatches. Without internet AI, your phone reads it itself.", Fig: Loupe, label: "A loupe magnifying a page" },
  { t: "আইনের নিয়ম মিলিয়ে দেখে", e: "A transparent rule engine checks official cost limits, minimum wages, licences and known scam routes. AI can add warnings, never remove them.", Fig: Sieve, label: "Sieves filtering" },
  { t: "সবুজ, হলুদ বা লাল", e: "A clear verdict with reasons and sources, the next step to take, and a one-tap share with your family.", Fig: Hub, label: "A hub connected to tiles" },
];

/**
 * Scroll storytelling (gsap-scrolltrigger skill). The visual column is CSS `position: sticky`
 * rather than a GSAP pin, so no pin-spacer is inserted (no layout shift); ScrollTrigger only
 * scrubs the progress line and tracks the active step. Below 960px it's a plain list.
 */
export function HowItWorks() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 960px)", () => {
        const steps = gsap.utils.toArray<HTMLElement>(".hiw-step");
        steps.forEach((el, i) => {
          ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: (self) => self.isActive && setActive(i) });
        });
        gsap.fromTo(".hiw-progress span", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".hiw-steps", start: "top 55%", end: "bottom 55%", scrub: 0.6 } });
      });
    },
    { scope: root },
  );

  const Active = STEPS[active].Fig;
  return (
    <div className="hiw" ref={root}>
      <div className="hiw-visual" aria-hidden>
        <div className="hiw-figure hairline-wrap" key={active}>
          <Active intensity={0.6} play label={STEPS[active].label} />
        </div>
        <div className="hiw-caption">
          <span className="hiw-num">০{active + 1}</span> {STEPS[active].t}
        </div>
      </div>
      <div className="hiw-progress" aria-hidden><span /></div>
      <ol className="hiw-steps">
        {STEPS.map((s, i) => (
          <li key={s.t} className={`hiw-step ${i === active ? "active" : ""}`}>
            <span className="hiw-num" aria-hidden>০{i + 1}</span>
            <h3>{s.t}</h3>
            <p className="muted">{s.e}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
