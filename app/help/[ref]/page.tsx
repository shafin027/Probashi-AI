"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useFeatures } from "@/components/features.tsx";
import { api, ErrorLine, useBusy } from "@/components/trust.tsx";
import { CATEGORIES, STATUS_BN, type Category, type CaseStatus } from "@/lib/case-meta.ts";

type CaseEvent = { id: string; actor_role: string; kind: string; body: string; internal: boolean; created_at: string };
type CaseData = {
  case: { ref: string; category: Category; description: string; status: CaseStatus; tier: string; urgent: boolean; agency_text: string; created_at: string };
  events: CaseEvent[];
  referrals: { bn: string; en: string; contact: string }[];
};

const WHO: Record<string, string> = { worker: "আপনি", legal: "কেসওয়ার্কার", admin: "আইনি টিম", system: "সিস্টেম" };

export default function CasePage() {
  const { ref } = useParams<{ ref: string }>();
  const { me, loaded } = useFeatures();
  const [data, setData] = useState<CaseData | null>(null);
  const [missing, setMissing] = useState("");
  const [msg, setMsg] = useState("");
  const { busy, error, run } = useBusy();

  const load = useCallback(async () => {
    const r = await api<CaseData>(`/api/cases/${encodeURIComponent(ref)}`);
    if (r.ok) setData(r.data);
    else setMissing(r.data.error ?? "Not found");
  }, [ref]);
  useEffect(() => {
    if (me) void load();
  }, [me, load]);

  if (loaded && !me) return <div className="container section"><Link className="btn" href="/login">লগইন করুন · Log in to see this case</Link></div>;
  if (missing) return <div className="container section"><p>{missing}</p><Link href="/help">← সাহায্য</Link></div>;
  if (!data) return <div className="container section muted">লোড হচ্ছে…</div>;
  const c = data.case;

  return (
    <div className="container section stack" style={{ maxWidth: 820 }}>
      <Link href="/help" className="small">← আমার রিপোর্ট</Link>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: "1.6rem" }}>{c.ref}</h1>
          {c.urgent && <span className="case-pill urgent">জরুরি · Urgent</span>}
        </div>
        <p style={{ margin: "6px 0" }}><strong>{CATEGORIES[c.category].bn}</strong> · {CATEGORIES[c.category].en}</p>
        <p className="small" style={{ margin: 0 }}>Status: <strong>{STATUS_BN[c.status]}</strong></p>
        {c.agency_text && <p className="small muted" style={{ margin: "4px 0 0" }}>Agency: {c.agency_text}</p>}
        <p className="small muted" style={{ whiteSpace: "pre-wrap" }}>{c.description}</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>আপডেট · Timeline</h2>
        <ol className="timeline">
          {data.events.map((e) => (
            <li key={e.id} className={e.internal ? "internal" : ""}>
              <div className="small muted">{WHO[e.actor_role] ?? e.actor_role} · {new Date(e.created_at).toLocaleString("bn-BD")}{e.internal && " · internal note"}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{e.body}</div>
            </li>
          ))}
        </ol>
        {me?.role === "worker" && c.status !== "closed" && (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const r = await api(`/api/cases/${encodeURIComponent(c.ref)}`, "POST", { message: msg });
                if (!r.ok) throw new Error(r.data.error ?? "Could not send");
                setMsg("");
                await load();
              });
            }}
          >
            <label htmlFor="case-msg" className="sr-only">Message to the legal-aid team</label>
            <input id="case-msg" style={{ flex: 1, minWidth: 200 }} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="আইনি টিমকে বার্তা লিখুন…" />
            <button className="btn" disabled={busy || !msg.trim()}>পাঠান · Send</button>
          </form>
        )}
        <ErrorLine error={error} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>বিনামূল্যে সরকারি সহায়তা · Official free channels</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {data.referrals.map((r) => <li key={r.en}>{r.bn} · <span className="muted">{r.en}</span>: <strong>{r.contact}</strong></li>)}
        </ul>
        {c.tier === "self_help" && <p className="small" style={{ marginBottom: 0 }}><Link href="/premium">Premium</Link> forwards this report to a caseworker.</p>}
      </div>
    </div>
  );
}
