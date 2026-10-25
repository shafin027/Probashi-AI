"use client";

import { bn } from "./trust.tsx";
import { COUNTRIES } from "@/lib/data/countries.ts";

export type Offer = { id: string; country_code: string; job_title: string; employer: string; salary_local: number; total_cost_bdt: number; contract_months: number; seats: number; details: string; expires_at: string };

const country = (code: string) => COUNTRIES.find((c) => c.code === code);

export function OfferCard({ o, children }: { o: Offer; children?: React.ReactNode }) {
  const c = country(o.country_code);
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>{o.job_title}</strong>
        <span className="badge">{c?.nameBn ?? o.country_code}</span>
      </div>
      <div className="small muted">{o.employer} · {bn(o.contract_months)} মাসের চুক্তি · {bn(o.seats)}টি পদ</div>
      <p style={{ margin: "8px 0" }}>
        বেতন <strong>{c?.currency} {bn(o.salary_local)}</strong>/মাস · মোট খরচ <strong>৳{bn(o.total_cost_bdt)}</strong>
        {c?.officialCostBdt && <span className="small" style={{ color: "var(--safe)" }}> ✓ সরকারি সীমা ৳{bn(c.officialCostBdt)}-এর মধ্যে</span>}
      </p>
      {o.details && <p className="small muted" style={{ margin: 0 }}>{o.details}</p>}
      {children}
    </div>
  );
}

