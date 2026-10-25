"use client";

// Shared pieces for agency trust, offers and cases.

import { useState } from "react";

export type TrustView = {
  score: number;
  level: "high" | "medium" | "low" | "danger";
  labelBn: string;
  labelEn: string;
  reasons: { bn: string; en: string; points: number }[];
  reviewCount: number;
  averageRating: number | null;
};

export type RegistryView = { rl_number: string; name: string; status: "active" | "suspended" | "cancelled" | "expired"; valid_until: string | null; address: string; source: string; imported_at: string };

const LEVEL_COLOR = { high: "var(--safe)", medium: "var(--caution)", low: "var(--danger)", danger: "var(--danger)" } as const;

export const LICENCE = {
  active: { bn: "বৈধ লাইসেন্স", en: "Active licence", color: "var(--safe)" },
  suspended: { bn: "লাইসেন্স স্থগিত", en: "Licence suspended", color: "var(--caution)" },
  cancelled: { bn: "লাইসেন্স বাতিল", en: "Licence cancelled", color: "var(--danger)" },
  expired: { bn: "মেয়াদোত্তীর্ণ লাইসেন্স", en: "Licence expired", color: "var(--danger)" },
} as const;

export function bn(n: number): string {
  return n.toLocaleString("bn-BD");
}

export function TrustRing({ trust, size = "" }: { trust: TrustView; size?: "" | "sm" | "lg" }) {
  return (
    <div className="row" style={{ flexWrap: "nowrap" }}>
      <div
        className={`ring ${size}`}
        data-score={bn(trust.score)}
        style={{ "--v": Math.max(2, trust.score), "--c": LEVEL_COLOR[trust.level] } as React.CSSProperties}
        role="img"
        aria-label={`Confidence ${trust.score} out of 100: ${trust.labelEn}`}
      />
      <div>
        <strong style={{ color: LEVEL_COLOR[trust.level] }}>{trust.labelBn}</strong>
        <div className="small muted">
          {trust.labelEn} · {trust.reviewCount ? `${trust.averageRating}★ (${bn(trust.reviewCount)} verified reviews)` : "no verified reviews yet"}
        </div>
      </div>
    </div>
  );
}

export function TrustReasons({ trust }: { trust: TrustView }) {
  return (
    <ul className="small" style={{ paddingLeft: 18, margin: "8px 0 0" }}>
      {trust.reasons.map((r) => (
        <li key={r.en}>
          {r.bn} <span className="muted">· {r.en}</span>{" "}
          {r.points !== 0 && <strong style={{ color: r.points > 0 ? "var(--safe)" : "var(--danger)" }}>{r.points > 0 ? `+${r.points}` : r.points}</strong>}
        </li>
      ))}
    </ul>
  );
}

export function LicenceLine({ reg }: { reg: RegistryView }) {
  const l = LICENCE[reg.status];
  return (
    <p style={{ margin: "6px 0", fontWeight: 700, color: l.color }}>
      {l.bn} · {l.en}
      {reg.valid_until && <span className="small muted" style={{ fontWeight: 400 }}> · valid until {reg.valid_until}</span>}
    </p>
  );
}

export function Stars({ value, onChange, label }: { value: number; onChange?: (v: number) => void; label: string }) {
  if (!onChange) return <span aria-label={`${value} of 5 stars`} style={{ color: "var(--caution)" }}>{"★".repeat(value)}{"☆".repeat(5 - value)}</span>;
  return (
    <div className="choice-row" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} className="choice" aria-pressed={value === n} onClick={() => onChange(n)}>
          {value >= n ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

/** fetch + JSON with the error message surfaced; never throws. */
export async function api<T = Record<string, unknown>>(url: string, method = "GET", body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Network problem. Please try again." } as T & { error?: string } };
  }
}

export function useBusy() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

export function ErrorLine({ error }: { error: string }) {
  return error ? <p role="alert" style={{ color: "var(--danger)", margin: "8px 0" }}>{error}</p> : null;
}
