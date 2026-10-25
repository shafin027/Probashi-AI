// Local stand-in for the Anthropic and OpenAI APIs, used by the integration tests.
// It records every request so tests can assert exactly what the app sends
// (image/PDF blocks, schemas, injection wrapping, memory), and returns realistic
// responses. It is NOT a substitute for the live test (tests/live.mjs).
//
// Triggers in the request text: TRIGGER_REFUSAL, TRIGGER_BADJSON, TRIGGER_ERROR500.

import http from "node:http";
import { createHash } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT || 4010);
const log = [];

const ANALYSIS = {
  extracted: { documentType: "Employment contract", employer: "Al Noor Cleaning Co.", jobTitle: "Cleaner", country: "Saudi Arabia", salary: 1200, salaryCurrency: "SAR", contractMonths: 24, visaType: "work" },
  aiFlags: [{ severity: "medium", title: "Employer name differs between visa and contract", titleBn: "ভিসা ও চুক্তিতে মালিকের নাম আলাদা", detail: "Visa shows a different sponsor than the contract." }],
  summaryBn: "এই অফারে কয়েকটি বড় ঝুঁকি আছে। টাকা দেওয়ার আগে বিএমইটি-তে যাচাই করুন।",
  summaryEn: "This offer has several serious risks. Verify with BMET before paying.",
  nextStepsBn: ["এজেন্সির RL নম্বর যাচাই করুন", "রসিদ ছাড়া টাকা দেবেন না", "চুক্তিপত্রের কপি রাখুন"],
  negotiationScriptBn: "SECRET_NEGOTIATION_SCRIPT ভাই, সরকার নির্ধারিত খরচ এর চেয়ে অনেক কম।",
  questionsToAskAgency: ["আপনার RL নম্বর কত?", "মালিকের ঠিকানা কী?"],
};

function askReply(body) {
  // Look only at the conversation (not the system prompt, which mentions the tag).
  const conv = JSON.parse(JSON.stringify(body.messages ?? [])).map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))).join("\n");
  const mem = /<user_memory>\n([\s\S]*?)\n<\/user_memory>/.exec(conv);
  return {
    answer: mem ? `MEMORY_USED: আপনি আগে যা বলেছিলেন তা মনে আছে। ${mem[1].trim().slice(0, 200)}` : "ফ্রি ভিসা বিপজ্জনক। শুধু লাইসেন্সধারী এজেন্সির মাধ্যমে যান।",
    suggestions: ["সৌদিতে সরকারি খরচ কত?", "এজেন্সি কীভাবে যাচাই করব?", "চুক্তিপত্রে কী দেখব?"],
  };
}

// Deterministic bag-of-words embedding: similar texts get similar vectors, so
// vector recall ordering can be tested without the real model.
function fakeEmbedding(text) {
  const v = new Array(1536).fill(0);
  for (const w of text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)) {
    const h = createHash("md5").update(w).digest();
    v[h.readUInt16BE(0) % 1536] += 1;
  }
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

function allText(body) {
  return JSON.stringify(body);
}

function send(res, status, obj, type = "application/json") {
  res.writeHead(status, { "content-type": type });
  res.end(type === "application/json" ? JSON.stringify(obj) : obj);
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks);
    const url = req.url ?? "";
    if (url.startsWith("/__requests")) return send(res, 200, log);
    if (url.startsWith("/__reset")) {
      log.length = 0;
      return send(res, 200, { ok: true });
    }

    let body = null;
    const ctype = req.headers["content-type"] ?? "";
    if (ctype.includes("application/json")) body = JSON.parse(raw.toString("utf8") || "{}");
    log.push({ path: url.split("?")[0], headers: { "anthropic-beta": req.headers["anthropic-beta"], authorization: req.headers.authorization ? "present" : undefined, "x-api-key": req.headers["x-api-key"] ? "present" : undefined }, body, rawSize: raw.length, rawHead: ctype.includes("multipart") ? raw.toString("latin1").slice(0, 200_000) : undefined });

    const text = body ? allText(body) : raw.toString("latin1");
    if (text.includes("TRIGGER_ERROR500")) return send(res, 500, { error: { type: "api_error", message: "boom" } });

    // Anthropic Messages API
    if (url.startsWith("/v1/messages")) {
      const isAnalysis = JSON.stringify(body.output_config ?? {}).includes("extracted");
      if (text.includes("TRIGGER_REFUSAL")) {
        return send(res, 200, { id: "msg_1", type: "message", role: "assistant", model: body.model, content: [], stop_reason: "refusal", stop_details: { type: "refusal", category: null, explanation: "declined" }, usage: { input_tokens: 10, output_tokens: 0 } });
      }
      const out = text.includes("TRIGGER_BADJSON") ? "not json at all" : JSON.stringify(isAnalysis ? ANALYSIS : askReply(body));
      return send(res, 200, { id: "msg_1", type: "message", role: "assistant", model: body.model, content: [{ type: "text", text: out }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 20 } });
    }

    // OpenAI Chat Completions
    if (url.startsWith("/v1/chat/completions")) {
      const isAnalysis = body.response_format?.json_schema?.name === "offer_analysis";
      const refusal = text.includes("TRIGGER_REFUSAL") ? "I can't help with that." : null;
      const content = refusal ? null : text.includes("TRIGGER_BADJSON") ? "oops" : JSON.stringify(isAnalysis ? ANALYSIS : askReply(body));
      return send(res, 200, { id: "chatcmpl-1", object: "chat.completion", created: 1, model: body.model, choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content, refusal } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } });
    }

    if (url.startsWith("/v1/embeddings")) {
      const inputs = Array.isArray(body.input) ? body.input : [body.input];
      return send(res, 200, { object: "list", model: body.model, data: inputs.map((t, i) => ({ object: "embedding", index: i, embedding: fakeEmbedding(t) })), usage: { prompt_tokens: 1, total_tokens: 1 } });
    }

    if (url.startsWith("/v1/audio/transcriptions")) {
      return send(res, 200, { text: "সৌদি আরবে ফ্রি ভিসার অফার পেয়েছি, এটা কি নিরাপদ?" });
    }

    if (url.startsWith("/v1/audio/speech")) {
      const mp3 = Buffer.concat([Buffer.from("ID3"), Buffer.alloc(2048, 7)]);
      res.writeHead(200, { "content-type": "audio/mpeg" });
      return res.end(mp3);
    }

    send(res, 404, { error: "unknown mock route " + url });
  });
});

server.listen(PORT, "127.0.0.1", () => console.log(`mock AI listening on ${PORT}`));
