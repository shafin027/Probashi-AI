"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useFeatures } from "./features.tsx";
import { ReadinessRing, useJourney } from "./journey.tsx";

const LINKS = [
  { href: "/cost", label: "খরচ হিসাব", en: "Cost" },
  { href: "/agency", label: "এজেন্সি যাচাই", en: "Agencies" },
  { href: "/ask", label: "প্রশ্ন করুন", en: "Ask" },
  { href: "/plan", label: "পরিবার ও টাকা", en: "Family" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { me, accounts } = useFeatures();
  const { points, ready } = useJourney();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label="Probashi AI home">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          Probashi AI
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden>{open ? "✕" : "☰"}</span>
          <span className="sr-only">Menu</span>
        </button>
        <nav
          id="main-nav"
          className={`nav-links ${open ? "open" : ""}`}
          aria-label="Main"
          onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        >
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
              {l.label}
              <span className="nav-en">{l.en}</span>
            </Link>
          ))}
          <Link href="/journey" className="nav-journey" aria-current={pathname === "/journey" ? "page" : undefined}>
            {ready && <ReadinessRing points={points} />}
            প্রস্তুতি
            <span className="sr-only"> {points}/100</span>
            <span className="nav-en">Readiness {points}/100</span>
          </Link>
          {accounts &&
            (me ? (
              <Link href="/account" aria-current={pathname === "/account" ? "page" : undefined} className="nav-user">
                <span className="avatar" aria-hidden>{me.name.slice(0, 1).toUpperCase()}</span>
                {me.name.split(" ")[0]}
                <span className="nav-en">Account</span>
              </Link>
            ) : (
              <Link href="/login" aria-current={pathname === "/login" ? "page" : undefined}>
                লগইন
                <span className="nav-en">Log in</span>
              </Link>
            ))}
          <Link href="/check" className="btn btn-sm nav-cta">
            অফার চেক করুন (ফ্রি)
          </Link>
        </nav>
      </div>
    </header>
  );
}
