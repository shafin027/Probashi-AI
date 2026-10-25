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
