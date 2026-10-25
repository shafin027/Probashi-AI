// Copies the Tesseract OCR runtime (worker, WASM core, Bangla + English models) into
// public/ocr so on-device OCR is served from our own origin: no third-party CDN,
// nothing leaves the user's phone, and the strict CSP stays intact.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = join(root, "node_modules");
const out = join(root, "public", "ocr");

const files = [
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ...["tesseract-core-lstm", "tesseract-core-simd-lstm", "tesseract-core-relaxedsimd-lstm"].flatMap((n) => [
    [`tesseract.js-core/${n}.wasm.js`, `core/${n}.wasm.js`],
    [`tesseract.js-core/${n}.js`, `core/${n}.js`],
    [`tesseract.js-core/${n}.wasm`, `core/${n}.wasm`],
  ]),
  ["@tesseract.js-data/ben/4.0.0/ben.traineddata.gz", "lang/ben.traineddata.gz"],
  ["@tesseract.js-data/eng/4.0.0/eng.traineddata.gz", "lang/eng.traineddata.gz"],
];

let copied = 0;
for (const [from, to] of files) {
  const src = join(nm, from);
  if (!existsSync(src)) {
    console.warn(`[ocr] missing ${from}; on-device OCR will be unavailable`);
    continue;
  }
  const dest = join(out, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  copied++;
}
console.log(`[ocr] copied ${copied}/${files.length} OCR assets to public/ocr`);
