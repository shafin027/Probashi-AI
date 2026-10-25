"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useFeatures } from "@/components/features.tsx";
import { api, ErrorLine, useBusy } from "@/components/trust.tsx";
import { CATEGORIES, EMERGENCY, STATUS_BN, type Category } from "@/lib/case-meta.ts";
import { COUNTRIES, HELPLINES } from "@/lib/data/countries.ts";

type CaseRow = { ref: string; category: Category; status: string; tier: "legal_aid" | "self_help"; urgent: boolean; created_at: string; updated_at: string };
type Referral = { bn: string; en: string; contact: string };

export default function HelpPage() {
  const { me, loaded, accounts } = useFeatures();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [filed, setFiled] = useState<{ case: CaseRow; referrals: Referral[] } | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ cases: CaseRow[] }>("/api/cases");
    if (r.ok) setCases(r.data.cases);
  }, []);
  useEffect(() => {
    if (me) void load();
  }, [me, load]);

  return (
    <div className="container section stack" style={{ maxWidth: 880 }}>
      <h1>সমস্যা জানান ও আইনি সহায়তা</h1>
      <p className="muted">
        দালাল বা এজেন্সি প্রতারণা করেছে? বিদেশে বেতন পাচ্ছেন না, পাসপোর্ট আটকে রেখেছে? আমাদের জানান। আমাদের আইনি সহায়তা টিম আপনার
        কেস দেখবে এবং সঠিক সরকারি দপ্তরে নিয়ে যেতে সাহায্য করবে।
        <span className="en">Report fraud, unpaid wages, a held passport or abuse. Our legal-aid team reviews it and helps you take it to the right official body.</span>
      </p>

      <div className="verdict verdict-danger">
        <strong>জরুরি বিপদে এখনই কল করুন · In danger right now? Call first:</strong>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          <li>৯৯৯ (বাংলাদেশে জরুরি সেবা) · 999 in Bangladesh</li>
          {HELPLINES.filter((h) => /^\d+$/.test(h.number) && h.number !== "999").map((h) => <li key={h.name}>{h.name}: <strong>{h.number}</strong></li>)}
          <li>বিদেশ থেকে · From abroad: Probash Bandhu <strong>+8809610102030</strong></li>
        </ul>
      </div>

      {loaded && !me ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>Log in so our team can follow up with you and you can track your report.</p>
          {accounts ? <Link className="btn" href="/login">লগইন · Log in</Link> : <p className="muted small">Accounts are not available right now. Please use the helplines above.</p>}
        </div>
      ) : me && me.role === "worker" ? (
        filed ? (
          <Filed filed={filed} premium={me.premium} onNew={() => setFiled(null)} />
        ) : (
          <ReportForm premium={me.premium} onFiled={async (f) => { setFiled(f); await load(); }} />
        )
      ) : null}

      {cases.length > 0 && (
        <section className="stack">
          <h2>আমার রিপোর্ট · My reports</h2>
          {cases.map((c) => (
            <Link key={c.ref} href={`/help/${c.ref}`} className="card card-link row" style={{ justifyContent: "space-between" }}>
              <span>
                <strong>{c.ref}</strong> · {CATEGORIES[c.category].bn}
                <span className="small muted" style={{ display: "block" }}>{STATUS_BN[c.status as keyof typeof STATUS_BN] ?? c.status}</span>
              </span>
              {c.urgent && <span className="case-pill urgent">জরুরি</span>}
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

function ReportForm({ premium, onFiled }: { premium: boolean; onFiled: (f: { case: CaseRow; referrals: Referral[] }) => Promise<void> }) {
  const { busy, error, run } = useBusy();
  const [category, setCategory] = useState<Category>("overcharge");
  const [whereNow, setWhereNow] = useState<"bangladesh" | "abroad">("bangladesh");
  const [countryCode, setCountryCode] = useState("");
  const [agency, setAgency] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [consent, setConsent] = useState(true);
  const emergency = EMERGENCY.includes(category) || urgent;

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const r = await api<{ case: CaseRow; referrals: Referral[] }>("/api/cases", "POST", {
            category,
            description,
            agency,
            amountLostBdt: amount ? Number(amount) : null,
            whereNow,
            countryCode,
            urgent,
            consentContact: consent,
          });
          if (!r.ok) throw new Error(r.data.error ?? "Could not file the report");
          await onFiled(r.data);
        });
      }}
    >
      <h2 style={{ marginTop: 0 }}>রিপোর্ট করুন · File a report</h2>
      <div className="field">
        <label htmlFor="cs-cat">কী হয়েছে? · What happened?</label>
        <select id="cs-cat" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {(Object.keys(CATEGORIES) as Category[]).map((k) => <option key={k} value={k}>{CATEGORIES[k].bn} · {CATEGORIES[k].en}</option>)}
        </select>
      </div>
      <div className="field">
        <span className="field-label">আপনি এখন কোথায়? · Where are you now?</span>
        <div className="choice-row">
          <button type="button" className="choice" aria-pressed={whereNow === "bangladesh"} onClick={() => setWhereNow("bangladesh")}>বাংলাদেশে</button>
          <button type="button" className="choice" aria-pressed={whereNow === "abroad"} onClick={() => setWhereNow("abroad")}>বিদেশে · Abroad</button>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="cs-country">কোন দেশ · Destination country</label>
          <select id="cs-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
            <option value="">—</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.nameBn} · {c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cs-amount">কত টাকা হারিয়েছেন? · Money lost (Tk)</label>
          <input id="cs-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cs-agency">এজেন্সি বা দালালের নাম / RL নম্বর · Agency or broker</label>
        <input id="cs-agency" maxLength={200} value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="e.g. RL-1002 or the dalal's name" />
      </div>
      <div className="field">
        <label htmlFor="cs-desc">বিস্তারিত লিখুন · Describe what happened</label>
        <textarea id="cs-desc" rows={5} maxLength={4000} required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="কবে, কাকে, কত টাকা, কী বলেছিল, এখন কী অবস্থা…" />
        <div className="hint">Keep receipts, chats and contract photos; a caseworker may ask for them.</div>
      </div>
      <label className="row" style={{ fontWeight: 600 }}>
        <input type="checkbox" style={{ width: 22, minHeight: 22 }} checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        আমি এখন বিপদে আছি · I am in danger or need help urgently
      </label>
      <label className="row" style={{ fontWeight: 600 }}>
        <input type="checkbox" style={{ width: 22, minHeight: 22 }} checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        আইনি টিম আমার নম্বরে যোগাযোগ করতে পারবে · The legal-aid team may call me
      </label>
      <div className="premium-offer small" style={{ margin: "12px 0" }}>
        {premium || emergency ? (
          <>✅ This report goes straight to a <strong>legal-aid caseworker</strong>{!premium && " (emergencies are always forwarded, free)"}.</>
        ) : (
          <>
            Free: you get the right official channels for your problem immediately. <Link href="/premium">Premium</Link> forwards your report to
            a caseworker who follows up with you, the agency and the authorities.
          </>
        )}
      </div>
      <ErrorLine error={error} />
      <button className="btn" disabled={busy}>{busy ? "পাঠানো হচ্ছে…" : "রিপোর্ট পাঠান · Submit report"}</button>
    </form>
  );
}

