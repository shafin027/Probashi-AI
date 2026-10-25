// Customer confidence score for an agency (0-100). It is explainable: every point comes
// from a listed reason. Paid sponsorship never enters this formula.
//   - Licence: no active licence on the official list caps the score at 10 (danger).
//   - Reviews: only from confirmed placements, with a Bayesian prior so 1 review can't swing it.
//   - Complaints: only cases our legal-aid team marked substantiated count against an agency.

import type { LicenceStatus } from "./registry.ts";

export type TrustInput = {
  licenceStatus: LicenceStatus | null;
  validUntil: string | null;
  platformVerified: boolean;
  reviews: { rating: number; promiseKept: boolean }[];
  substantiatedCases: number;
  blockedOffers: number;
  today?: Date;
};

export type TrustLevel = "high" | "medium" | "low" | "danger";

export type Trust = {
  score: number;
  level: TrustLevel;
  labelBn: string;
  labelEn: string;
  reasons: { bn: string; en: string; points: number }[];
  reviewCount: number;
  averageRating: number | null;
};

const PRIOR_N = 5;
const PRIOR_RATING = 3.5;
const PRIOR_KEPT = 0.6;

const LABELS: Record<TrustLevel, [string, string]> = {
  high: ["উচ্চ আস্থা", "High confidence"],
  medium: ["মাঝারি আস্থা", "Medium confidence"],
  low: ["সতর্ক থাকুন", "Low confidence"],
  danger: ["বিপদ: লাইসেন্স নেই", "Danger: no valid licence"],
};

export function computeTrust(i: TrustInput): Trust {
  const reasons: Trust["reasons"] = [];
  const n = i.reviews.length;
  const averageRating = n ? Math.round((i.reviews.reduce((s, r) => s + r.rating, 0) / n) * 10) / 10 : null;
  const done = (score: number, level: TrustLevel): Trust => ({ score, level, labelBn: LABELS[level][0], labelEn: LABELS[level][1], reasons, reviewCount: n, averageRating });

  if (i.licenceStatus !== "active") {
    const why = i.licenceStatus
      ? { bn: `সরকারি তালিকায় লাইসেন্স ${{ suspended: "স্থগিত", cancelled: "বাতিল", expired: "মেয়াদোত্তীর্ণ" }[i.licenceStatus]}`, en: `Licence ${i.licenceStatus} on the official list` }
      : { bn: "সরকারি লাইসেন্স তালিকায় পাওয়া যায়নি", en: "Not found on the official licence list" };
    reasons.push({ ...why, points: 0 });
    return done(i.licenceStatus ? 5 : 0, "danger");
  }

  let score = 45;
  reasons.push({ bn: "সরকারি তালিকায় বৈধ লাইসেন্স", en: "Active licence on the official list", points: 45 });

  if (i.validUntil) {
    const days = (new Date(`${i.validUntil}T00:00:00Z`).getTime() - (i.today ?? new Date()).getTime()) / 86_400_000;
    if (days < 60) {
      score -= 5;
      reasons.push({ bn: "লাইসেন্সের মেয়াদ শীঘ্রই শেষ", en: "Licence expires within 60 days", points: -5 });
    }
  }

  if (i.platformVerified) {
    score += 10;
    reasons.push({ bn: "প্রবাসী এআই-তে যাচাইকৃত এজেন্সি", en: "Verified agency account on Probashi AI", points: 10 });
  }

  const bayesRating = (i.reviews.reduce((s, r) => s + r.rating, 0) + PRIOR_RATING * PRIOR_N) / (n + PRIOR_N);
  const ratingPts = Math.round(((bayesRating - 3) / 2) * 25);
  const keptRatio = (i.reviews.filter((r) => r.promiseKept).length + PRIOR_KEPT * PRIOR_N) / (n + PRIOR_N);
  const keptPts = Math.round((keptRatio - 0.5) * 20);
  if (n) {
    score += ratingPts + keptPts;
    reasons.push({ bn: `${n}টি যাচাইকৃত কর্মীর রিভিউ, গড় ${averageRating}★`, en: `${n} verified worker review(s), average ${averageRating}★`, points: ratingPts });
    reasons.push({
      bn: `${Math.round((i.reviews.filter((r) => r.promiseKept).length / n) * 100)}% বলেছেন প্রতিশ্রুতি রাখা হয়েছে`,
      en: `${Math.round((i.reviews.filter((r) => r.promiseKept).length / n) * 100)}% say the promised job and salary were real`,
      points: keptPts,
    });
  } else {
    reasons.push({ bn: "এখনো কোনো যাচাইকৃত রিভিউ নেই", en: "No verified reviews yet", points: 0 });
  }

  if (i.substantiatedCases) {
    const pts = -Math.min(40, i.substantiatedCases * 8);
    score += pts;
    reasons.push({ bn: `${i.substantiatedCases}টি প্রমাণিত অভিযোগ`, en: `${i.substantiatedCases} substantiated complaint(s)`, points: pts });
  }
  if (i.blockedOffers) {
    const pts = -Math.min(15, i.blockedOffers * 5);
    score += pts;
    reasons.push({ bn: `${i.blockedOffers}টি অফার নিয়ম ভাঙায় বাতিল`, en: `${i.blockedOffers} offer(s) blocked for breaking the rules`, points: pts });
  }

  score = Math.max(0, Math.min(100, score));
  return done(score, score >= 75 ? "high" : score >= 50 ? "medium" : "low");
}
