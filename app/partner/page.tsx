"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useFeatures } from "@/components/features.tsx";
import { OfferCard, type Offer } from "@/components/offers.tsx";
import { api, bn, ErrorLine, Stars, TrustReasons, TrustRing, useBusy, type TrustView } from "@/components/trust.tsx";
import { COUNTRIES } from "@/lib/data/countries.ts";

type Agency = { id: string; rl_number: string; name: string; status: "pending" | "verified" | "suspended" | "rejected"; check_result: { outcome: string; registryName: string | null; similarity: number | null; phoneMatches?: boolean; validUntil: string | null } };
type OfferRow = Offer & { status: string; check_result: { allowed: boolean; reasons: { bn: string; en: string }[] } };
type Placement = { id: string; country_code: string; year: number; evidence: string; status: string; created_at: string; worker: string };
type Review = { id: string; rating: number; body: string; agency_reply: string | null; worker: string };
type Dash = { agency: Agency | null; offers?: OfferRow[]; placements?: Placement[]; reviews?: Review[]; trust?: TrustView };

const STATUS_TEXT: Record<Agency["status"], string> = {
  verified: "✓ যাচাইকৃত · Verified: your offers can go live",
  pending: "⏳ যাচাই চলছে · Under review: we will call the phone number on your official licence record",
  suspended: "⛔ স্থগিত · Suspended: your licence is not active on the official list; offers are paused",
  rejected: "✗ বাতিল · Rejected",
};

