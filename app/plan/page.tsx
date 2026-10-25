"use client";

import { useEffect, useRef, useState } from "react";
import { useJourney } from "@/components/journey.tsx";

const fmt = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;

const CHECKLIST = [
  "পাসপোর্টের কপি (পরিবারের কাছে)",
  "ভিসা ও চুক্তিপত্রের কপি",
  "বিএমইটি স্মার্ট কার্ড / ছাড়পত্র",
  "এজেন্সির RL নম্বর ও টাকার রসিদ",
  "মালিক/কোম্পানির ঠিকানা ও ফোন",
  "দূতাবাস / লেবার উইং-এর নম্বর",
  "প্রবাস বন্ধু কল সেন্টার 16135",
];

export default function PlanPage() {
  const [monthly, setMonthly] = useState("40000");
  const [debt, setDebt] = useState("400000");
  const [family, setFamily] = useState("15000");
  const [goal, setGoal] = useState("300000");
  const [hundiBonus, setHundiBonus] = useState("1.5");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const { complete } = useJourney();
  const inputs = `${monthly}|${debt}|${family}|${goal}|${hundiBonus}`;
  const first = useRef(inputs);
  useEffect(() => {
    if (inputs !== first.current) complete("remittance_plan");
  }, [inputs, complete]);
  const docsReady = Object.values(checked).filter(Boolean).length;
  useEffect(() => {
    if (docsReady >= 5) complete("family_docs");
  }, [docsReady, complete]);

  const m = Number(monthly) || 0;
  const fam = Number(family) || 0;
  const d = Number(debt) || 0;
  const g = Number(goal) || 0;
  // Formal channels earn a 2.5% government incentive; compare with the hundi premium the user is offered.
  const formalBonus = m * 0.025;
  const hundiExtra = m * ((Number(hundiBonus) || 0) / 100);
  const leftover = Math.max(0, m + formalBonus - fam);
  const debtSplit = d > 0 ? leftover * 0.7 : 0;
  const saveSplit = leftover - debtSplit;
  const debtMonths = debtSplit > 0 ? Math.ceil(d / debtSplit) : 0;
  const goalMonths = saveSplit > 0 ? Math.ceil(g / saveSplit) : Infinity;

  return (
    <div className="container section">
      <h1>পরিবার ও টাকার পরিকল্পনা</h1>
      <p className="muted">
        Plan each month&apos;s remittance: family expenses, paying off the migration loan, and saving for the return home.
        <span className="en">Part of the Family Plan (৳149/month). Free to try.</span>
      </p>
      <div className="grid grid-2">
        <div className="card">
          <div className="field">
            <label htmlFor="m">প্রতি মাসে কত পাঠান? (৳)</label>
            <input id="m" inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="field">
            <label htmlFor="f">পরিবারের মাসিক খরচ (৳)</label>
            <input id="f" inputMode="numeric" value={family} onChange={(e) => setFamily(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="field">
            <label htmlFor="d">বাকি ঋণ (৳)</label>
            <input id="d" inputMode="numeric" value={debt} onChange={(e) => setDebt(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="field">
            <label htmlFor="g">সঞ্চয়ের লক্ষ্য (৳), e.g. a small business back home</label>
            <input id="g" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="field">
            <label htmlFor="h">হুন্ডি কত % বেশি রেট দিচ্ছে?</label>
            <input id="h" inputMode="decimal" value={hundiBonus} onChange={(e) => setHundiBonus(e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
        </div>
        <div className="card stack">
          <div>
            <div className="small muted">Bank/MFS 2.5% government incentive vs hundi premium</div>
            <div className="stat">{fmt(formalBonus)} vs {fmt(hundiExtra)}</div>
            <div className="small">
              {formalBonus >= hundiExtra
                ? "✅ Formal channels pay you more, and they're legal and traceable."
                : "⚠️ Hundi looks slightly higher, but it's illegal, gives no proof of payment, and money can vanish. The difference is small."}
            </div>
          </div>
          <div>
            <div className="small muted">Each month, after family expenses</div>
            <div className="stat">{fmt(leftover)}</div>
            <div className="small">→ Loan: {fmt(debtSplit)} · Savings: {fmt(saveSplit)}</div>
          </div>
          <div>
            <div className="small muted">Debt-free in</div>
            <div className="stat">{d > 0 ? (debtSplit > 0 ? `${debtMonths} মাস` : "Never ⚠️") : "No debt 🎉"}</div>
          </div>
          <div>
            <div className="small muted">Savings goal reached in</div>
            <div className="stat">{Number.isFinite(goalMonths) ? `${goalMonths} মাস` : "Not reachable yet"}</div>
            <div className="small muted">70% of the leftover goes to debt first, because loan interest costs more than savings earn.</div>
          </div>
        </div>
      </div>
      <div className="card" id="docs" style={{ marginTop: 16 }}>
        <h3>📁 পরিবারের কাছে যা রাখবেন · Family document checklist</h3>
        <div className="grid grid-2" style={{ gap: 8 }}>
          {CHECKLIST.map((c, i) => (
            <label key={c} style={{ fontWeight: 400, display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" style={{ width: 22, minHeight: 22 }} checked={!!checked[i]} onChange={(e) => setChecked({ ...checked, [i]: e.target.checked })} />
              {c}
            </label>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          {Object.values(checked).filter(Boolean).length}/{CHECKLIST.length} ready
        </p>
      </div>
    </div>
  );
}
