"use client";

import { useState } from "react";
import { useJourney } from "@/components/journey.tsx";
import { DEMO_AGENCIES, lookupAgency, showSponsoredBadge, SPONSOR_COMPLAINT_LIMIT, type Agency } from "@/lib/data/agencies.ts";

const STATUS = {
  valid: { bn: "বৈধ লাইসেন্স", color: "var(--safe)" },
  suspended: { bn: "লাইসেন্স স্থগিত", color: "var(--caution)" },
  cancelled: { bn: "লাইসেন্স বাতিল", color: "var(--danger)" },
};

function AgencyCard({ a }: { a: Agency }) {
  const s = STATUS[a.licenceStatus];
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{a.name}</h3>
        {showSponsoredBadge(a) && <span className="badge">Sponsored</span>}
      </div>
      <div className="small muted">{a.rl} · {a.district}</div>
      <p style={{ color: s.color, fontWeight: 700, margin: "8px 0" }}>{s.bn} · {a.licenceStatus}</p>
      <div className="small">Verified complaints: <strong>{a.verifiedComplaints}</strong> · Placements last year: {a.placementsLastYear}</div>
    </div>
  );
}

export default function AgencyPage() {
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState(false);
  const { complete } = useJourney();
  const found = searched ? lookupAgency(q) : undefined;

  return (
    <div className="container section">
      <h1>এজেন্সি যাচাই</h1>
      <p className="muted">
        Check a recruiting agency's licence (RL number) and complaint record before you pay.
        <span className="en">
          Demo data: the agencies below are fictional. In production this is synced from BMET's published licence list.
        </span>
      </p>
      <form
        className="card row"
        onSubmit={(e) => {
          e.preventDefault();
          setSearched(true);
          if (q.trim()) complete("verified_agency");
        }}
      >
        <input aria-label="Agency name or RL number" value={q} onChange={(e) => { setQ(e.target.value); setSearched(false); }} placeholder="RL নম্বর বা নাম, e.g. RL-1003" style={{ flex: 1, minWidth: 200 }} />
        <button className="btn" type="submit">খুঁজুন</button>
      </form>
      {searched && (
        <div style={{ marginTop: 16 }}>
          {found ? (
            <AgencyCard a={found} />
          ) : (
            <div className="verdict verdict-caution">
              <strong>পাওয়া যায়নি · Not found.</strong> Never pay an agency you can't find on the BMET licence list. Ask them for their RL number.
            </div>
          )}
        </div>
      )}
      <h2 style={{ marginTop: 32 }}>Demo directory</h2>
      <div className="grid grid-3">
        {DEMO_AGENCIES.map((a) => (
          <AgencyCard key={a.rl} a={a} />
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>🔒 How sponsorship works</h3>
        <p className="small muted" style={{ margin: 0 }}>
          Agencies can pay to be listed and labelled &ldquo;Sponsored&rdquo;, but payment never affects risk scores. An agency loses the
          label automatically when its licence isn't valid or it has more than {SPONSOR_COMPLAINT_LIMIT} verified complaints.
        </p>
      </div>
    </div>
  );
}
