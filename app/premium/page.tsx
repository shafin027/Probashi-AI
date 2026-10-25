"use client";

import { useState } from "react";
import Link from "next/link";
import { useFeatures } from "@/components/features.tsx";
import { api, bn, ErrorLine, useBusy } from "@/components/trust.tsx";
import { PLANS, type PlanId } from "@/lib/plans.ts";

const FREE = [
  "অফার চেক, খরচ হিসাব, এজেন্সি যাচাই · Offer checks, cost calculator, agency lookup",
  "যাচাইকৃত অফার ও কর্মীদের রিভিউ · Verified offers and worker reviews",
  "রিপোর্ট করুন + সঠিক সরকারি চ্যানেল · File a report and get the right official channels",
  "জরুরি অবস্থায় সবসময় কেসওয়ার্কার · Emergencies always go to a caseworker",
];
const PREMIUM = [
  "প্রতিটি রিপোর্টে নিজস্ব কেসওয়ার্কার ও ফলো-আপ · A caseworker for every report, with follow-up",
  "এজেন্সির সাথে আপস ও বিএমইটি সালিশে সাহায্য · Help negotiating with the agency and filing BMET arbitration",
  "এআই ফোন লাইন: কল করে বাংলায় কথা বলুন, পিন দিয়ে পরিচয় যাচাই · AI phone line in Bangla, PIN-verified",
  "আপনার আগের কথা মনে রেখে পরামর্শ · Advice that remembers your situation",
];

export default function PremiumPage() {
  const { me, refreshMe, phoneLine } = useFeatures();
  const [plan, setPlan] = useState<PlanId>("yearly");
  const [done, setDone] = useState<string>("");
  const { busy, error, run } = useBusy();

  return (
    <div className="container section stack" style={{ maxWidth: 940 }}>
      <h1>প্রবাসী সুরক্ষা প্রিমিয়াম</h1>
      <p className="muted" style={{ maxWidth: 720 }}>
        সমস্যায় পড়লে একা লড়তে হবে না। একজন কেসওয়ার্কার আপনার কেস দেখবেন, আর যেকোনো সময় ফোন করে বাংলায় এআই সহকারীর সাথে কথা বলতে পারবেন।
        <span className="en">Safety checks stay free forever. Premium adds people: a legal-aid caseworker for your reports, and an AI phone line that knows you.</span>
      </p>
      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>ফ্রি · Free</h2>
          <div className="price">৳০</div>
          <ul className="small" style={{ paddingLeft: 18 }}>{FREE.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
        <div className="card plan-featured">
          <h2 style={{ marginTop: 0 }}>প্রিমিয়াম · Premium</h2>
          <div className="choice-row" role="group" aria-label="Billing">
            <button type="button" className="choice" aria-pressed={plan === "monthly"} onClick={() => setPlan("monthly")}>মাসিক ৳{bn(PLANS.monthly.bdt)}</button>
            <button type="button" className="choice" aria-pressed={plan === "yearly"} onClick={() => setPlan("yearly")}>বার্ষিক ৳{bn(PLANS.yearly.bdt)} (৩৭% কম)</button>
          </div>
          <div className="price" style={{ marginTop: 8 }}>৳{bn(PLANS[plan].bdt)}<span className="small muted"> / {plan === "monthly" ? "মাস" : "বছর"}</span></div>
          <ul className="small" style={{ paddingLeft: 18 }}>{PREMIUM.map((f) => <li key={f}>{f}</li>)}</ul>
          {me?.premium ? (
            <p style={{ color: "var(--safe)", fontWeight: 700 }}>✓ আপনি প্রিমিয়াম সদস্য · until {me.premiumUntil?.slice(0, 10)}</p>
          ) : me?.role === "worker" ? (
            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const r = await api<{ forwarded: number }>("/api/premium", "POST", { plan });
                  if (!r.ok) throw new Error(r.data.error ?? "Payment failed");
                  await refreshMe();
                  setDone(r.data.forwarded ? `${r.data.forwarded}টি রিপোর্ট কেসওয়ার্কারের কাছে পাঠানো হয়েছে।` : "স্বাগতম!");
                })
              }
            >
              বিকাশে পেমেন্ট (ডেমো) · Pay with bKash (demo)
            </button>
          ) : !me ? (
            <Link className="btn" href="/login">লগইন করে নিন · Log in to join</Link>
          ) : null}
          {done && <p role="status" style={{ color: "var(--safe)" }}>{done} <Link href="/account">ফোন পিন সেট করুন →</Link></p>}
          <ErrorLine error={error} />
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>📞 এআই ফোন লাইন কীভাবে কাজ করে · How the AI phone line works</h2>
        <ol className="small" style={{ paddingLeft: 18 }}>
          <li>Set a 4–6 digit phone PIN in <Link href="/account">your account</Link> (never your bKash PIN).</li>
          <li>Call {phoneLine ? <strong>{phoneLine}</strong> : "our number (shown here when the line is live)"}. A natural Bangla AI voice answers.</li>
          <li>It asks for your PIN. Only then can it see your reports and what you told us before.</li>
          <li>Check an offer or agency, ask about your case, or file a report by voice. It can connect you to a human caseworker.</li>
        </ol>
        <p className="small muted" style={{ margin: 0 }}>
          The AI never asks for passwords, OTPs or money PINs. Call recordings are not kept; we store only which actions were taken.
        </p>
      </div>
      <p className="small muted">
        Demo checkout: no real money is taken until live bKash/SSLCommerz payments are switched on. Cancel any time; your reports stay open.
      </p>
    </div>
  );
}
