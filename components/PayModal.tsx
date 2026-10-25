"use client";

import { useState } from "react";

type Premium = { negotiationScriptBn: string; questionsToAskAgency: string[] };

// Checkout. The paid report stays sealed (encrypted) in the browser; only the server can
// open it after payment. In demo mode (PAYMENT_MODE=demo) no real money is charged.
export function PayModal({
  open,
  amount,
  token,
  onClose,
  onPaid,
}: {
  open: boolean;
  amount: number;
  token: string | null;
  onClose: () => void;
  onPaid: (p: Premium) => void;
}) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;
  const valid = /^01[3-9]\d{8}$/.test(phone);

  async function pay() {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Payment failed");
      onPaid(json.premium);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pay-title" className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal">
        <h3 id="pay-title">পূর্ণ রিপোর্ট · ৳{amount}</h3>
        <p className="small muted">Pay with bKash / Nagad. <strong>Demo mode: no real money is charged.</strong></p>
        <div className="field">
          <label htmlFor="phone">মোবাইল নম্বর</label>
          <input id="phone" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} />
        </div>
        <p className="small muted">↩️ If this report misses a red flag it should have caught, you get your money back.</p>
        {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="row">
          <button className="btn btn-accent" type="button" disabled={!valid || busy || !token} onClick={pay}>
            {busy ? "Processing…" : `Pay ৳${amount} (demo)`}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            বাতিল
          </button>
        </div>
      </div>
    </div>
  );
}