export default function PartnerPage() {
  const { me, loaded } = useFeatures();
  const [dash, setDash] = useState<Dash | null>(null);

  const load = useCallback(async () => {
    const r = await api<Dash>("/api/partner");
    if (r.ok) setDash(r.data);
  }, []);
  useEffect(() => {
    if (me?.role === "agency") void load();
  }, [me, load]);

  if (!loaded) return <div className="container section muted">লোড হচ্ছে…</div>;

  if (!me || me.role !== "agency") {
    return (
      <div className="container section stack" style={{ maxWidth: 820 }}>
        <h1>লাইসেন্সধারী এজেন্সির জন্য</h1>
        <p className="muted">
          Reach workers who check before they pay. Publish offers with a &ldquo;verified&rdquo; badge: your RL number is matched against
          BMET&apos;s official licence list, and every offer is checked against the government cost ceiling.
        </p>
        <div className="grid grid-3">
          <div className="card"><h3>১. নিবন্ধন</h3><p className="small muted" style={{ margin: 0 }}>Create an agency account with the mobile number on your official licence record.</p></div>
          <div className="card"><h3>২. যাচাই</h3><p className="small muted" style={{ margin: 0 }}>We match RL number, name and phone with the official list; otherwise our team calls the official number.</p></div>
          <div className="card"><h3>৩. অফার</h3><p className="small muted" style={{ margin: 0 }}>Offers within the legal cost go live; workers see your confidence score and verified reviews.</p></div>
        </div>
        {me ? (
          <p className="verdict verdict-caution">You are logged in with a {me.role} account. Agency tools need a separate agency account.</p>
        ) : (
          <Link className="btn" href="/login?type=agency">এজেন্সি অ্যাকাউন্ট খুলুন · Create agency account</Link>
        )}
        <p className="small muted">Agencies cannot buy a better score. Sponsored placement, if offered later, is always labelled and never affects risk checks.</p>
      </div>
    );
  }

  if (!dash) return <div className="container section muted">লোড হচ্ছে…</div>;
  if (!dash.agency) return <RegisterAgency onDone={load} />;

  const a = dash.agency;
  return (
    <div className="container section stack" style={{ maxWidth: 980 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.7rem" }}>{a.name}</h1>
            <div className="muted">{a.rl_number}</div>
            <p style={{ fontWeight: 700, margin: "8px 0" }}>{STATUS_TEXT[a.status]}</p>
            {a.status === "pending" && (
              <p className="small muted" style={{ margin: 0 }}>
                Automatic check: {a.check_result.outcome === "verified" ? "licence and name match" : a.check_result.outcome}
                {a.check_result.phoneMatches === false && "; the phone number differs from the official record"}.
              </p>
            )}
            {a.status === "verified" && <Link className="small" href={`/agency/${encodeURIComponent(a.rl_number)}`}>Public profile →</Link>}
          </div>
          {dash.trust && <TrustRing trust={dash.trust} />}
        </div>
        {dash.trust && (
          <details style={{ marginTop: 8 }}>
            <summary>Score breakdown</summary>
            <TrustReasons trust={dash.trust} />
          </details>
        )}
      </div>

      {a.status === "verified" && <NewOffer onDone={load} />}

      <section className="stack">
        <h2>অফারসমূহ · Your offers</h2>
        {dash.offers?.length === 0 && <p className="muted">No offers yet.</p>}
        <div className="grid grid-2">
          {dash.offers?.map((o) => (
            <OfferCard key={o.id} o={o}>
              <p className="small" style={{ margin: "8px 0 0", fontWeight: 700 }}>
                {o.status === "live" ? "🟢 Live" : o.status === "blocked" ? "⛔ Blocked" : o.status}
              </p>
              {o.status === "blocked" && (
                <ul className="small" style={{ margin: "4px 0", paddingLeft: 18, color: "var(--danger)" }}>
                  {o.check_result.reasons.map((r) => <li key={r.en}>{r.bn} · {r.en}</li>)}
                </ul>
              )}
              {o.status === "live" && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={async () => { await api("/api/partner/offers", "DELETE", { id: o.id }); await load(); }}>
                  সরিয়ে নিন · Withdraw
                </button>
              )}
            </OfferCard>
          ))}
        </div>
      </section>

      <section className="stack">
        <h2>কর্মীদের প্লেসমেন্ট · Placement confirmations</h2>
        <p className="small muted">Workers who say they went through your agency. Confirm the real ones; dispute others and our team will check. You cannot delete them.</p>
        {dash.placements?.length === 0 && <p className="muted">None yet.</p>}
        {dash.placements?.map((p) => (
          <div className="card row" key={p.id} style={{ justifyContent: "space-between" }}>
            <div>
              <strong>{p.worker}</strong> · {COUNTRIES.find((c) => c.code === p.country_code)?.name ?? p.country_code} {p.year}
              {p.evidence && <div className="small muted">{p.evidence}</div>}
              <div className="small">Status: {p.status}</div>
            </div>
            {p.status === "pending" && (
              <div className="row">
                <button className="btn btn-sm" onClick={async () => { await api("/api/partner/placements", "POST", { id: p.id, action: "confirm" }); await load(); }}>নিশ্চিত · Confirm</button>
                <button className="btn btn-ghost btn-sm" onClick={async () => { await api("/api/partner/placements", "POST", { id: p.id, action: "dispute" }); await load(); }}>আপত্তি · Dispute</button>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="stack">
        <h2>রিভিউ · Reviews</h2>
        {dash.reviews?.length === 0 && <p className="muted">No published reviews yet.</p>}
        {dash.reviews?.map((r) => <ReviewReply key={r.id} r={r} onDone={load} />)}
      </section>
    </div>
  );
}

function RegisterAgency({ onDone }: { onDone: () => Promise<void> }) {
  const { busy, error, run } = useBusy();
  const [f, setF] = useState({ rl: "", name: "", contactPhone: "", address: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="container section" style={{ maxWidth: 680 }}>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const r = await api("/api/partner/agency", "POST", f);
            if (!r.ok) throw new Error(r.data.error ?? "Could not register");
            await onDone();
          });
        }}
      >
        <h1 style={{ fontSize: "1.6rem" }}>এজেন্সি নিবন্ধন · Register your agency</h1>
        <p className="small muted">Exactly as on your BMET licence. We verify it against the official RAIMS list.</p>
        <div className="field"><label htmlFor="ag-rl">RL নম্বর · RL number</label><input id="ag-rl" required value={f.rl} onChange={set("rl")} placeholder="RL-1234" /></div>
        <div className="field"><label htmlFor="ag-name">নিবন্ধিত নাম · Registered name</label><input id="ag-name" required value={f.name} onChange={set("name")} /></div>
        <div className="field">
          <label htmlFor="ag-phone">যোগাযোগের মোবাইল · Contact mobile</label>
          <input id="ag-phone" type="tel" required value={f.contactPhone} onChange={set("contactPhone")} placeholder="01XXXXXXXXX" />
          <div className="hint">Instant verification needs this to be your login number and the number on the official licence record.</div>
        </div>
        <div className="field"><label htmlFor="ag-addr">অফিসের ঠিকানা · Office address</label><input id="ag-addr" value={f.address} onChange={set("address")} /></div>
        <ErrorLine error={error} />
        <button className="btn" disabled={busy}>{busy ? "যাচাই হচ্ছে…" : "যাচাই করে নিবন্ধন · Verify and register"}</button>
      </form>
    </div>
  );
}

function NewOffer({ onDone }: { onDone: () => Promise<void> }) {
  const { busy, error, run } = useBusy();
  const [f, setF] = useState({ countryCode: "SA", jobTitle: "", employer: "", salaryLocal: "", totalCostBdt: "", contractMonths: "24", seats: "10", details: "" });
  const [blocked, setBlocked] = useState<{ bn: string; en: string }[] | null>(null);
  const c = COUNTRIES.find((x) => x.code === f.countryCode);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          setBlocked(null);
          const body = { ...f, salaryLocal: Number(f.salaryLocal), totalCostBdt: Number(f.totalCostBdt), contractMonths: Number(f.contractMonths), seats: Number(f.seats) };
          const r = await api<{ offer?: OfferRow; published?: boolean }>("/api/partner/offers", "POST", body);
          if (!r.ok) throw new Error(r.data.error ?? "Could not publish");
          if (!r.data.published && r.data.offer) setBlocked(r.data.offer.check_result.reasons);
          else setF({ ...f, jobTitle: "", employer: "", details: "" });
          await onDone();
        });
      }}
    >
      <h2 style={{ marginTop: 0 }}>নতুন অফার · Publish an offer</h2>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="of-country">দেশ · Country</label>
          <select id="of-country" value={f.countryCode} onChange={set("countryCode")}>
            {COUNTRIES.map((x) => <option key={x.code} value={x.code}>{x.nameBn} · {x.name}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="of-job">পদ · Job title</label><input id="of-job" required value={f.jobTitle} onChange={set("jobTitle")} /></div>
        <div className="field"><label htmlFor="of-emp">নিয়োগকর্তা · Employer</label><input id="of-emp" required value={f.employer} onChange={set("employer")} /></div>
        <div className="field"><label htmlFor="of-sal">মাসিক বেতন ({c?.currency}) · Salary</label><input id="of-sal" type="number" min={1} required value={f.salaryLocal} onChange={set("salaryLocal")} /></div>
        <div className="field">
          <label htmlFor="of-cost">কর্মীর মোট খরচ (৳) · Total cost to worker</label>
          <input id="of-cost" type="number" min={0} required value={f.totalCostBdt} onChange={set("totalCostBdt")} />
          {c?.officialCostBdt && <div className="hint">Government ceiling: ৳{bn(c.officialCostBdt)}</div>}
        </div>
        <div className="field"><label htmlFor="of-months">চুক্তি (মাস) · Contract months</label><input id="of-months" type="number" min={6} max={60} value={f.contractMonths} onChange={set("contractMonths")} /></div>
        <div className="field"><label htmlFor="of-seats">পদ সংখ্যা · Seats</label><input id="of-seats" type="number" min={1} value={f.seats} onChange={set("seats")} /></div>
      </div>
      <div className="field"><label htmlFor="of-details">বিস্তারিত · Details (food, housing, overtime)</label><textarea id="of-details" maxLength={1000} value={f.details} onChange={set("details")} /></div>
      <ErrorLine error={error} />
      {blocked && (
        <div className="verdict verdict-danger" role="alert">
          <strong>অফারটি প্রকাশ করা যায়নি · Offer blocked:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{blocked.map((r) => <li key={r.en}>{r.bn} · {r.en}</li>)}</ul>
        </div>
      )}
      <button className="btn" disabled={busy}>যাচাই করে প্রকাশ · Check and publish</button>
    </form>
  );
}

function ReviewReply({ r, onDone }: { r: Review; onDone: () => Promise<void> }) {
  const [text, setText] = useState("");
  const { busy, error, run } = useBusy();
  return (
    <div className="card">
      <Stars value={r.rating} label="Rating" /> <span className="small muted">{r.worker}</span>
      <p style={{ margin: "6px 0" }}>{r.body}</p>
      {r.agency_reply ? (
        <div className="premium-offer small"><strong>Your reply:</strong> {r.agency_reply}</div>
      ) : (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const res = await api("/api/partner/reply", "POST", { reviewId: r.id, reply: text });
              if (!res.ok) throw new Error(res.data.error ?? "Could not reply");
              await onDone();
            });
          }}
        >
          <label htmlFor={`reply-${r.id}`} className="sr-only">Reply</label>
          <input id={`reply-${r.id}`} style={{ flex: 1 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply publicly (once)" />
          <button className="btn btn-sm" disabled={busy}>উত্তর · Reply</button>
          <ErrorLine error={error} />
        </form>
      )}
    </div>
  );
}
