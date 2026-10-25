"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SpeakButton, VoiceButton } from "@/components/voice.tsx";
import { useFeatures } from "@/components/features.tsx";
import { useJourney } from "@/components/journey.tsx";

type Msg = { role: "user" | "assistant"; content: string; personalised?: boolean };

const STARTERS = [
  "মালয়েশিয়া যেতে সরকারি খরচ কত?",
  "ফ্রি ভিসা কি নিরাপদ?",
  "সৌদিতে মালিক বেতন দিচ্ছে না, কী করব?",
  "বিএমইটি স্মার্ট কার্ড কেন লাগে?",
  "হুন্ডি না ব্যাংকে টাকা পাঠানো ভালো কেন?",
];

export default function AskPage() {
  const { me, accounts, naturalVoice } = useFeatures();
  const { complete } = useJourney();
  const greeting = me
    ? `আবার স্বাগতম, ${me.name.split(" ")[0]}! আগের কথাগুলো আমার মনে আছে। আজ কী নিয়ে সাহায্য করতে পারি?`
    : "আসসালামু আলাইকুম! বিদেশে কাজ, খরচ, ভিসা বা বিপদ নিয়ে যেকোনো প্রশ্ন বাংলায় লিখুন বা মাইকে বলুন।";
  const [messages, setMessages] = useState<Msg[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastSpoken = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setAutoSpeak(localStorage.getItem("pa-autospeak") === "1");
    } catch {}
  }, []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12).map(({ role, content }) => ({ role, content })) }),
      });
      const json = await res.json();
      complete("asked_question");
      setMessages([...next, { role: "assistant", content: json.answer ?? json.error ?? "দুঃখিত, আবার চেষ্টা করুন।", personalised: json.personalised }]);
      setSuggestions(json.suggestions?.length ? json.suggestions : STARTERS.slice(0, 3));
      setNotice(json.mode === "offline" ? json.notice ?? "Offline mode: answers come from our built-in guide." : "");
    } catch {
      setMessages([...next, { role: "assistant", content: "নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন, জরুরি হলে 16135-এ ফোন করুন।" }]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (autoSpeak) lastSpoken.current?.querySelector<HTMLButtonElement>("button")?.click();
      }, 80);
    }
  }

  return (
    <div className="container section" style={{ maxWidth: 780 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>প্রশ্ন করুন</h1>
          <p className="muted" style={{ margin: 0 }}>Ask anything about working abroad, by voice or text. {naturalVoice ? "Natural Bangla voice on." : ""}</p>
        </div>
      </div>

      {accounts && !me && (
        <div className="security-note" style={{ margin: "16px 0" }}>
          <span aria-hidden>🧠</span>
          <span>
            <Link href="/login">লগইন করুন</Link> so I can remember your earlier checks and give more personal advice next time.
          </span>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="chat" aria-live="polite">
          <div className="bubble bubble-ai">{greeting}</div>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-ai"}`} ref={m.role === "assistant" && i === messages.length - 1 ? lastSpoken : undefined}>
              {m.content}
              {m.role === "assistant" && (
                <div className="row" style={{ marginTop: 8, gap: 8 }}>
                  <SpeakButton text={m.content} />
                  {m.personalised && <span className="memory-pill">🧠 আপনার আগের তথ্য ব্যবহার করা হয়েছে</span>}
                </div>
              )}
            </div>
          ))}
          {loading && <div className="bubble bubble-ai muted" aria-label="Thinking">ভাবছি…</div>}
          <div ref={endRef} />
        </div>

        {suggestions.length > 0 && !loading && (
          <div className="chips" style={{ marginTop: 14 }} aria-label="Suggested questions">
            {suggestions.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {notice && <p className="small muted" style={{ marginTop: 10 }}>{notice}</p>}

        <form
          className="chat-input"
          style={{ marginTop: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            aria-label="Your question"
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="এখানে লিখুন…"
          />
          <VoiceButton primary onText={(t) => send(t)} />
          <button className="btn btn-ghost" type="submit" disabled={loading || !input.trim()}>
            পাঠান
          </button>
        </form>
        <label className="row small" style={{ fontWeight: 500, margin: "10px 0 0" }}>
          <input
            type="checkbox"
            style={{ width: 20, minHeight: 20 }}
            checked={autoSpeak}
            onChange={(e) => {
              setAutoSpeak(e.target.checked);
              try {
                localStorage.setItem("pa-autospeak", e.target.checked ? "1" : "0");
              } catch {}
            }}
          />
          উত্তর পড়ে শোনাও
        </label>
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        বিপদে থাকলে: প্রবাস বন্ধু কল সেন্টার <a href="tel:16135">16135</a> · জরুরি <a href="tel:999">999</a>
      </p>
    </div>
  );
}
