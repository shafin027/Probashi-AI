import Link from "next/link";
import { WHY_FAQ } from "@/lib/faq.ts";

const STATS = [
  { value: "11.3 লাখ", label: "people went abroad for work in 2025", src: "BMET / RMMRU" },
  { value: "$35.6B", label: "remittance in FY2025-26, a record", src: "Bangladesh Bank via Prothom Alo" },
  { value: "৫.৭×", label: "up to this much: real Malaysia cost vs. the Tk 78,990 official limit", src: "Dhaka Tribune / Ministry" },
  { value: "২৪%", label: "of complainants with work permits actually got the job", src: "BMET arbitration study, TBS" },
];

const STEPS = [
  { t: "ছবি তুলুন বা বলুন", e: "Snap the visa, contract or WhatsApp offer, or just describe it by voice." },
  { t: "এআই পড়ে ও যাচাই করে", e: "AI reads the document, our rule engine checks it against laws, official costs and the licence list." },
  { t: "সবুজ / হলুদ / লাল", e: "You get a clear signal, the reasons in Bangla, and exactly what to do next." },
  { t: "পরিবারকে পাঠান", e: "Share the report with your family so the decision isn't made alone." },
];

const PLANS = [
  {
    name: "ফ্রি যাচাই",
    en: "Free Safety Check",
    price: "৳0",
    per: "forever",
    features: ["Red-flag scan of any offer", "True-cost calculator", "Agency licence lookup", "Bangla voice Q&A", "Emergency helplines"],
    cta: "Start free",
    href: "/check",
  },
  {
    name: "পূর্ণ রিপোর্ট",
    en: "Verified Offer Report",
    price: "৳299",
    per: "one time, per offer",
    features: ["AI document reading (visa, contract, IPA)", "Full cost breakdown and repayment plan", "Bangla negotiation script", "Questions to ask the agency", "Printable report for the family", "Money back if we miss a red flag"],
    cta: "Check an offer",
    href: "/check",
    featured: true,
  },
  {
    name: "ফ্যামিলি প্ল্যান",
    en: "Family Plan",
    price: "৳149",
    per: "per month",
    features: ["Unlimited offer reports", "Remittance and savings planner", "Debt payoff tracker", "Document checklist for the family", "Priority human callback"],
    cta: "See the planner",
    href: "/plan",
  },
];

