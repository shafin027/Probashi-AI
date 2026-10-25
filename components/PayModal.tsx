"use client";

import { useState } from "react";

// Demo checkout. In production this calls the bKash Tokenized Checkout / SSLCommerz
// API from the server and unlocks the report only after a verified callback.
export function PayModal({ open, amount, onClose, onPaid }: { open: boolean; amount: number; onClose: () => void; onPaid: () => void }) {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"form" | "processing">("form");
  if (!open) return null;
  const valid = /^01[3-9]\d{8}$/.test(phone);

  function pay() {
    setStep("processing");
    setTimeout(() => {
      setStep("form");
      onPaid();
    }, 1200);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Payment" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
      <div className="card" style={{ maxWidth: 400, width: "100%" }}>
        <h3>পূর্ণ রিপোর্ট · ৳{amount}</h3>
        <p className="small muted">Pay with bKash / Nagad. <strong>Demo mode: no real money is charged.</strong></p>
        <div className="field">
          <label htmlFor="phone">মোবাইল নম্বর</label>
          <input id="phone" inputMode="numeric" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} />
        </div>
        <p className="small muted">↩️ If this report misses a red flag it should have caught, you get your money back.</p>
        <div className="row">
          <button className="btn btn-accent" type="button" disabled={!valid || step === "processing"} onClick={pay}>
            {step === "processing" ? "Processing…" : `Pay ৳${amount} (demo)`}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            বাতিল
          </button>
        </div>
      </div>
    </div>
  );
}
