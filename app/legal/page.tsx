"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useFeatures } from "@/components/features.tsx";
import { api, ErrorLine, useBusy } from "@/components/trust.tsx";
import { CATEGORIES, STATUSES, STATUS_BN, type Category, type CaseStatus } from "@/lib/case-meta.ts";

type QueueRow = { ref: string; category: Category; status: CaseStatus; urgent: boolean; where_now: string; created_at: string; assignee: string | null; agency_name: string | null; agency_text: string };
type PendingAgency = { id: string; rl_number: string; name: string; contact_phone: string; check_result: { outcome: string; registryName: string | null; similarity: number | null; phoneMatches?: boolean } };
type PendingPlacement = { id: string; status: string; country_code: string; year: number; evidence: string; worker: string; agency: string };
type ReviewRow = { id: string; rating: number; body: string; status: string; agency: string };
type Dash = { cases: QueueRow[]; agencies: PendingAgency[]; placements: PendingPlacement[]; reviews: ReviewRow[] };
type CaseDetail = {
  case: QueueRow & { description: string; amount_lost_bdt: number | null; country_code: string; substantiated: boolean; agency_id: string | null };
  events: { id: string; actor_role: string; kind: string; body: string; internal: boolean; created_at: string }[];
  referrals: { en: string; contact: string }[];
  reporter?: { name: string; phone: string };
};

const TABS = [
  ["cases", "কেস · Cases"],
  ["agencies", "এজেন্সি যাচাই · Agencies"],
  ["placements", "প্লেসমেন্ট · Placements"],
  ["reviews", "রিভিউ · Reviews"],
] as const;

