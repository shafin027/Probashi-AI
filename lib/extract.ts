// Pulls the two numbers that matter most (asked cost in taka, monthly salary) out of
// OCR text, so the form fills itself. Handles Bangla digits and lakh/hazar wording.

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
const num = (s: string) => Number(toAscii(s).replace(/[,\s]/g, ""));

const CURRENCIES: [RegExp, string][] = [
  [/SAR|riyal|রিয়াল/i, "SAR"],
  [/QAR|QR\b/i, "QAR"],
  [/AED|dirham|দিরহাম/i, "AED"],
  [/MYR|RM\b|ringgit|রিঙ্গিত/i, "MYR"],
  [/KWD|KD\b|dinar|দিনার/i, "KWD"],
  [/OMR/i, "OMR"],
  [/SGD|S\$/i, "SGD"],
  [/EUR|€|euro|ইউরো/i, "EUR"],
];

export type ExtractedFacts = { costBdt?: number; salary?: number; currency?: string };

export function extractFacts(raw: string): ExtractedFacts {
  const text = toAscii(raw);
  const out: ExtractedFacts = {};

  // "6 lakh 50 hazar" / "৬ লাখ ৫০ হাজার" / "6.5 lakh"
  const lakh = /(\d+(?:\.\d+)?)\s*(?:lakh|lac|লাখ|লক্ষ)(?:\s*(\d+)\s*(?:hazar|thousand|হাজার))?/i.exec(text);
  if (lakh) out.costBdt = Math.round(Number(lakh[1]) * 100_000 + (lakh[2] ? Number(lakh[2]) * 1000 : 0));

  // "BDT 650,000" / "Tk 4,50,000" / "৳ 400000" / "650000 টাকা"
  if (!out.costBdt) {
    const tk = /(?:BDT|Tk\.?|Taka|৳)\s*([\d][\d,]{3,})|([\d][\d,]{3,})\s*(?:BDT|taka|টাকা)/i.exec(text);
    if (tk) {
      const v = num(tk[1] ?? tk[2]);
      if (v >= 10_000 && v <= 50_000_000) out.costBdt = v;
    }
  }

  // Salary: a currency next to a number, e.g. "SAR 1,200", "1200 riyal", "RM1700".
  for (const [re, code] of CURRENCIES) {
    const src = re.source;
    const m = new RegExp(`(?:${src})\\s*:?\\s*([\\d][\\d,]{1,6})|([\\d][\\d,]{1,6})\\s*(?:${src})`, "i").exec(text);
    if (m) {
      const v = num(m[1] ?? m[2]);
      if (v > 0 && v < 1_000_000) {
        out.salary = v;
        out.currency = code;
        break;
      }
    }
  }
  return out;
}
