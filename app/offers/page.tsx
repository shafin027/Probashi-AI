"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OfferCard, type Offer } from "@/components/offers.tsx";
import { api, TrustRing, type TrustView } from "@/components/trust.tsx";
import { COUNTRIES } from "@/lib/data/countries.ts";

type PublicOffer = Offer & { agency: { id: string; name: string; rl: string; trust: TrustView } };

export default function OffersPage() {
  const [country, setCountry] = useState("");
  const [offers, setOffers] = useState<PublicOffer[] | null>(null);

  useEffect(() => {
    let live = true;
    setOffers(null);
    void api<{ offers: PublicOffer[] }>(`/api/offers${country ? `?country=${country}` : ""}`).then((r) => live && setOffers(r.ok ? r.data.offers : []));
    return () => {
      live = false;
    };
  }, [country]);

  return (
    <div className="container section stack">
      <h1>যাচাইকৃত অফার</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        শুধু সরকারি লাইসেন্সধারী ও যাচাইকৃত এজেন্সির অফার। প্রতিটি অফার আমাদের নিয়ম-ইঞ্জিন পার করেছে এবং সরকার নির্ধারিত খরচের মধ্যে।
        <span className="en">
          Only offers from agencies verified against the official licence list. Offers above the government cost ceiling, with free/visit
          visas or other red flags, are blocked automatically. Still: never pay without a receipt, and pay only the agency.
        </span>
      </p>
      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor="offer-country">দেশ · Country</label>
        <select id="offer-country" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">সব দেশ · All countries</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.nameBn} · {c.name}</option>)}
        </select>
      </div>
      {offers === null && <p className="muted">লোড হচ্ছে…</p>}
      {offers?.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>এখনো কোনো যাচাইকৃত অফার নেই · No verified offers yet{country ? " for this country" : ""}.</p>
          <p className="small muted">Got an offer from somewhere else? <Link href="/check">Check it here for free</Link>.</p>
        </div>
      )}
      <div className="grid grid-2">
        {offers?.map((o) => (
          <OfferCard key={o.id} o={o}>
            <Link href={`/agency/${encodeURIComponent(o.agency.rl)}`} className="row" style={{ marginTop: 12, textDecoration: "none", color: "inherit" }}>
              <TrustRing trust={o.agency.trust} size="sm" />
              <span className="small"><strong>{o.agency.name}</strong> · {o.agency.rl} →</span>
            </Link>
          </OfferCard>
        ))}
      </div>
    </div>
  );
}
