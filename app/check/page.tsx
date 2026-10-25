"use client";

import { useEffect, useState } from "react";
import { COUNTRIES } from "@/lib/data/countries.ts";
import type { Flag, CostAnalysis } from "@/lib/rules.ts";
import type { Analysis } from "@/lib/prompts.ts";
import type { Agency } from "@/lib/data/agencies.ts";
import { SpeakButton, VoiceButton } from "@/components/voice.tsx";
import { PayModal } from "@/components/PayModal.tsx";

type Result = {
  score: number;
  verdict: "safe" | "caution" | "danger";
  flags: Flag[];
  cost: CostAnalysis;
  agency: Agency | null;
  country: { name: string; nameBn: string; currency: string; officialCostSource: string; warnings: string[]; embassy: string } | null;
  ai: Pick<Analysis, "extracted" | "summaryBn" | "summaryEn" | "nextStepsBn"> | null;
  reportToken: string | null;
  aiMode: "ai" | "rules-fallback" | "rules-only";
  aiError: string | null;
};

type Doc = { mediaType: "image/jpeg" | "application/pdf"; data: string; name: string; preview?: string };

const VERDICT_TEXT = {
  safe: { bn: "তুলনামূলক নিরাপদ মনে হচ্ছে", en: "Looks relatively safe. Still verify with BMET before paying." },
  caution: { bn: "সাবধান! কিছু বিষয় পরিষ্কার নয়", en: "Caution: some things need checking before you pay." },
  danger: { bn: "বিপদ! টাকা দেবেন না", en: "Danger: do not pay until these problems are solved." },
};

const SAMPLE = {
  countryCode: "SA",
  jobTitle: "Cleaner / ক্লিনার",
  salaryLocal: "1200",
  askedCostBdt: "650000",
  agencyQuery: "",
  offerText:
    "ভাই, সৌদি আরবে ফ্রি ভিসা আছে। কাজ: ক্লিনার, বেতন ১২০০ রিয়াল, থাকা খাওয়া ফ্রি। মোট খরচ ৬ লাখ ৫০ হাজার, এখন ২ লাখ অগ্রিম দিতে হবে। পাসপোর্ট আমার কাছে জমা দিন। ১৫ দিনের মধ্যে ফ্লাইট।",
};

type Premium = Pick<Analysis, "negotiationScriptBn" | "questionsToAskAgency">;

const STAGES = ["কাগজ পড়া হচ্ছে · Reading the document", "নিয়ম মিলিয়ে দেখা হচ্ছে · Checking rules and official costs", "এজেন্সি যাচাই · Checking the agency", "রিপোর্ট লেখা হচ্ছে · Writing your Bangla report"];
const RING_COLOR = { safe: "var(--safe)", caution: "var(--caution)", danger: "var(--danger)" };

function fmt(n: number | null | undefined) {
  return n == null ? "—" : `৳${Math.round(n).toLocaleString("en-IN")}`;
}

async function fileToDoc(file: File): Promise<Doc> {
  if (file.type === "application/pdf") {
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { mediaType: "application/pdf", data: btoa(bin), name: file.name };
  }
  // Downscale photos so uploads stay small and fast on mobile data.
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  URL.revokeObjectURL(url);
  return { mediaType: "image/jpeg", data: dataUrl.split(",")[1], name: file.name, preview: dataUrl };
}

