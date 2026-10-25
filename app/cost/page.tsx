"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { COUNTRIES } from "@/lib/data/countries.ts";
import { useJourney } from "@/components/journey.tsx";

const fmt = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

export default function CostPage() {
  const [code, setCode] = useState("MY");
  const [asked, setAsked] = useState("450000");
  const [salary, setSalary] = useState("1700");
  const [living, setLiving] = useState("400");
  const [loanRate, setLoanRate] = useState("36");
  const [months, setMonths] = useState("24");
  const { complete } = useJourney();
  const touched = useRef(false);
  const inputs = `${code}|${asked}|${salary}|${living}|${loanRate}|${months}`;
  const first = useRef(inputs);
  useEffect(() => {
    if (inputs === first.current || touched.current) return;
    touched.current = true;
    const t = setTimeout(() => complete("true_cost"), 800);
    return () => clearTimeout(t);
  }, [inputs, complete]);

  const c = COUNTRIES.find((x) => x.code === code)!;
  const askedN = Number(asked) || 0;
  const salaryBdt = (Number(salary) || 0) * c.bdtRate;
  const livingBdt = (Number(living) || 0) * c.bdtRate;
  const saving = Math.max(0, salaryBdt - livingBdt);
  const contract = Number(months) || 24;
  // Simple monthly-compounding loan payoff on the full migration cost.
  const r = (Number(loanRate) || 0) / 100 / 12;
  let debt = askedN;
  let payoff = 0;
  let interest = 0;
  while (debt > 0 && payoff < 120 && saving > 0) {
    const i = debt * r;
    interest += i;
    debt = debt + i - saving;
    payoff++;
  }
  const neverPaid = saving <= 0 || payoff >= 120;
  const net = saving * contract - askedN - interest;
  const extra = c.officialCostBdt ? askedN - c.officialCostBdt : null;

  return (
    <div className="container section">
      <h1>আসল খরচ হিসাব</h1>
      <p className="muted">
        Is going abroad actually worth it at this price? See the official limit, your debt payoff time, and what you take home after the
        contract.
      </p>
      <div className="grid grid-2">
        <div className="card">
          <div className="field">
            <label htmlFor="c">দেশ · Country</label>
            <select id="c" value={code} onChange={(e) => setCode(e.target.value)}>
              {COUNTRIES.map((x) => (
                <option key={x.code} value={x.code}>{x.nameBn} · {x.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="a">মোট খরচ যা চাইছে (৳)</label>
            <input id="a" inputMode="numeric" value={asked} onChange={(e) => setAsked(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="s">মাসিক বেতন ({c.currency})</label>
              <input id="s" inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="field">
              <label htmlFor="l">নিজের খরচ/মাস ({c.currency})</label>
              <input id="l" inputMode="numeric" value={living} onChange={(e) => setLiving(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="field">
              <label htmlFor="r">ঋণের সুদ (%/বছর)</label>
              <input id="r" inputMode="numeric" value={loanRate} onChange={(e) => setLoanRate(e.target.value.replace(/\D/g, ""))} />
              <div className="hint">Informal lenders often charge 36–60%.</div>
            </div>
            <div className="field">
              <label htmlFor="m">চুক্তির মেয়াদ (মাস)</label>
              <input id="m" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
        </div>
        <div className="card stack">
          <div>
            <div className="small muted">Official government limit</div>
            <div className="stat">{c.officialCostBdt ? fmt(c.officialCostBdt) : "No limit set"}</div>
            <div className="small muted">{c.officialCostSource}</div>
          </div>
          {extra !== null && (
            <div>
              <div className="small muted">Extra above the limit</div>
              <div className="stat" style={{ color: extra > 0 ? "var(--danger)" : "var(--safe)" }}>{fmt(extra)}</div>
            </div>
          )}
          <div>
            <div className="small muted">Time to repay the debt (saving {fmt(saving)}/month)</div>
            <div className="stat">{neverPaid ? "Never ⚠️" : `${payoff} মাস`}</div>
            {!neverPaid && payoff > contract && <div style={{ color: "var(--danger)" }}>Longer than your {contract}-month contract!</div>}
          </div>
          <div>
            <div className="small muted">Interest paid to lenders</div>
            <div className="stat">{fmt(interest)}</div>
          </div>
          <div>
            <div className="small muted">Take-home after the contract</div>
            <div className="stat" style={{ color: net < 0 ? "var(--danger)" : "var(--safe)" }}>{fmt(net)}</div>
          </div>
          {c.reportedCostBdt && (
            <p className="small muted">
              Reported real-world cost: {fmt(c.reportedCostBdt[0])}–{fmt(c.reportedCostBdt[1])} ({c.reportedCostSource}). {c.minWageNote}
            </p>
          )}
          <Link className="btn" href="/check">এই অফারটা চেক করুন</Link>
        </div>
      </div>
    </div>
  );
}
