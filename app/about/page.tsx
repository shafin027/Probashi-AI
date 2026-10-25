import Link from "next/link";
import { Reveal } from "@/components/landing.tsx";

export const metadata = { title: "About & Business Model | Probashi AI" };

const REVENUE = [
  ["Verified Offer Report", "৳299 per report", "AI cost about ৳10–20, payment fee about 2%, so about 90% gross margin"],
  ["Family Plan", "৳149/month", "Recurring revenue from families in Bangladesh"],
  ["Licensed remittance partners", "Referral bounty per activated user", "User gets a better legal rate than hundi"],
  ["Skills and language courses", "15–20% commission", "Skilled workers earn more and pay off debt faster"],
  ["Migrant insurance and fair loans", "10–15% commission", "Cheaper than informal moneylenders"],
  ["Verified agency listing", "৳5,000–15,000/month", "Labelled \"Sponsored\". Can never change a risk score"],
];

export default function AboutPage() {
  return (
    <>
      <section className="section">
        <div className="container prose">
          <span className="badge">About Probashi AI</span>
          <h1 style={{ marginTop: 10 }}>ব্যবসা, ভারসাম্য ও পরিকল্পনা</h1>
          <p className="muted">
            For judges, partners and investors: how Probashi AI sustains itself without exploiting the people it protects.
          </p>
        </div>
      </section>
      <section className="section section-alt" id="business">
        <div className="container">
          <h2>ব্যবসা ও ভারসাম্য · Business model with checks and balances</h2>
          <Reveal className="card table-wrap">
            <table className="small">
              <thead>
                <tr><th>Revenue stream</th><th>Price</th><th>Why it's fair</th></tr>
              </thead>
              <tbody>
                {REVENUE.map((r) => (
                  <tr key={r[0]}><td><strong>{r[0]}</strong></td><td>{r[1]}</td><td className="muted">{r[2]}</td></tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <div className="grid grid-3" style={{ marginTop: 16 }}>
            <div className="card"><h3>🔒 Scores can't be bought</h3><p className="small muted">Risk comes only from documents, rules, licences and verified complaints.</p></div>
            <div className="card"><h3>🏷️ Every commission is shown</h3><p className="small muted">&ldquo;We earn ৳X if you choose this partner.&rdquo; Licensed partners only.</p></div>
            <div className="card"><h3>↩️ Money-back promise</h3><p className="small muted">If the report misses a red flag it should have caught, the user gets a refund.</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="scale">
        <div className="container">
          <h2>বাংলাদেশ থেকে বিশ্বে · Built to scale</h2>
          <p className="muted" style={{ maxWidth: 760 }}>
            Nepal, India, Pakistan, Sri Lanka, the Philippines, Indonesia and East Africa send millions of workers through the same
            Gulf and Malaysia corridors, and face the same brokers. Only the country data pack changes; the AI and rule engine are shared.
          </p>
          <div className="row">
            <Link className="btn" href="/check">এখনই অফার চেক করুন</Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container center">
          <Link className="btn" href="/check">অফার চেক করুন (ফ্রি)</Link>
        </div>
      </section>
    </>
  );
}