const REVENUE = [
  ["Verified Offer Report", "৳299 per report", "AI cost about ৳10–20, payment fee about 2%, so about 90% gross margin"],
  ["Family Plan", "৳149/month", "Recurring revenue from families in Bangladesh"],
  ["Licensed remittance partners", "Referral bounty per activated user", "User gets a better legal rate than hundi"],
  ["Skills and language courses", "15–20% commission", "Skilled workers earn more and pay off debt faster"],
  ["Migrant insurance and fair loans", "10–15% commission", "Cheaper than informal moneylenders"],
  ["Verified agency listing", "৳5,000–15,000/month", "Labelled \"Sponsored\". Can never change a risk score"],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge">বিদেশে কাজ · Safe migration</span>
            <h1 style={{ marginTop: 12 }}>
              টাকা দেওয়ার আগে <span>যাচাই করুন</span>
            </h1>
            <p className="hero-lead">
              Probashi AI checks your overseas job offer, agency and price in plain Bangla <em>before</em> you hand over lakhs of taka to
              a dalal.
              <span className="en">AI safety copilot for Bangladeshi migrant workers and their families.</span>
            </p>
            <div className="row hero-cta">
              <Link className="btn" href="/check">অফার চেক করুন (ফ্রি)</Link>
              <Link className="btn btn-ghost" href="/ask">🎤 বাংলায় প্রশ্ন করুন</Link>
            </div>
            <div className="trust" aria-label="Why people trust it">
              <span>ফ্রি নিরাপত্তা যাচাই</span>
              <span>কাগজ সংরক্ষণ হয় না</span>
              <span>Sources on every fact</span>
              <span>Voice-first Bangla</span>
            </div>
          </div>
          <div className="phone" aria-label="Example result" role="img">
            <div className="phone-screen">
              <div className="small muted">অফার চেক · Saudi Arabia</div>
              <div className="phone-row" style={{ marginTop: 10 }}>
                <div className="ring sm" data-score="0" style={{ ["--v" as string]: 4 }} />
                <div>
                  <strong style={{ color: "var(--danger)", fontSize: "1.1rem" }}>বিপদ! টাকা দেবেন না</strong>
                  <div className="small muted">Danger: 6 high-risk flags</div>
                </div>
              </div>
              <div className="mini-flag">ফ্রি/আজাদ ভিসা: illegal in the Gulf</div>
              <div className="mini-flag">খরচ সরকারি সীমার ৩.৯ গুণ</div>
              <div className="mini-flag">টাকা দালালকে দেওয়া হচ্ছে</div>
              <div className="mini-flag med">পাসপোর্ট দালালের কাছে</div>
              <div className="btn btn-sm" style={{ width: "100%", marginTop: 12 }}>পরিবারকে পাঠান</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="problem">
        <div className="container">
          <h2>সমস্যা: The problem nobody has solved</h2>
          <p className="muted" style={{ maxWidth: 760 }}>
            Bangladesh runs on remittances, yet its workers pay some of the highest migration costs in the world, mostly to middlemen.
            Government apps handle registration. Nobody tells the worker, in their own language, whether <em>this</em> offer at <em>this</em>{" "}
            price is real.
          </p>
          <div className="grid grid-4" style={{ marginTop: 20 }}>
            {STATS.map((s) => (
              <div className="card" key={s.label}>
                <div className="stat">{s.value}</div>
                <div>{s.label}</div>
                <div className="small muted">Source: {s.src}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="container">
          <h2>কীভাবে কাজ করে · How it works</h2>
          <div className="grid grid-4" style={{ marginTop: 20 }}>
            {STEPS.map((s, i) => (
              <div className="card" key={s.t}>
                <div className="badge">ধাপ {i + 1}</div>
                <h3 style={{ marginTop: 10 }}>{s.t}</h3>
                <p className="muted small">{s.e}</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            <h3>Under the hood</h3>
            <p className="muted small" style={{ margin: 0 }}>
              <strong>Claude (Anthropic) vision AI</strong> reads visas, contracts and offer messages and writes the verdict in Bangla.
              A <strong>transparent rule engine</strong> checks official cost ceilings, minimum wages, visa types, licence status and known
              scam corridors. AI can add warnings but can never remove a rule-based one. Every fact shows its source.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="why">
        <div className="container">
          <h2>কেন আমরা? · Your &ldquo;why&rdquo; questions, answered</h2>
          <div className="grid grid-2" style={{ marginTop: 20 }}>
            {WHY_FAQ.map((f) => (
              <details className="card" key={f.q}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  {f.qBn}
                  <span className="en">{f.q}</span>
                </summary>
                <p style={{ marginTop: 12 }}>{f.aBn}</p>
                <p className="muted small">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <h2>মূল্য · Pricing that pays for itself</h2>
          <p className="muted">One fake offer costs ৳4–9 lakh. A report costs less than a phone recharge.</p>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            {PLANS.map((p) => (
              <div className={`card ${p.featured ? "plan-featured" : ""}`} key={p.name}>
                {p.featured && <span className="badge">Most popular</span>}
                <h3 style={{ marginTop: 8 }}>
                  {p.name}
                  <span className="en">{p.en}</span>
                </h3>
                <div className="price">{p.price}</div>
                <div className="small muted">{p.per}</div>
                <ul className="small" style={{ paddingLeft: 18 }}>
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link className={`btn ${p.featured ? "" : "btn-ghost"}`} href={p.href} style={{ width: "100%" }}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="business">
        <div className="container">
          <h2>ব্যবসা ও ভারসাম্য · Business model with checks and balances</h2>
          <div className="card table-wrap" style={{ marginTop: 16 }}>
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
          </div>
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
    </>
  );
}
