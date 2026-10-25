import Link from "next/link";
import { HELPLINES } from "@/lib/data/countries.ts";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="grid grid-3 small">
          <div>
            <strong>Probashi AI</strong>
            <p className="muted">টাকা দেওয়ার আগে যাচাই করুন। Check before you pay.</p>
          </div>
          <div className="links">
            <strong>জরুরি হেল্পলাইন</strong>
            <ul className="muted" style={{ paddingLeft: 18, margin: "6px 0" }}>
              {HELPLINES.map((h) => (
                <li key={h.name}>
                  {h.name}: <strong>{h.number}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="links">
            <strong>Product</strong>
            <ul className="muted" style={{ paddingLeft: 18, margin: "6px 0" }}>
              <li><Link href="/check">Offer Checker</Link></li>
              <li><Link href="/cost">True Cost Calculator</Link></li>
              <li><Link href="/agency">Agency Lookup</Link></li>
              <li><Link href="/ask">Ask in Bangla</Link></li>
              <li><Link href="/plan">Family &amp; Money Plan</Link></li>
            </ul>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>
          Probashi AI gives guidance, not legal advice. Always confirm with BMET (bmet.gov.bd) before paying. Figures are estimates with sources shown.
        </p>
        {/* Official watermark: replace public/yunet-watermark.svg with the organisers' file (keep the same name, or update src). */}
        <div className="watermark" id="watermark">
          <img src="/yunet-watermark.svg" alt="Built for YUNet AIgnite Buildathon 2026" />
          <span className="small muted">Built for YUNet AIgnite Buildathon 2026</span>
        </div>
      </div>
    </footer>
  );
}
