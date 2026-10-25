// Deterministic red-flag engine. It runs on every check, with or without AI,
// so the core safety verdict is explainable, free, and can't be bought.

import { findCountry, HIGH_RISK_DESTINATIONS, type Country } from "./data/countries.ts";
import { lookupAgency, type Agency } from "./data/agencies.ts";

export type Severity = "high" | "medium" | "low";

export type Flag = {
  id: string;
  severity: Severity;
  title: string;
  titleBn: string;
  detail: string;
};

export type OfferInput = {
  countryCode: string;
  destinationText?: string;
  jobTitle?: string;
  salaryLocal?: number;
  askedCostBdt?: number;
  agencyQuery?: string;
  visaType?: "work" | "visit" | "free" | "unknown";
  paidTo?: "agency" | "individual" | "unknown";
  receipt?: boolean;
  bmetClearance?: boolean;
  foundVia?: "agency" | "social" | "relative" | "unknown";
  passportHandedOver?: boolean;
  offerText?: string;
};

export type CostAnalysis = {
  officialCostBdt: number | null;
  askedCostBdt: number | null;
  overchargeBdt: number | null;
  overchargeRatio: number | null;
  salaryBdt: number | null;
  monthsToRepay: number | null;
};

export type RuleResult = {
  score: number;
  verdict: "safe" | "caution" | "danger";
  flags: Flag[];
  cost: CostAnalysis;
  agency: Agency | null;
  country: Country | null;
};

const FREE_VISA_RE = /free\s*visa|azad\s*visa|ফ্রি\s*ভিসা|আজাদ\s*ভিসা|khadim|খাদেম/i;
const VISIT_VISA_RE = /visit\s*visa|tourist\s*visa|ভিজিট\s*ভিসা|ট্যুরিস্ট/i;
const ADVANCE_RE = /advance|অগ্রিম|token money|booking money/i;

