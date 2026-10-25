"use client";

import { useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in lib.dom for all browsers).
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function VoiceButton({ onText, lang = "bn-BD" }: { onText: (text: string) => void; lang?: string }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => setSupported(getRecognition() !== null), []);

  function toggle() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = getRecognition();
    if (!r) return;
    r.lang = lang;
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) onText(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }

  if (!supported) return null;
  return (
    <button
      type="button"
      className={`btn btn-ghost ${listening ? "mic-on" : ""}`}
      onClick={toggle}
      aria-label={listening ? "Stop listening" : "Speak in Bangla"}
      title="বাংলায় বলুন"
    >
      🎤 {listening ? "শুনছি…" : "বলুন"}
    </button>
  );
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const bn = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("bn"));
  if (bn) u.voice = bn;
  u.lang = bn?.lang ?? "bn-BD";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function SpeakButton({ text }: { text: string }) {
  return (
    <button type="button" className="btn btn-ghost" onClick={() => speak(text)} aria-label="Read aloud">
      🔊 শুনুন
    </button>
  );
}
