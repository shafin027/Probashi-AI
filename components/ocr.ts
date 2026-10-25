"use client";

// On-device OCR (Tesseract, open source, Bangla + English). Runs entirely in the
// browser from self-hosted files in /ocr, so the image never leaves the phone.
// Used when cloud AI is unavailable, and as a privacy-first "read text" option.

export type OcrProgress = (fraction: number, status: string) => void;

export async function readTextOnDevice(image: Blob | string, onProgress?: OcrProgress): Promise<{ text: string; confidence: number }> {
  const { createWorker, OEM } = await import("tesseract.js");
  const worker = await createWorker(["ben", "eng"], OEM.LSTM_ONLY, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/core",
    langPath: "/ocr/lang",
    gzip: true,
    workerBlobURL: false,
    cacheMethod: "write", // cache models in IndexedDB after the first download
    logger: (m) => onProgress?.(typeof m.progress === "number" ? m.progress : 0, m.status),
  });
  try {
    const { data } = await worker.recognize(image);
    return { text: data.text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(), confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
