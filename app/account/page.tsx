"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFeatures } from "@/components/features.tsx";

type Memory = { id: string; kind: string; content: string; created_at: string };

const KIND = { check: "অফার চেক", chat: "প্রশ্ন", profile: "তথ্য" } as Record<string, string>;

export default function AccountPage() {
  const router = useRouter();
  const { me, loaded, refreshMe } = useFeatures();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/memories", { cache: "no-store" });
    if (res.ok) setMemories((await res.json()).memories);
  }, []);

  useEffect(() => {
    if (loaded && !me) router.replace("/login");
    if (me) void load();
  }, [loaded, me, router, load]);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    try {
      await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
    } finally {
      setBusy(false);
    }
  }

  if (!me) return <div className="container section muted">লোড হচ্ছে…</div>;

  return (
    <div className="container section stack" style={{ maxWidth: 820 }}>
      <h1>আমার অ্যাকাউন্ট</h1>
      <div className="card row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <span className="avatar" style={{ width: 48, height: 48, fontSize: "1.2rem" }} aria-hidden>{me.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{me.name}</strong>
            <div className="small muted">{me.phone}</div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={async () => {
            await call("/api/auth/logout", "POST");
            // Full navigation: clears all client state and avoids racing the login redirect.
            window.location.assign("/");
          }}
        >
          লগআউট · Log out
        </button>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0 }}>🧠 মনে রাখা · Memory</h3>
            <p className="small muted" style={{ margin: "4px 0 0" }}>
              When on, we remember your checks and questions to personalise advice. Turning it off erases everything remembered.
            </p>
          </div>
          <label className="row" style={{ fontWeight: 600, margin: 0 }}>
            <input
              type="checkbox"
              style={{ width: 22, minHeight: 22 }}
              checked={me.memoryEnabled}
              disabled={busy}
              onChange={async (e) => {
                await call("/api/account", "PATCH", { memoryEnabled: e.target.checked });
                await refreshMe();
                await load();
              }}
            />
            {me.memoryEnabled ? "চালু" : "বন্ধ"}
          </label>
        </div>
        {me.memoryEnabled && (
          <div style={{ marginTop: 12 }}>
            {memories.length === 0 && <p className="muted small">Nothing remembered yet. <Link href="/check">Check an offer</Link> or <Link href="/ask">ask a question</Link>.</p>}
            {memories.map((m) => (
              <div className="memory-item" key={m.id}>
                <div>
                  <span className="badge">{KIND[m.kind] ?? m.kind}</span>
                  <div className="small" style={{ marginTop: 4 }}>{m.content.replace(/^User asked:\s*/, "আপনি জিজ্ঞেস করেছিলেন: ")}</div>
                  <div className="small muted">{new Date(m.created_at).toLocaleString("bn-BD")}</div>
                </div>
                <button className="btn btn-ghost btn-sm" aria-label="Forget this" disabled={busy} onClick={async () => { await call("/api/memories", "DELETE", { id: m.id }); await load(); }}>
                  ✕
                </button>
              </div>
            ))}
            {memories.length > 0 && (
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} disabled={busy} onClick={async () => { await call("/api/memories", "DELETE", {}); await load(); }}>
                সব মুছুন · Forget everything
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0 }}>{me.premium ? "⭐ প্রিমিয়াম সদস্য · Premium" : "ফ্রি সদস্য · Free plan"}</h3>
            <p className="small muted" style={{ margin: "4px 0 0" }}>
              {me.premium ? `Caseworker for every report and the AI phone line, until ${me.premiumUntil?.slice(0, 10)}.` : "Upgrade for a legal-aid caseworker and the AI phone line."}
            </p>
          </div>
          {!me.premium && me.role === "worker" && <Link className="btn btn-sm" href="/premium">প্রিমিয়াম · Upgrade</Link>}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <Link href="/help">আমার রিপোর্ট · My reports</Link>
        </div>
      </div>

      {me.premium && <PhonePin hasPin={me.hasPhonePin} onChange={refreshMe} />}

      <div className="card danger-zone">
        <h3>অ্যাকাউন্ট মুছুন · Delete account</h3>
        <p className="small muted">Permanently deletes your account, sessions and all memories. This cannot be undone.</p>
        {confirmDelete ? (
          <div className="row">
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={async () => {
                await call("/api/account", "DELETE");
                window.location.assign("/");
              }}
            >
              হ্যাঁ, মুছে ফেলুন
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>বাতিল</button>
          </div>
        ) : (
          <button className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}>অ্যাকাউন্ট মুছুন · Delete my account</button>
        )}
      </div>
    </div>
  );
}

function PhonePin({ hasPin, onChange }: { hasPin: boolean; onChange: () => Promise<void> }) {
  const { phoneLine } = useFeatures();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  async function save(value: string | null) {
    setErr("");
    setMsg("");
    // Same rule as the server, checked here first so a trivial PIN never leaves the device.
    if (value !== null && (/^(\d)\1+$/.test(value) || "0123456789".includes(value) || "9876543210".includes(value))) {
      return setErr("Choose a PIN that isn't a simple pattern (not 1234, 0000…)");
    }
    const res = await fetch("/api/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ phonePin: value }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(json.error ?? "Could not save");
    setPin("");
    setMsg(value ? "পিন সেট হয়েছে · PIN saved" : "পিন মুছে ফেলা হয়েছে · PIN removed");
    await onChange();
  }
  return (
    <div className="card">
      <h3 style={{ margin: 0 }}>📞 ফোন লাইনের পিন · Phone-line PIN</h3>
      <p className="small muted" style={{ margin: "4px 0 8px" }}>
        The AI phone agent{phoneLine ? ` (${phoneLine})` : ""} asks for this PIN to identify you. Use 4–6 digits that are not your bKash, bank or SIM PIN.
        {hasPin ? " A PIN is set." : " No PIN set yet."}
      </p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); void save(pin); }}>
        <label htmlFor="phone-pin" className="sr-only">New phone PIN</label>
        <input id="phone-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4,6}" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" style={{ width: 140 }} />
        <button className="btn btn-sm" disabled={pin.length < 4}>{hasPin ? "পিন বদলান · Change" : "পিন সেট করুন · Set PIN"}</button>
        {hasPin && <button type="button" className="btn btn-ghost btn-sm" onClick={() => void save(null)}>মুছুন · Remove</button>}
      </form>
      {msg && <p role="status" className="small" style={{ color: "var(--safe)" }}>{msg}</p>}
      {err && <p role="alert" className="small" style={{ color: "var(--danger)" }}>{err}</p>}
    </div>
  );
}