function Filed({ filed, premium, onNew }: { filed: { case: CaseRow; referrals: Referral[] }; premium: boolean; onNew: () => void }) {
  return (
    <div className="card stack" role="status">
      <h2 style={{ margin: 0 }}>রিপোর্ট জমা হয়েছে · Report filed</h2>
      <p style={{ margin: 0 }}>Reference: <strong style={{ fontSize: "1.3rem" }}>{filed.case.ref}</strong></p>
      <p className="muted" style={{ margin: 0 }}>
        {filed.case.tier === "legal_aid"
          ? "একজন কেসওয়ার্কার শীঘ্রই আপনার কেস দেখবেন। · A caseworker will review it soon."
          : "নিচের সরকারি চ্যানেলগুলো বিনামূল্যে আপনাকে সাহায্য করতে পারে। · These official channels can help you, free."}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {filed.referrals.map((r) => <li key={r.en}>{r.bn} · <span className="muted">{r.en}</span>: <strong>{r.contact}</strong></li>)}
      </ul>
      <div className="row">
        <Link className="btn" href={`/help/${filed.case.ref}`}>কেস দেখুন · Open case</Link>
        {filed.case.tier === "self_help" && !premium && <Link className="btn btn-ghost" href="/premium">কেসওয়ার্কার নিন · Get a caseworker</Link>}
        <button className="btn btn-ghost" onClick={onNew}>আরেকটি রিপোর্ট</button>
      </div>
    </div>
  );
}
