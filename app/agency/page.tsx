"use client";

import { useState } from "react";
import Link from "next/link";
import { useJourney } from "@/components/journey.tsx";
import { api, ErrorLine, LicenceLine, TrustRing, useBusy, type RegistryView, type TrustView } from "@/components/trust.tsx";
import { DEMO_AGENCIES, lookupAgency } from "@/lib/data/agencies.ts";

type Result = { rl: string; registry: RegistryView; profile: { id: string; status: string } | null; trust: TrustView };

export default function AgencyPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [registrySize, setRegistrySize] = useState<number | null>(null);
  const { busy, error, setError, run } = useBusy();
  const { complete } = useJourney();

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return setError("এজেন্সির নাম বা RL নম্বর লিখুন · Type a name or RL number");
    await run(async () => {
      const res = await api<{ results: Result[]; registrySize: number }>(`/api/agencies?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error(res.data.error ?? "Search failed");
      setResults(res.data.results);
      setRegistrySize(res.data.registrySize);
      complete("verified_agency");
    });
  }

  // Without a database (offline demo) the page falls back to the fictional demo list.
  const offline = registrySize === 0;
  const demoHit = offline && results?.length === 0 ? lookupAgency(q) : undefined;

  return (
    <div className="container section stack">
      <h1>এজেন্সি যাচাই</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        টাকা দেওয়ার আগে দেখুন এজেন্সির সরকারি লাইসেন্স (RL নম্বর) আছে কি না, আর যারা এই এজেন্সি দিয়ে বিদেশে গেছেন তারা কী বলছেন।
        <span className="en">
          Every agency is checked against BMET&apos;s official recruiting-agency licence list (RAIMS). The confidence score comes from the
          licence, reviews from workers whose placement was confirmed, and complaints our legal-aid team substantiated. No agency can pay
          to change it.
        </span>
      </p>

      <form className="card row" onSubmit={search} role="search">
        <label htmlFor="agency-q" className="sr-only">Agency name or RL number</label>
        <input id="agency-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="RL নম্বর বা নাম, যেমন RL-1002" style={{ flex: 1, minWidth: 200 }} />
        <button className="btn" type="submit" disabled={busy}>{busy ? "খুঁজছি…" : "খুঁজুন · Search"}</button>
      </form>
      <ErrorLine error={error} />

      {results && (
        <div className="stack" aria-live="polite">
          {results.map((r) => (
            <Link key={r.rl} href={`/agency/${encodeURIComponent(r.rl)}`} className="card card-link" style={{ display: "block" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{r.registry.name}</h3>
                  <div className="small muted">{r.rl} · {r.registry.address}</div>
                  <LicenceLine reg={r.registry} />
                  {r.profile?.status === "verified" && <span className="badge">✓ Probashi AI-তে যাচাইকৃত · Verified account</span>}
                </div>
                <TrustRing trust={r.trust} size="sm" />
              </div>
            </Link>
          ))}
          {results.length === 0 && !demoHit && (
            <div className="verdict verdict-danger">
              <strong>সরকারি লাইসেন্স তালিকায় পাওয়া যায়নি · Not on the official licence list.</strong> Never pay an agency you can&apos;t find
              here. Ask for the RL number and check again, or <Link href="/help">report the agency</Link>.
            </div>
          )}
          {demoHit && (
            <div className="card">
              <h3 style={{ margin: 0 }}>{demoHit.name}</h3>
              <div className="small muted">{demoHit.rl} · {demoHit.district} · demo data</div>
              <p style={{ fontWeight: 700 }}>{demoHit.licenceStatus}</p>
            </div>
          )}
        </div>
      )}

      {offline && (
        <div className="card small muted">
          Offline demo: the live licence list is not connected, so these fictional agencies are shown:{" "}
          {DEMO_AGENCIES.map((a) => `${a.rl} ${a.name}`).join(" · ")}
        </div>
      )}

      <div className="grid grid-3">
        <div className="card">
          <h3>🏛️ সরকারি তালিকা</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Licence data comes from BMET&apos;s RAIMS list and is refreshed regularly. Each agency is re-checked every day; a lapsed, suspended
            or cancelled licence hides all its offers immediately.
          </p>
        </div>
        <div className="card">
          <h3>🧾 যাচাইকৃত রিভিউ</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Only workers who really went through the agency can review it: the agency or our team must confirm the placement. Agencies can
            reply but can&apos;t delete reviews.
          </p>
        </div>
        <div className="card">
          <h3>⚖️ অভিযোগ ও আইনি সহায়তা</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Had a problem with an agency? <Link href="/help">Report it</Link>. Our legal-aid team follows up, and complaints they substantiate
            lower the agency&apos;s score.
          </p>
        </div>
      </div>
      <p className="small muted">
        Are you a licensed agency? <Link href="/partner">Register and publish verified offers</Link>.
      </p>
    </div>
  );
}
