"use client";

import { useEffect, useRef, useState } from "react";
import { useFeatures } from "./features.tsx";

// Natural voice: records with MediaRecorder and transcribes on the server (OpenAI
// gpt-4o-transcribe, tuned for Bangla). Speech is generated with a natural neural voice.
// Falls back to the browser's built-in speech engine when natural voice isn't configured.

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

function browserRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const MAX_SECONDS = 90;

function pickMime(): string {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function VoiceButton({ onText, lang = "bn-BD" }: { onText: (text: string) => void; lang?: string }) {
  const { naturalVoice } = useFeatures();
  const [state, setState] = useState<"idle" | "recording" | "thinking">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const canRecord = typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
    setSupported(naturalVoice ? canRecord : browserRecognition() !== null);
  }, [naturalVoice]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function startNatural() {
    setError("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("মাইক্রোফোনের অনুমতি দিন · Allow microphone access");
      return;
    }
    const mimeType = pickMime();
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      const blob = new Blob(chunks, { type: mr.mimeType || mimeType || "audio/webm" });
      if (blob.size < 1200) {
        setState("idle");
        setError("কিছু শোনা যায়নি · Didn't catch that");
        return;
      }
      setState("thinking");
      try {
        const res = await fetch("/api/voice/stt", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mimeType: blob.type.replace(/;.*$/, "") || "audio/webm", data: await blobToBase64(blob) }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "failed");
        if (json.text) onText(json.text);
      } catch (e) {
        setError(e instanceof Error && e.message !== "failed" ? e.message : "আবার বলুন · Please try again");
      } finally {
        setState("idle");
      }
    };
    recorder.current = mr;
    mr.start();
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) mr.state === "recording" && mr.stop();
        return s + 1;
      });
    }, 1000);
  }

  function startBrowser() {
    const r = browserRecognition();
    if (!r) return;
    r.lang = lang;
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((res) => res[0]?.transcript ?? "").join(" ").trim();
      if (text) onText(text);
    };
    r.onend = () => setState("idle");
    r.onerror = () => setState("idle");
    rec.current = r;
    setState("recording");
    r.start();
  }

  function toggle() {
    if (state === "recording") {
      if (recorder.current?.state === "recording") recorder.current.stop();
      rec.current?.stop();
      return;
    }
    if (state === "thinking") return;
    if (naturalVoice) void startNatural();
    else startBrowser();
  }

  if (!supported) return null;
  return (
    <span className="voice-wrap">
      <button
        type="button"
        className={`btn btn-ghost mic ${state === "recording" ? "mic-on" : ""}`}
        onClick={toggle}
        disabled={state === "thinking"}
        aria-label={state === "recording" ? "Stop recording" : "Speak in Bangla"}
        title="বাংলায় বলুন"
      >
        {state === "recording" ? (
          <>
            <span className="rec-dot" aria-hidden /> থামান {naturalVoice ? `0:${String(seconds).padStart(2, "0")}` : ""}
          </>
        ) : state === "thinking" ? (
          "বুঝছি…"
        ) : (
          "🎤 বলুন"
        )}
      </button>
      {error && <span className="small" role="status" style={{ color: "var(--danger)" }}>{error}</span>}
    </span>
  );
}

let current: HTMLAudioElement | null = null;

function browserSpeak(text: string) {
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
  const { naturalVoice } = useFeatures();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const url = useRef<string | null>(null);

  useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current); }, []);

  async function play() {
    if (state === "playing") {
      current?.pause();
      setState("idle");
      return;
    }
    current?.pause();
    if (!naturalVoice) {
      browserSpeak(text);
      return;
    }
    try {
      if (!url.current) {
        setState("loading");
        const res = await fetch("/api/voice/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: text.slice(0, 1500) }) });
        if (!res.ok) throw new Error("tts");
        url.current = URL.createObjectURL(await res.blob());
      }
      const audio = new Audio(url.current);
      current = audio;
      audio.onended = () => setState("idle");
      audio.onpause = () => setState("idle");
      setState("playing");
      await audio.play();
    } catch {
      setState("idle");
      browserSpeak(text);
    }
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={play} aria-label={state === "playing" ? "Stop" : "Read aloud"} disabled={state === "loading"}>
      {state === "loading" ? "⏳ লোড হচ্ছে" : state === "playing" ? "⏸ থামান" : "🔊 শুনুন"}
    </button>
  );
}