export default function LegalDashboard() {
  const { me, loaded } = useFeatures();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("cases");
  const [dash, setDash] = useState<Dash | null>(null);
  const [filter, setFilter] = useState<"" | CaseStatus>("");
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (filter) qs.set("status", filter);
    if (mine) qs.set("mine", "1");
    const r = await api<Dash>(`/api/legal?${qs}`);
    if (r.ok) setDash(r.data);
  }, [filter, mine]);
  useEffect(() => {
    if (me?.role === "legal" || me?.role === "admin") void load();
  }, [me, load]);

  if (!loaded) return <div className="container section muted">লোড হচ্ছে…</div>;
  if (!me || (me.role !== "legal" && me.role !== "admin")) {
    return <div className="container section"><h1>আইনি টিম</h1><p className="muted">Staff only.</p><Link href="/login">Log in</Link></div>;
  }

  const act = async (url: string, body: unknown) => {
    await api(url, "PATCH", body);
    await load();
  };

  return (
    <div className="container section stack">
      <h1>আইনি সহায়তা ড্যাশবোর্ড · Legal-aid dashboard</h1>
      <div className="tabs" role="tablist" aria-label="Queues">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label} {dash && <span className="badge">{dash[id].length}</span>}
          </button>
        ))}
      </div>

      {tab === "cases" && dash && (
        <div className="split">
          <div>
            <div className="row" style={{ marginBottom: 8 }}>
              <label htmlFor="q-status" className="sr-only">Status filter</label>
              <select id="q-status" value={filter} onChange={(e) => setFilter(e.target.value as CaseStatus | "")}>
                <option value="">Open cases</option>
                {STATUSES.filter((s) => s !== "self_help").map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <label className="row small" style={{ gap: 6 }}>
                <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={mine} onChange={(e) => setMine(e.target.checked)} /> Mine
              </label>
            </div>
            {dash.cases.length === 0 && <p className="muted">Queue is empty.</p>}
            {dash.cases.map((c) => (
              <button key={c.ref} className="list-btn" aria-current={open === c.ref} onClick={() => setOpen(c.ref)}>
                <strong>{c.ref}</strong> {c.urgent && <span className="case-pill urgent">urgent</span>}
                <span className="small" style={{ display: "block" }}>{CATEGORIES[c.category].en} · {c.where_now} · {c.status}</span>
                <span className="small muted" style={{ display: "block" }}>{c.assignee ? `👤 ${c.assignee}` : "unassigned"} · {c.agency_name ?? c.agency_text ?? ""}</span>
              </button>
            ))}
          </div>
          <div>{open ? <CasePanel key={open} caseRef={open} onChange={load} /> : <p className="muted">Select a case.</p>}</div>
        </div>
      )}

      {tab === "agencies" && dash && (
        <div className="stack">
          <p className="small muted">Before verifying, call the phone number on the agency&apos;s official RAIMS record (not the number they gave) and confirm who registered.</p>
          {dash.agencies.length === 0 && <p className="muted">Nothing pending.</p>}
          {dash.agencies.map((a) => (
            <div className="card row" key={a.id} style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{a.name}</strong> · {a.rl_number}
                <div className="small">Official name: {a.check_result.registryName ?? "?"} · name match {a.check_result.similarity ?? "?"} · phone matches official record: {a.check_result.phoneMatches ? "yes" : "no"}</div>
                <div className="small muted">Contact given: {a.contact_phone}</div>
              </div>
              <div className="row">
                <button className="btn btn-sm" onClick={() => act("/api/legal/agencies", { id: a.id, decision: "verified" })}>Verify</button>
                <button className="btn btn-ghost btn-sm" onClick={() => act("/api/legal/agencies", { id: a.id, decision: "rejected" })}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "placements" && dash && (
        <div className="stack">
          {dash.placements.length === 0 && <p className="muted">Nothing pending.</p>}
          {dash.placements.map((p) => (
            <div className="card row" key={p.id} style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{p.worker}</strong> → {p.agency} · {p.country_code} {p.year} · <span className={p.status === "disputed" ? "case-pill urgent" : "case-pill"}>{p.status}</span>
                {p.evidence && <div className="small muted">Evidence: {p.evidence}</div>}
              </div>
              <div className="row">
                <button className="btn btn-sm" onClick={() => act("/api/legal/placements", { id: p.id, decision: "confirmed" })}>Confirm</button>
                <button className="btn btn-ghost btn-sm" onClick={() => act("/api/legal/placements", { id: p.id, decision: "rejected" })}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "reviews" && dash && (
        <div className="stack">
          {dash.reviews.map((r) => (
            <div className="card row" key={r.id} style={{ justifyContent: "space-between" }}>
              <div style={{ maxWidth: 680 }}>
                <strong>{r.agency}</strong> · {"★".repeat(r.rating)} · {r.status}
                <div className="small">{r.body}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => act("/api/legal/reviews", { id: r.id, status: r.status === "hidden" ? "published" : "hidden" })}>
                {r.status === "hidden" ? "Publish" : "Hide"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CasePanel({ caseRef, onChange }: { caseRef: string; onChange: () => Promise<void> }) {
  const [d, setD] = useState<CaseDetail | null>(null);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const { busy, error, run } = useBusy();

  const load = useCallback(async () => {
    const r = await api<CaseDetail>(`/api/cases/${caseRef}`);
    if (r.ok) setD(r.data);
  }, [caseRef]);
  useEffect(() => {
    void load();
  }, [load]);

  const update = (body: Record<string, unknown>) =>
    run(async () => {
      const r = await api(`/api/legal/cases/${caseRef}`, "PATCH", body);
      if (!r.ok) throw new Error(r.data.error ?? "Update failed");
      await Promise.all([load(), onChange()]);
    });

  if (!d) return <p className="muted">লোড হচ্ছে…</p>;
  const c = d.case;
  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{c.ref}</h2>
        <button className="btn btn-sm" disabled={busy} onClick={() => update({ assignToMe: true })}>Assign to me</button>
      </div>
      <div className="small">
        {CATEGORIES[c.category].en} · in {c.where_now} {c.country_code} · lost {c.amount_lost_bdt ? `Tk ${c.amount_lost_bdt.toLocaleString("en-IN")}` : "n/a"}
        <br />
        Agency: {c.agency_text || "not given"} {c.agency_id ? "(registered on platform)" : ""}
        <br />
        Reporter: {d.reporter ? `${d.reporter.name}, ${d.reporter.phone}` : "did not consent to contact"}
      </div>
      <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{c.description}</p>
      <div className="row">
        <label htmlFor="cp-status" className="small">Status</label>
        <select id="cp-status" value={c.status} disabled={busy} onChange={(e) => update({ status: e.target.value })}>
          {STATUSES.filter((s) => s !== "self_help").map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="row small" style={{ gap: 6 }}>
          <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={c.substantiated} disabled={busy || !c.agency_id} onChange={(e) => update({ substantiated: e.target.checked })} />
          Substantiated against agency
        </label>
      </div>
      <ol className="timeline">
        {d.events.map((e) => (
          <li key={e.id} className={e.internal ? "internal" : ""}>
            <div className="small muted">{e.actor_role} · {e.kind} · {new Date(e.created_at).toLocaleString()}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{e.body}</div>
          </li>
        ))}
      </ol>
      <div className="field">
        <label htmlFor="cp-msg">Message to the worker (visible to them)</label>
        <textarea id="cp-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cp-note">Internal note (staff only)</label>
        <textarea id="cp-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <ErrorLine error={error} />
      <button
        className="btn"
        disabled={busy || (!message.trim() && !note.trim())}
        onClick={() => update({ message: message || undefined, note: note || undefined }).then(() => { setMessage(""); setNote(""); })}
      >
        Save
      </button>
      <details>
        <summary className="small">Referral channels for this case</summary>
        <ul className="small">{d.referrals.map((r) => <li key={r.en}>{r.en}: {r.contact}</li>)}</ul>
      </details>
    </div>
  );
}