export function analyseOffer(input: OfferInput): RuleResult {
  const flags: Flag[] = [];
  const country = findCountry(input.countryCode) ?? null;
  const text = `${input.offerText ?? ""} ${input.destinationText ?? ""} ${input.jobTitle ?? ""}`;

  for (const d of HIGH_RISK_DESTINATIONS) {
    if (d.match.test(text) || d.match.test(country?.name ?? "")) {
      flags.push({ id: "risk-destination", severity: "high", title: "High-risk destination", titleBn: "উচ্চ ঝুঁকির গন্তব্য", detail: d.note });
    }
  }

  if (input.visaType === "free" || FREE_VISA_RE.test(text)) {
    flags.push({
      id: "free-visa",
      severity: "high",
      title: "\"Free / azad visa\" offered",
      titleBn: "ফ্রি/আজাদ ভিসা",
      detail: "A free visa means no real employer is responsible for you. In the Gulf it is illegal and often ends in jail and deportation.",
    });
  }

  if (input.visaType === "visit" || VISIT_VISA_RE.test(text)) {
    flags.push({
      id: "visit-visa",
      severity: "high",
      title: "Visit or tourist visa for a job",
      titleBn: "চাকরির জন্য ভিজিট ভিসা",
      detail: "You cannot legally work on a visit visa. Brokers promise to \"convert\" it later. That rarely happens and leaves you undocumented.",
    });
  }

  let agency: Agency | null = null;
  if (input.agencyQuery?.trim()) {
    agency = lookupAgency(input.agencyQuery) ?? null;
    if (!agency) {
      flags.push({
        id: "agency-unknown",
        severity: "medium",
        title: "Agency not found in licence list",
        titleBn: "এজেন্সির লাইসেন্স পাওয়া যায়নি",
        detail: "We could not match this agency or RL number. Ask for the RL number and check it on bmet.gov.bd before paying.",
      });
    } else if (agency.licenceStatus !== "valid") {
      flags.push({
        id: "agency-licence",
        severity: "high",
        title: `Agency licence ${agency.licenceStatus}`,
        titleBn: "এজেন্সির লাইসেন্স বাতিল/স্থগিত",
        detail: `${agency.name} (${agency.rl}) cannot legally recruit right now.`,
      });
    } else if (agency.verifiedComplaints > 5) {
      flags.push({
        id: "agency-complaints",
        severity: "medium",
        title: "Many verified complaints",
        titleBn: "অনেক অভিযোগ",
        detail: `${agency.verifiedComplaints} verified complaints in our records.`,
      });
    }
  } else {
    flags.push({
      id: "agency-missing",
      severity: "medium",
      title: "No licensed agency named",
      titleBn: "লাইসেন্সধারী এজেন্সির নাম নেই",
      detail: "Legal recruitment in Bangladesh goes through a BMET-licensed agency with an RL number. A deal with only a dalal (broker) has no legal protection.",
    });
  }

  if (input.paidTo === "individual") {
    flags.push({
      id: "paid-individual",
      severity: "high",
      title: "Money goes to a person, not the agency",
      titleBn: "টাকা ব্যক্তিকে দেওয়া হচ্ছে",
      detail: "If you pay a dalal directly you cannot claim it back through BMET arbitration. Pay only the licensed agency, by bank, and get a receipt.",
    });
  }
  if (input.receipt === false) {
    flags.push({
      id: "no-receipt",
      severity: "medium",
      title: "No receipt for payments",
      titleBn: "টাকার রসিদ নেই",
      detail: "Without a receipt you cannot prove what you paid in a complaint. Ask for a signed receipt or pay by bank or MFS.",
    });
  }
  if (input.bmetClearance === false) {
    flags.push({
      id: "no-clearance",
      severity: "high",
      title: "No BMET clearance / smart card",
      titleBn: "বিএমইটি ছাড়পত্র নেই",
      detail: "Every worker needs BMET emigration clearance (smart card). Without it you are not insured by the Wage Earners' Welfare Board and may be stopped at the airport.",
    });
  }
  if (input.foundVia === "social") {
    flags.push({
      id: "social-media",
      severity: "medium",
      title: "Offer found on social media",
      titleBn: "ফেসবুক/টিকটকে পাওয়া অফার",
      detail: "Digital recruitment scams through Facebook, TikTok and WhatsApp led to thousands of deportations in 2025. Verify the employer independently.",
    });
  }
  if (input.passportHandedOver) {
    flags.push({
      id: "passport",
      severity: "medium",
      title: "Passport handed to a broker",
      titleBn: "পাসপোর্ট দালালের কাছে",
      detail: "Keep your passport. Give it only to the licensed agency for visa processing, against a written receipt.",
    });
  }
  if (ADVANCE_RE.test(text)) {
    flags.push({
      id: "advance",
      severity: "low",
      title: "Advance or \"token\" money requested",
      titleBn: "অগ্রিম টাকা চাওয়া হচ্ছে",
      detail: "Do not pay advances before you have seen a real visa and contract with the employer's name.",
    });
  }

  // Cost analysis
  const officialCostBdt = country?.officialCostBdt ?? null;
  const askedCostBdt = input.askedCostBdt && input.askedCostBdt > 0 ? input.askedCostBdt : null;
  const salaryBdt = input.salaryLocal && country ? Math.round(input.salaryLocal * country.bdtRate) : null;
  let overchargeBdt: number | null = null;
  let overchargeRatio: number | null = null;
  if (officialCostBdt && askedCostBdt) {
    overchargeBdt = askedCostBdt - officialCostBdt;
    overchargeRatio = askedCostBdt / officialCostBdt;
    if (overchargeRatio >= 2) {
      flags.push({
        id: "overcharge",
        severity: "high",
        title: `Asked cost is ${overchargeRatio.toFixed(1)}× the official limit`,
        titleBn: "সরকার নির্ধারিত খরচের অনেক বেশি",
        detail: `Government ceiling for ${country!.name} is Tk ${officialCostBdt.toLocaleString("en-IN")}. You are being asked for Tk ${askedCostBdt.toLocaleString("en-IN")}.`,
      });
    } else if (overchargeRatio > 1.15) {
      flags.push({
        id: "overcharge",
        severity: "medium",
        title: "Asked cost is above the official limit",
        titleBn: "সরকার নির্ধারিত খরচের বেশি",
        detail: `Ceiling Tk ${officialCostBdt.toLocaleString("en-IN")} vs asked Tk ${askedCostBdt.toLocaleString("en-IN")}.`,
      });
    }
  }
  if (country?.minWageLocal && input.salaryLocal && input.salaryLocal < country.minWageLocal) {
    flags.push({
      id: "below-min-wage",
      severity: "high",
      title: "Salary below legal minimum wage",
      titleBn: "বেতন ন্যূনতম মজুরির কম",
      detail: `${country.minWageNote} Offer: ${country.currency} ${input.salaryLocal}.`,
    });
  }
  const monthsToRepay = askedCostBdt && salaryBdt ? Math.round((askedCostBdt / (salaryBdt * 0.6)) * 10) / 10 : null;
  if (monthsToRepay && monthsToRepay > 18) {
    flags.push({
      id: "repay",
      severity: "medium",
      title: `About ${Math.round(monthsToRepay)} months just to repay the cost`,
      titleBn: "খরচ তুলতেই অনেক মাস লাগবে",
      detail: "Assuming you send home 60% of your salary. Most contracts last 24 months, so you could come home with nothing.",
    });
  }

  const weights: Record<Severity, number> = { high: 30, medium: 12, low: 5 };
  const penalty = flags.reduce((s, f) => s + weights[f.severity], 0);
  const score = Math.max(0, 100 - penalty);
  const hasHigh = flags.some((f) => f.severity === "high");
  const verdict = hasHigh || score < 50 ? "danger" : score < 80 ? "caution" : "safe";

  return {
    score,
    verdict,
    flags,
    cost: { officialCostBdt, askedCostBdt, overchargeBdt, overchargeRatio, salaryBdt, monthsToRepay },
    agency,
    country,
  };
}
