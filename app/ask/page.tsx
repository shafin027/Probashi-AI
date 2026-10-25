"use client";

import { useRef, useState } from "react";
import { SpeakButton, VoiceButton } from "@/components/voice.tsx";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "মালয়েশিয়া যেতে সরকারি খরচ কত?",
  "ফ্রি ভিসা কি নিরাপদ?",
  "সৌদিতে মালিক বেতন দিচ্ছে না, কী করব?",
  "বিএমইটি স্মার্ট কার্ড কেন লাগে?",
  "হুন্ডি না ব্যাংকে টাকা পাঠানো ভালো কেন?",
];

export default function AskPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "আসসালামু আলাইকুম! বিদেশে কাজ, খরচ, ভিসা বা বিপদ নিয়ে যেকোনো প্রশ্ন বাংলায় লিখুন বা মাইকে বলুন।" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      // Drop the canned greeting; the API expects the conversation to start with the user.
      const history = next.slice(1).slice(-12);
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const json = await res.json();
      setMessages([...next, { role: "assistant", content: json.answer ?? json.error ?? "দুঃখিত, আবার চেষ্টা করুন।" }]);
      setNotice(json.mode === "offline" ? json.notice ?? "Offline mode: answers come from our built-in FAQ." : "");
    } catch {
      setMessages([...next, { role: "assistant", content: "নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন, জরুরি হলে 16135-এ ফোন করুন।" }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <h1>প্রশ্ন করুন</h1>
      <p className="muted">Ask anything about migrating for work, by text or voice. Answers cite their sources.</p>
      <div className="row" style={{ marginBottom: 16 }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="choice small" onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="chat" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
              {m.content}
              {m.role === "assistant" && i > 0 && (
                <div style={{ marginTop: 6 }}>
                  <SpeakButton text={m.content} />
                </div>
              )}
            </div>
          ))}
          {loading && <div className="bubble bubble-ai muted">ভাবছি…</div>}
          <div ref={endRef} />
        </div>
        {notice && <p className="small muted">{notice}</p>}
        <form
          className="chat-input"
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            aria-label="Your question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="এখানে লিখুন…"
          />
          <VoiceButton onText={(t) => send(t)} />
          <button className="btn" type="submit" disabled={loading || !input.trim()}>
            পাঠান
          </button>
        </form>
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        বিপদে থাকলে: প্রবাস বন্ধু কল সেন্টার <a href="tel:16135">16135</a> · জরুরি <a href="tel:999">999</a>
      </p>
    </div>
  );
}
