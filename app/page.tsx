import Link from "next/link";
import { WHY_FAQ } from "@/lib/faq.ts";
import { JourneyTeaser, LiveStats, Reveal, TrustFigure } from "@/components/landing.tsx";

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
            <LiveStats />
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

      <section className="container" style={{ marginTop: -12, marginBottom: 24 }}>
        <JourneyTeaser />
      </section>

      <section className="section section-alt" id="problem">
        <div className="container">
          <h2>সমস্যা: যা কেউ সমাধান করেনি</h2>
          <p style={{ maxWidth: 760 }}>
            প্রবাসীদের পাঠানো টাকায় দেশ চলে, অথচ বিদেশ যেতে আমাদের শ্রমিকরা দুনিয়ার সবচেয়ে বেশি খরচ দেন, যার বেশিরভাগ যায় দালালের পকেটে।
            সরকারি অ্যাপে রেজিস্ট্রেশন হয়, কিন্তু টাকা দেওয়ার আগে কেউ বলে দেয় না: <em>এই</em> অফার, <em>এই</em> দামে, আসল কি না।
            <span className="en">Workers pay some of the world&apos;s highest migration costs, mostly to middlemen. Nobody tells them, in their own language, whether this offer at this price is real.</span>
          </p>
          <Reveal className="grid grid-4" delay={0.05}>
            {STATS.map((s) => (
              <div className="card" key={s.label}>
                <div className="stat">{s.value}</div>
                <div>{s.label}</div>
                <div className="small muted">Source: {s.src}</div>
              </div>
            ))}
          </Reveal>
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

      <section className="section" id="trust">
        <div className="container trust-grid">
          <Reveal>
            <span className="badge">বিশ্বাস ও নিরাপত্তা · Trust</span>
            <h2 style={{ marginTop: 10 }}>আপনার কাগজ, আপনার টাকা: তালাবদ্ধ</h2>
            <ul className="trust-list">
              <li><strong>কাগজ সংরক্ষণ হয় না।</strong> Documents are used once for your check, then discarded. Agencies never see them.</li>
              <li><strong>স্কোর কেনা যায় না।</strong> Risk comes from laws, licences and documents. Sponsored agencies are labelled and can&apos;t change scores.</li>
              <li><strong>প্রতিটি তথ্যের উৎস।</strong> Every cost limit and warning shows where it comes from (BMET, Ministry, ILO, news).</li>
              <li><strong>ব্যাংক-মানের সুরক্ষা।</strong> HTTPS, strict CSP, encrypted reports, hashed passwords, delete-my-data anytime.</li>
              <li><strong>আমরা কীভাবে আয় করি, খোলাখুলি।</strong> Free safety checks forever; we earn from optional reports and clearly disclosed partners.</li>
            </ul>
            <a className="btn btn-ghost" href="/privacy">কীভাবে সুরক্ষিত রাখি · How we protect you →</a>
          </Reveal>
          <Reveal delay={0.1}>
            <TrustFigure kind="vault" />
          </Reveal>
        </div>
      </section>

      <section className="section section-alt" id="journey">
        <div className="container">
          <Reveal>
            <span className="badge">নিরাপদ যাত্রা · Your safety journey</span>
            <h2 style={{ marginTop: 10 }}>টাকা দেওয়া থেকে বিদেশে পৌঁছানো পর্যন্ত, প্রতিটি ধাপে পাশে আছি</h2>
            <p className="muted" style={{ maxWidth: 720 }}>
              প্রতিটি কাজ আপনার নিরাপত্তা স্কোর বাড়ায়, আর সবসময় দেখায় পরের জরুরি কাজ কোনটা।
              <span className="en">Every real step raises your readiness score, and the next step is always one tap away.</span>
            </p>
          </Reveal>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            {[
              { n: "১", t: "টাকা দেওয়ার আগে", e: "Check the offer, verify the agency, know the true cost, register with BMET.", i: "🛡️" },
              { n: "২", t: "বিদেশে পৌঁছে", e: "Keep your passport, check your salary, send money home safely.", i: "✈️" },
              { n: "৩", t: "অন্যকে রক্ষা করুন", e: "Help a friend or relative check their offer before they pay.", i: "🤝" },
            ].map((p, k) => (
              <Reveal key={p.t} delay={0.05 * k}>
                <div className="card phase-card">
                  <div className="phase-icon" aria-hidden>{p.i}</div>
                  <div className="small muted">ধাপ {p.n}</div>
                  <h3 style={{ margin: "4px 0" }}>{p.t}</h3>
                  <p className="small muted" style={{ margin: 0 }}>{p.e}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="row" style={{ marginTop: 20 }}>
            <Link className="btn" href="/journey">আমার প্রস্তুতি দেখুন →</Link>
            <Link className="small" href="/quiz">🕵️ ২ মিনিটের প্রতারণা-চেনার কুইজ · Quick scam quiz</Link>
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

      <section className="section section-alt">
        <div className="container center">
          <p className="muted" style={{ marginBottom: 12 }}>বিচারক, পার্টনার বা বিনিয়োগকারী? · Judges, partners and investors</p>
          <Link className="btn btn-ghost" href="/about">ব্যবসায়িক মডেল ও পরিকল্পনা দেখুন · Business model &amp; roadmap →</Link>
        </div>
      </section>
    </>
  );
}
