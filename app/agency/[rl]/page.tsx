"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFeatures } from "@/components/features.tsx";
import { api, bn, ErrorLine, LicenceLine, Stars, TrustReasons, TrustRing, useBusy, type RegistryView, type TrustView } from "@/components/trust.tsx";
import { COUNTRIES } from "@/lib/data/countries.ts";
import { OfferCard, type Offer } from "@/components/offers.tsx";

type Review = { id: string; rating: number; promise_kept: boolean; cost_paid_bdt: number | null; body: string; agency_reply: string | null; created_at: string; worker: string; country_code: string; year: number };
type View = {
  rl: string;
  registry: RegistryView;
  profile: { id: string; name: string; status: string; checked_at: string; verified_at: string | null } | null;
  trust: TrustView;
  reviews: Review[];
  offers: Offer[];
  mine: { placement: { id: string; status: string } | null; reviewed: boolean } | null;
};

const country = (code: string) => COUNTRIES.find((c) => c.code === code);

export default function AgencyProfile() {
  const { rl } = useParams<{ rl: string }>();
  const { me } = useFeatures();
  const [view, setView] = useState<View | null>(null);
  const [notFound, setNotFound] = useState("");

  const load = useCallback(async () => {
    const res = await api<View>(`/api/agencies/${encodeURIComponent(decodeURIComponent(rl))}`);
    if (res.ok) setView(res.data);
    else setNotFound(res.data.error ?? "Not found");
  }, [rl]);

  useEffect(() => {
    void load();
  }, [load, me]);

  if (notFound) {
    return (
      <div className="container section stack" style={{ maxWidth: 760 }}>
        <div className="verdict verdict-danger">
          <strong>সরকারি লাইসেন্স তালিকায় নেই · {notFound}.</strong> Do not pay this agency. <Link href="/help">Report it</Link>.
        </div>
        <Link href="/agency">← আরেকটি এজেন্সি খুঁজুন</Link>
      </div>
    );
  }
  if (!view) return <div className="container section muted">লোড হচ্ছে…</div>;

  const verified = view.profile?.status === "verified";
  return (
    <div className="container section stack" style={{ maxWidth: 900 }}>
      <Link href="/agency" className="small">← এজেন্সি যাচাই</Link>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem" }}>{view.registry.name}</h1>
            <div className="muted">{view.rl} · {view.registry.address}</div>
            <LicenceLine reg={view.registry} />
            {verified ? (
              <span className="badge">✓ Probashi AI-তে যাচাইকৃত · Verified agency account</span>
            ) : (
              <span className="small muted">This agency has not registered on Probashi AI yet; licence data is from the official list.</span>
            )}
          </div>
          <TrustRing trust={view.trust} size="lg" />
        </div>
        <details style={{ marginTop: 12 }}>
          <summary>স্কোর কীভাবে হিসাব হয় · How this score is calculated</summary>
          <TrustReasons trust={view.trust} />
          <p className="small muted">
            Source: {view.registry.source}, imported {view.registry.imported_at.slice(0, 10)}. Paid listings never change this score.
          </p>
        </details>
      </div>

      {view.registry.status !== "active" && (
        <div className="verdict verdict-danger">
          <strong>এই এজেন্সি এখন আইনত কর্মী পাঠাতে পারে না।</strong> This agency cannot legally recruit right now. Do not pay them.
        </div>
      )}

      {view.offers.length > 0 && (
        <section className="stack">
          <h2>যাচাইকৃত অফার · Verified offers</h2>
          <p className="small muted">Each offer passed our rule engine and is within the government cost ceiling.</p>
          <div className="grid grid-2">
            {view.offers.map((o) => <OfferCard key={o.id} o={o} />)}
          </div>
        </section>
      )}

      <section className="stack">
        <h2>কর্মীদের রিভিউ · Worker reviews</h2>
        {view.reviews.length === 0 && <p className="muted">No verified reviews yet.</p>}
        {view.reviews.map((r) => (
          <div className="card" key={r.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <Stars value={r.rating} label="Rating" />
              <span className="badge">✓ যাচাইকৃত কর্মী · {country(r.country_code)?.nameBn ?? r.country_code}, {bn(r.year)}</span>
            </div>
            <p style={{ margin: "8px 0" }}>{r.body}</p>
            <div className="small muted">
              {r.worker} · {r.promise_kept ? "✓ প্রতিশ্রুত চাকরি ও বেতন পেয়েছেন" : "✗ প্রতিশ্রুতি রাখা হয়নি"}
              {r.cost_paid_bdt != null && ` · খরচ দিয়েছেন ৳${bn(r.cost_paid_bdt)}`}
            </div>
            {r.agency_reply && (
              <div className="premium-offer small" style={{ marginTop: 8 }}>
                <strong>এজেন্সির উত্তর · Agency reply:</strong> {r.agency_reply}
              </div>
            )}
          </div>
        ))}
      </section>

      {verified && view.profile && <ReviewBox agencyId={view.profile.id} mine={view.mine} onDone={load} />}
    </div>
  );
}

function ReviewBox({ agencyId, mine, onDone }: { agencyId: string; mine: View["mine"]; onDone: () => Promise<void> }) {
  const { me } = useFeatures();
  const { busy, error, run } = useBusy();
  const [countryCode, setCountryCode] = useState("SA");
  const [year, setYear] = useState(new Date().getFullYear());
  const [evidence, setEvidence] = useState("");
  const [rating, setRating] = useState(0);
  const [kept, setKept] = useState<boolean | null>(null);
  const [cost, setCost] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState("");

  if (!me) {
    return (
      <div className="card">
        <h3>এই এজেন্সি দিয়ে বিদেশে গিয়েছিলেন?</h3>
        <p className="small muted">Log in to add your placement and review this agency. Your review helps the next worker.</p>
        <Link className="btn" href="/login">লগইন · Log in</Link>
      </div>
    );
  }
  if (me.role !== "worker") return null;

  if (!mine?.placement) {
    return (
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const res = await api("/api/placements", "POST", { agencyId, countryCode, year, evidence });
            if (!res.ok) throw new Error(res.data.error ?? "Could not save");
            await onDone();
          });
        }}
      >
        <h3>১. এই এজেন্সি দিয়ে গিয়েছিলেন? · Add your placement</h3>
        <p className="small muted">
          The agency or our team confirms it before your review is shown. Agencies can&apos;t reject it; disputes are checked by our staff.
        </p>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="pl-country">কোন দেশে · Country</label>
            <select id="pl-country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.nameBn} · {c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pl-year">কোন বছর · Year</label>
            <input id="pl-year" type="number" min={2000} max={new Date().getFullYear()} value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pl-evidence">প্রমাণ (ঐচ্ছিক) · Proof (optional)</label>
          <input id="pl-evidence" maxLength={300} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="e.g. last 4 digits of BMET smart card, flight month" />
          <div className="hint">Don&apos;t write your full passport or NID number.</div>
        </div>
        <ErrorLine error={error} />
        <button className="btn" disabled={busy}>যোগ করুন · Add placement</button>
      </form>
    );
  }

  const status = mine.placement.status;
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          if (!rating || kept === null) throw new Error("রেটিং ও প্রতিশ্রুতির প্রশ্নের উত্তর দিন · Choose a rating and answer the promise question");
          const res = await api<{ visible: boolean }>("/api/reviews", "POST", { agencyId, rating, promiseKept: kept, costPaidBdt: cost ? Number(cost) : null, body });
          if (!res.ok) throw new Error(res.data.error ?? "Could not save");
          setDone(res.data.visible ? "ধন্যবাদ! রিভিউ প্রকাশিত হয়েছে। · Published." : "ধন্যবাদ! প্লেসমেন্ট নিশ্চিত হলে রিভিউ দেখা যাবে। · It will appear once your placement is confirmed.");
          await onDone();
        });
      }}
    >
      <h3>২. রিভিউ লিখুন · {mine.reviewed ? "Update your review" : "Write your review"}</h3>
      <p className="small muted">
        Placement: <strong>{status === "confirmed" ? "✓ confirmed" : status === "disputed" ? "disputed by the agency, our team is checking" : "waiting for confirmation"}</strong>
      </p>
      <div className="field">
        <span className="field-label">সার্বিক অভিজ্ঞতা · Overall</span>
        <Stars value={rating} onChange={setRating} label="Rating" />
      </div>
      <div className="field">
        <span className="field-label">প্রতিশ্রুত চাকরি ও বেতন পেয়েছিলেন? · Did you get the promised job and salary?</span>
        <div className="choice-row">
          <button type="button" className="choice" aria-pressed={kept === true} onClick={() => setKept(true)}>হ্যাঁ · Yes</button>
          <button type="button" className="choice" aria-pressed={kept === false} onClick={() => setKept(false)}>না · No</button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="rv-cost">মোট কত টাকা দিয়েছিলেন? · Total you paid (Tk, optional)</label>
        <input id="rv-cost" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="rv-body">আপনার অভিজ্ঞতা · Your experience</label>
        <textarea id="rv-body" rows={4} maxLength={1500} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="hint">Phone numbers and ID numbers are removed automatically.</div>
      </div>
      <ErrorLine error={error} />
      {done && <p role="status" style={{ color: "var(--safe)" }}>{done}</p>}
      <button className="btn" disabled={busy}>জমা দিন · Submit review</button>
    </form>
  );
}
