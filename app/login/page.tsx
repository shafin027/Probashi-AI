"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFeatures } from "@/components/features.tsx";

export default function LoginPage() {
  const router = useRouter();
  const { refreshMe, accounts, loaded } = useFeatures();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accountType, setAccountType] = useState<"worker" | "agency">("worker");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("type") === "agency") {
      setAccountType("agency");
      setMode("register");
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "register" ? { phone, name, password, accountType } : { phone, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      await refreshMe();
      const role = json.user?.role;
      router.push(role === "agency" ? "/partner" : role === "legal" || role === "admin" ? "/legal" : "/ask");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (loaded && !accounts) {
    return (
      <div className="container section auth-card">
        <h1>অ্যাকাউন্ট</h1>
        <p className="muted">Accounts are not available right now. You can still use every safety check without logging in.</p>
        <Link className="btn" href="/check">অফার চেক করুন</Link>
      </div>
    );
  }

  return (
    <div className="container section">
      <div className="card auth-card">
        <h1 style={{ fontSize: "1.8rem" }}>{mode === "login" ? "লগইন" : "নতুন অ্যাকাউন্ট"}</h1>
        <p className="muted small">
          With an account, Probashi AI remembers your earlier checks and questions, so advice gets more personal each time. Logging in is
          optional. Every safety check works without it.
        </p>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>লগইন · Log in</button>
          <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")}>নতুন · Sign up</button>
        </div>
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="field">
              <span className="field-label">অ্যাকাউন্টের ধরন · Account type</span>
              <div className="choice-row">
                <button type="button" className="choice" aria-pressed={accountType === "worker"} onClick={() => setAccountType("worker")}>কর্মী/পরিবার · Worker or family</button>
                <button type="button" className="choice" aria-pressed={accountType === "agency"} onClick={() => setAccountType("agency")}>লাইসেন্সধারী এজেন্সি · Licensed agency</button>
              </div>
            </div>
          )}
          {mode === "register" && (
            <div className="field">
              <label htmlFor="name">{accountType === "agency" ? "আপনার নাম (এজেন্সির প্রতিনিধি) · Your name" : "আপনার নাম · Name"}</label>
              <input id="name" autoComplete="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="phone">মোবাইল নম্বর · Mobile</label>
            <input id="phone" type="tel" inputMode="numeric" autoComplete="tel" required placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 16))} />
          </div>
          <div className="field">
            <label htmlFor="password">পাসওয়ার্ড · Password</label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                {show ? "🙈" : "👁"}
              </button>
            </div>
            {mode === "register" && <div className="hint">At least 8 characters. Don&apos;t reuse your bKash PIN.</div>}
          </div>
          {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "অপেক্ষা করুন…" : mode === "login" ? "লগইন করুন" : "অ্যাকাউন্ট খুলুন"}
          </button>
        </form>
        <p className="small muted" style={{ marginTop: 16 }}>
          🔒 Passwords are stored only as a salted scrypt hash. You can delete your account and all memories anytime. <Link href="/privacy">Privacy</Link>
        </p>
      </div>
    </div>
  );
}