function Choice<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="choice-row">
      {options.map(([v, label]) => (
        <button type="button" key={v} className="choice" aria-pressed={value === v} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function CheckPage() {
  const [countryCode, setCountryCode] = useState("SA");
  const [jobTitle, setJobTitle] = useState("");
  const [salaryLocal, setSalaryLocal] = useState("");
  const [askedCostBdt, setAskedCostBdt] = useState("");
  const [agencyQuery, setAgencyQuery] = useState("");
  const [offerText, setOfferText] = useState("");
  const [visaType, setVisaType] = useState<"work" | "visit" | "free" | "unknown">("unknown");
  const [paidTo, setPaidTo] = useState<"agency" | "individual" | "unknown">("unknown");
  const [receipt, setReceipt] = useState<"yes" | "no" | "unknown">("unknown");
  const [clearance, setClearance] = useState<"yes" | "no" | "unknown">("unknown");
  const [foundVia, setFoundVia] = useState<"agency" | "social" | "relative" | "unknown">("unknown");
  const [passport, setPassport] = useState<"yes" | "no" | "unknown">("unknown");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [premium, setPremium] = useState<Premium | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!loading) return;
    setStage(0);
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3500);
    return () => clearInterval(t);
  }, [loading]);

  const country = COUNTRIES.find((c) => c.code === countryCode)!;
  const tri = (v: "yes" | "no" | "unknown") => (v === "unknown" ? undefined : v === "yes");

  function loadSample() {
    setCountryCode(SAMPLE.countryCode);
    setJobTitle(SAMPLE.jobTitle);
    setSalaryLocal(SAMPLE.salaryLocal);
    setAskedCostBdt(SAMPLE.askedCostBdt);
    setAgencyQuery(SAMPLE.agencyQuery);
    setOfferText(SAMPLE.offerText);
    setPaidTo("individual");
    setFoundVia("social");
    setPassport("yes");
    setReceipt("no");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      setError("File too large. Please use a photo or PDF under 15 MB.");
      return;
    }
    try {
      if (!/^image\//.test(f.type) && f.type !== "application/pdf") throw new Error("type");
      setDoc(await fileToDoc(f));
      setError("");
    } catch {
      setError("Could not read this file. Try a JPG/PNG photo or PDF.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setPremium(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: {
            countryCode,
            jobTitle: jobTitle || undefined,
            salaryLocal: salaryLocal ? Number(salaryLocal) : undefined,
            askedCostBdt: askedCostBdt ? Number(askedCostBdt) : undefined,
            agencyQuery: agencyQuery || undefined,
            offerText: offerText || undefined,
            visaType,
            paidTo,
            receipt: tri(receipt),
            bmetClearance: tri(clearance),
            foundVia,
            passportHandedOver: tri(passport),
          },
          doc: doc ? { mediaType: doc.mediaType, data: doc.data } : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      setResult(json);
      setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const v = result ? VERDICT_TEXT[result.verdict] : null;
  const shareText = result
    ? `Probashi AI যাচাই: ${v!.bn} (স্কোর ${result.score}/100)\n${result.flags.map((f) => `• ${f.titleBn}`).join("\n")}\n${typeof window !== "undefined" ? window.location.origin : ""}/check`
    : "";

  return (
    <div className="container section">
      <h1>অফার চেক</h1>
      <p className="muted">
        Upload the visa, contract or offer message, or fill in what you know. The free check takes about 20 seconds.
        <span className="en">Your documents are used only for this check and are not stored.</span>
      </p>
      <button type="button" className="btn btn-ghost no-print" onClick={loadSample} style={{ marginBottom: 16 }}>
        ✨ উদাহরণ দেখুন (load a sample scam offer)
      </button>

      <form onSubmit={submit} className="grid grid-2 no-print">
        <div className="card">
          <h3>১. কাগজ বা মেসেজ · Document or message</h3>
          <label className="drop" htmlFor="doc">
            {doc ? (
              <>
                {doc.preview ? <img src={doc.preview} alt="Uploaded document" style={{ maxHeight: 160 }} /> : <div>📄</div>}
                <div className="small">{doc.name}. Tap to change.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "2rem" }}>📷</div>
                <div>ভিসা / চুক্তিপত্র / অফার লেটারের ছবি দিন</div>
                <div className="small muted">Photo or PDF of visa, contract, IPA or demand letter</div>
              </>
            )}
          </label>
          <input id="doc" type="file" accept="image/*,application/pdf" capture="environment" onChange={onFile} style={{ display: "none" }} />
          {doc && (
            <button type="button" className="btn btn-ghost small" onClick={() => setDoc(null)} style={{ marginTop: 8 }}>
              Remove file
            </button>
          )}
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="offerText">দালাল/এজেন্সি কী বলেছে? · What were you told?</label>
            <textarea
              id="offerText"
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              placeholder="WhatsApp/Facebook মেসেজ পেস্ট করুন বা মাইকে বলুন…"
            />
            <div className="row" style={{ marginTop: 8 }}>
              <VoiceButton onText={(t) => setOfferText((p) => (p ? `${p} ${t}` : t))} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3>২. মূল তথ্য · Key facts</h3>
          <div className="field">
            <label htmlFor="country">কোন দেশে? · Destination</label>
            <select id="country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameBn} · {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="cost">কত টাকা চাইছে? (৳)</label>
              <input id="cost" inputMode="numeric" value={askedCostBdt} onChange={(e) => setAskedCostBdt(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 450000" />
            </div>
            <div className="field">
              <label htmlFor="salary">মাসিক বেতন ({country.currency})</label>
              <input id="salary" inputMode="numeric" value={salaryLocal} onChange={(e) => setSalaryLocal(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 1500" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="job">কাজ · Job</label>
            <input id="job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Construction worker" />
          </div>
          <div className="field">
            <label htmlFor="agency">এজেন্সির নাম বা RL নম্বর</label>
            <input id="agency" value={agencyQuery} onChange={(e) => setAgencyQuery(e.target.value)} placeholder="e.g. RL-1002" />
            <div className="hint">Try the demo licences RL-1001 to RL-1005.</div>
          </div>
          <div className="field">
            <label>ভিসার ধরন · Visa type</label>
            <Choice value={visaType} onChange={setVisaType} options={[["work", "কাজের ভিসা"], ["visit", "ভিজিট"], ["free", "ফ্রি/আজাদ"], ["unknown", "জানি না"]]} />
          </div>
          <div className="field">
            <label>টাকা কাকে দিচ্ছেন? · Paying whom?</label>
            <Choice value={paidTo} onChange={setPaidTo} options={[["agency", "এজেন্সি"], ["individual", "দালাল/ব্যক্তি"], ["unknown", "জানি না"]]} />
          </div>
          <div className="field">
            <label>অফার কোথায় পেলেন? · Found via</label>
            <Choice value={foundVia} onChange={setFoundVia} options={[["agency", "এজেন্সি অফিস"], ["social", "ফেসবুক/টিকটক"], ["relative", "আত্মীয়"], ["unknown", "অন্য"]]} />
          </div>
          <div className="grid grid-3" style={{ gap: 12 }}>
            <div className="field">
              <label>রসিদ পেয়েছেন?</label>
              <Choice value={receipt} onChange={setReceipt} options={[["yes", "হ্যাঁ"], ["no", "না"]]} />
            </div>
            <div className="field">
              <label>বিএমইটি কার্ড?</label>
              <Choice value={clearance} onChange={setClearance} options={[["yes", "হ্যাঁ"], ["no", "না"]]} />
            </div>
            <div className="field">
              <label>পাসপোর্ট দিয়েছেন?</label>
              <Choice value={passport} onChange={setPassport} options={[["yes", "হ্যাঁ"], ["no", "না"]]} />
            </div>
          </div>
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "যাচাই হচ্ছে… (AI reading)" : "ফ্রি যাচাই করুন · Check now"}
          </button>
          {loading && (
            <ol className="progress" aria-live="polite">
              {STAGES.map((st, i) => (
                <li key={st} className={i < stage ? "done" : i === stage ? "active" : ""}>{st}</li>
              ))}
            </ol>
          )}
          {error && <p role="alert" style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>}
          <div className="security-note" style={{ marginTop: 12 }}>
            <span aria-hidden>🔒</span>
            <span>Encrypted connection. Files are checked for safety, used once for this check, and never stored or shown to agencies.</span>
          </div>
        </div>
      </form>

      {result && v && (
        <section id="result" className="stack" style={{ marginTop: 32 }}>
          <div className={`verdict verdict-${result.verdict}`}>
            <div className="row" style={{ alignItems: "center", gap: 18 }}>
              <div
                className="ring"
                data-score={result.score}
                role="img"
                aria-label={`Safety score ${result.score} out of 100`}
                style={{ ["--v" as string]: Math.max(result.score, 3), ["--c" as string]: RING_COLOR[result.verdict] }}
              />
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{ margin: 0 }}>{v.bn}</h2>
                <div className="muted">{v.en}</div>
                <div className="small muted">নিরাপত্তা স্কোর · safety score / 100</div>
              </div>
            </div>
            {result.ai && (
              <div style={{ marginTop: 16 }}>
                <p style={{ marginBottom: 6 }}>{result.ai.summaryBn}</p>
                <p className="muted small">{result.ai.summaryEn}</p>
                <SpeakButton text={result.ai.summaryBn} />
              </div>
            )}
            <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
              {result.aiMode === "ai" ? "AI document reading + rule engine" : "Rule engine only (AI not configured or unavailable)"}
              {result.aiError ? ` · ${result.aiError}` : ""}
            </p>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h3>⚠️ ঝুঁকি · Red flags ({result.flags.length})</h3>
              {result.flags.length === 0 && <p className="muted">No red flags found from the information given.</p>}
              <div className="stack">
                {result.flags.map((f) => (
                  <div key={f.id} className={`flag flag-${f.severity}`}>
                    <strong>{f.titleBn}</strong> <span className="badge">{f.severity}</span>
                    <div className="small">{f.title}</div>
                    <div className="small muted">{f.detail}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>💰 খরচের হিসাব · Cost check</h3>
              <table className="small">
                <tbody>
                  <tr><td>Official limit (সরকারি)</td><td><strong>{fmt(result.cost.officialCostBdt)}</strong></td></tr>
                  <tr><td>You are asked (চাইছে)</td><td><strong>{fmt(result.cost.askedCostBdt)}</strong></td></tr>
                  <tr><td>Extra (বাড়তি)</td><td style={{ color: (result.cost.overchargeBdt ?? 0) > 0 ? "var(--danger)" : undefined }}><strong>{fmt(result.cost.overchargeBdt)}</strong></td></tr>
                  <tr><td>Salary in taka (approx.)</td><td>{fmt(result.cost.salaryBdt)}</td></tr>
                  <tr><td>Months to repay (60% saved)</td><td>{result.cost.monthsToRepay ?? "—"}</td></tr>
                </tbody>
              </table>
              {result.country && <p className="small muted" style={{ marginTop: 8 }}>Source: {result.country.officialCostSource}. Re-check on bmet.gov.bd.</p>}
              {result.agency && (
                <p className="small">
                  Agency: <strong>{result.agency.name}</strong> ({result.agency.rl}): licence <strong>{result.agency.licenceStatus}</strong>,{" "}
                  {result.agency.verifiedComplaints} verified complaints.
                </p>
              )}
              {result.country?.warnings.map((w) => (
                <p key={w} className="small muted">• {w}</p>
              ))}
            </div>
          </div>

          {result.ai && (
            <div className="card">
              <h3>✅ এখন কী করবেন · Next steps</h3>
              <ol>
                {result.ai.nextStepsBn.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {result.ai.extracted.employer && (
                <p className="small muted">
                  Read from document: {result.ai.extracted.documentType}. Employer: {result.ai.extracted.employer}. Job: {result.ai.extracted.jobTitle}.
                  {result.ai.extracted.salary ? ` Salary: ${result.ai.extracted.salary} ${result.ai.extracted.salaryCurrency}.` : ""}
                </p>
              )}
            </div>
          )}

          <div className="card">
            <h3>📋 পূর্ণ রিপোর্ট · Full Verified Report</h3>
            {result.ai && result.reportToken ? (
              premium ? (
                <div className="stack">
                  <div>
                    <strong>দরকষাকষির কথা · Negotiation script</strong>
                    <p style={{ whiteSpace: "pre-wrap" }}>{premium.negotiationScriptBn}</p>
                    <SpeakButton text={premium.negotiationScriptBn} />
                  </div>
                  <div>
                    <strong>এজেন্সিকে জিজ্ঞেস করুন · Ask the agency</strong>
                    <ol>
                      {premium.questionsToAskAgency.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="row no-print">
                    <button className="btn" type="button" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
                    <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>
                      পরিবারকে WhatsApp করুন
                    </a>
                  </div>
                </div>
              ) : (
                <div className="locked">
                  <div className="blur" aria-hidden>
                    <p>ভাই, আমি বিএমইটি-র সরকারি খরচের তালিকা দেখেছি। এই দেশের জন্য সর্বোচ্চ খরচ নির্ধারিত আছে, তাই আমি রসিদ ছাড়া…</p>
                    <ol><li>আপনার RL নম্বর কত?</li><li>মালিকের নাম ও ঠিকানা কী?</li><li>চুক্তিপত্রের কপি কবে পাব?</li></ol>
                  </div>
                  <div className="unlock">
                    <button className="btn btn-accent" type="button" onClick={() => setPayOpen(true)}>
                      ৳299 দিয়ে আনলক করুন · Unlock
                    </button>
                  </div>
                </div>
              )
            ) : (
              <p className="muted small">
                The full report (negotiation script, agency questions, printable family report) needs AI analysis. Add an offer message or
                document, with AI enabled on the server.
              </p>
            )}
            <div className="row no-print" style={{ marginTop: 12 }}>
              <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}>
                ফ্রি ফলাফল শেয়ার করুন
              </a>
              <a className="btn btn-ghost" href="tel:16135">📞 16135</a>
            </div>
          </div>
        </section>
      )}

      <PayModal
        open={payOpen}
        amount={299}
        token={result?.reportToken ?? null}
        onClose={() => setPayOpen(false)}
        onPaid={(p) => {
          setPremium(p);
          setPayOpen(false);
        }}
      />
    </div>
  );
}
