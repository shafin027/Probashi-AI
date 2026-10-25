// "Safe Migration Readiness": gamified progress built only from actions that really
// protect the worker. No streak pressure, no fake scarcity, no points for time spent.
// Every milestone is something BMET, ILO and migrant-rights groups recommend.

export type MilestoneId =
  | "checked_offer"
  | "verified_agency"
  | "true_cost"
  | "asked_question"
  | "quiz_passed"
  | "remittance_plan"
  | "family_docs"
  | "bmet_registered"
  | "emergency_saved"
  | "pre_departure"
  // Phase 2: after arrival (unlocked at "Prepared")
  | "passport_with_me"
  | "salary_as_contract"
  | "salary_proof"
  | "labour_wing_saved"
  | "formal_remittance"
  // Phase 3: protect others (unlocked when phase 2 starts)
  | "helped_someone"
  | "shared_quiz"
  | "quiz_hard";

export type PhaseId = "before" | "abroad" | "protector";

export type Milestone = {
  id: MilestoneId;
  points: number;
  bn: string;
  en: string;
  why: string;
  href: string;
  cta: string;
  /** Manual milestones are confirmed by the user ("I've done this"); the rest complete automatically. */
  manual?: boolean;
  phase?: PhaseId;
};

export const MILESTONES: Milestone[] = [
  { id: "checked_offer", points: 15, bn: "অফার যাচাই করেছেন", en: "Checked your job offer", why: "Most fraud is visible in the offer itself: free visas, visit visas, overcharging.", href: "/check", cta: "অফার চেক করুন" },
  { id: "verified_agency", points: 10, bn: "এজেন্সির লাইসেন্স দেখেছেন", en: "Verified the agency licence", why: "Only BMET-licensed agencies (RL number) are legally accountable.", href: "/agency", cta: "এজেন্সি যাচাই" },
  { id: "true_cost", points: 10, bn: "আসল খরচ হিসাব করেছেন", en: "Worked out the true cost", why: "Knowing the official limit lets you refuse overcharging.", href: "/cost", cta: "খরচ হিসাব" },
  { id: "quiz_passed", points: 10, bn: "প্রতারণা চেনার পরীক্ষায় পাস", en: "Passed the scam-spotter quiz", why: "People who can name a scam are much harder to fool.", href: "/quiz", cta: "কুইজ খেলুন" },
  { id: "asked_question", points: 5, bn: "নিজের প্রশ্ন করেছেন", en: "Asked your own question", why: "Every situation is different. Ask before you pay.", href: "/ask", cta: "প্রশ্ন করুন" },
  { id: "remittance_plan", points: 10, bn: "টাকা পাঠানোর পরিকল্পনা", en: "Made a money plan", why: "A plan for debt and savings stops the contract ending with nothing.", href: "/plan", cta: "পরিকল্পনা করুন" },
  { id: "family_docs", points: 10, bn: "কাগজের কপি পরিবারের কাছে", en: "Copies of documents with family", why: "If your passport is taken, copies at home make help possible.", href: "/plan#docs", cta: "চেকলিস্ট" },
  { id: "bmet_registered", points: 15, bn: "বিএমইটি রেজিস্ট্রেশন ও স্মার্ট কার্ড", en: "BMET registration and smart card", why: "Legal clearance and Wage Earners' Welfare Board insurance.", href: "https://www.amiprobashi.com", cta: "আমি প্রবাসী", manual: true },
  { id: "emergency_saved", points: 5, bn: "জরুরি নম্বর ফোনে সেভ", en: "Emergency numbers saved", why: "16135 and your embassy, saved before you need them.", href: "/journey#emergency", cta: "নম্বর দেখুন", manual: true },
  { id: "pre_departure", points: 10, bn: "প্রি-ডিপার্চার প্রশিক্ষণ", en: "Pre-departure orientation done", why: "BMET's free orientation covers rights, contracts and culture.", href: "https://bmet.gov.bd", cta: "বিএমইটি", manual: true },
];

export const MAX_POINTS = MILESTONES.reduce((s, m) => s + m.points, 0); // 100

/**
 * Goal chaining (gamification skill, step 4): the journey continues after departure, so a
 * month-three user abroad and a fully-prepared user both have a meaningful next goal.
 */
export const ABROAD_MILESTONES: Milestone[] = [
  { id: "passport_with_me", phase: "abroad", points: 25, bn: "পাসপোর্ট নিজের কাছে রাখছেন", en: "Your passport stays with you", why: "Gulf labour laws forbid employers from keeping your passport. If it is taken, report it to the labour wing.", href: "/ask", cta: "জিজ্ঞেস করুন", manual: true },
  { id: "salary_as_contract", phase: "abroad", points: 20, bn: "চুক্তি অনুযায়ী বেতন পাচ্ছেন", en: "Paid as the contract says", why: "Compare each payslip with your contract. Less pay or late pay is wage theft you can claim.", href: "/ask", cta: "জিজ্ঞেস করুন", manual: true },
  { id: "salary_proof", phase: "abroad", points: 20, bn: "বেতনের প্রমাণ রাখছেন", en: "Keeping proof of salary", why: "Photos of payslips and bank messages, sent home, are your evidence in any complaint.", href: "/journey#emergency", cta: "কী রাখবেন", manual: true },
  { id: "labour_wing_saved", phase: "abroad", points: 15, bn: "দূতাবাসের লেবার উইং নম্বর সেভ", en: "Labour wing number saved", why: "The labour wing at the Bangladesh mission handles wage, passport and abuse complaints.", href: "/journey#emergency", cta: "নম্বর", manual: true },
  { id: "formal_remittance", phase: "abroad", points: 20, bn: "ব্যাংক/এমএফএস-এ টাকা পাঠিয়েছেন", en: "Sent money home formally", why: "Formal channels earn a government incentive and leave proof; hundi does neither.", href: "/plan", cta: "পরিকল্পনা", manual: true },
];

export const PROTECTOR_MILESTONES: Milestone[] = [
  { id: "helped_someone", phase: "protector", points: 40, bn: "একজনকে অফার যাচাই করতে সাহায্য", en: "Helped someone check their offer", why: "Most people hear about jobs from friends and relatives. One shared check can save a family lakhs.", href: "/check", cta: "লিংক পাঠান", manual: true },
  { id: "shared_quiz", phase: "protector", points: 30, bn: "পরিবারকে কুইজ খেলিয়েছেন", en: "Taught family with the quiz", why: "When the family can spot a scam, the decision isn't made alone.", href: "/quiz", cta: "কুইজ", manual: true },
  { id: "quiz_hard", phase: "protector", points: 30, bn: "কঠিন কুইজে পাস", en: "Passed the hard quiz", why: "The hard round has subtle cases: real agencies with hidden traps.", href: "/quiz?level=hard", cta: "কঠিন কুইজ" },
];

export const PHASES: { id: PhaseId; bn: string; en: string; unlockAt: number; milestones: Milestone[] }[] = [
  { id: "before", bn: "টাকা দেওয়ার আগে", en: "Before you pay", unlockAt: 0, milestones: MILESTONES },
  { id: "abroad", bn: "বিদেশে পৌঁছে", en: "After you arrive", unlockAt: 50, milestones: ABROAD_MILESTONES },
  { id: "protector", bn: "অন্যকে রক্ষা করুন", en: "Protect others", unlockAt: 50, milestones: PROTECTOR_MILESTONES },
];

export const ALL_MILESTONES = PHASES.flatMap((p) => p.milestones);

export function phaseScore(p: Progress, phase: PhaseId): number {
  const ms = PHASES.find((x) => x.id === phase)!.milestones;
  return ms.filter((m) => p.done.includes(m.id)).reduce((s, m) => s + m.points, 0);
}

/** Phases unlock from phase-1 readiness, so nobody is pushed ahead of what protects them first. */
export function phaseUnlocked(p: Progress, phase: PhaseId): boolean {
  return score(p) >= PHASES.find((x) => x.id === phase)!.unlockAt;
}

export type Level = { min: number; bn: string; en: string; emoji: string };
export const LEVELS: Level[] = [
  { min: 0, bn: "যাত্রা শুরু", en: "Getting started", emoji: "🌱" },
  { min: 25, bn: "সচেতন", en: "Aware", emoji: "🔍" },
  { min: 50, bn: "প্রস্তুত", en: "Prepared", emoji: "🛡️" },
  { min: 80, bn: "নিরাপদ প্রবাসী", en: "Safe migrant", emoji: "🏅" },
];

export type Progress = { done: MilestoneId[]; quizBest: number; updatedAt: number };

export const EMPTY_PROGRESS: Progress = { done: [], quizBest: 0, updatedAt: 0 };

const IDS = new Set<MilestoneId>([...MILESTONES, ...ABROAD_MILESTONES, ...PROTECTOR_MILESTONES].map((m) => m.id));

export function sanitiseProgress(p: unknown): Progress {
  const o = (p && typeof p === "object" ? p : {}) as Partial<Progress>;
  const done = Array.isArray(o.done) ? [...new Set(o.done.filter((x): x is MilestoneId => typeof x === "string" && IDS.has(x as MilestoneId)))] : [];
  const quizBest = typeof o.quizBest === "number" && Number.isFinite(o.quizBest) ? Math.max(0, Math.min(100, Math.round(o.quizBest))) : 0;
  const updatedAt = typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt) ? o.updatedAt : 0;
  return { done, quizBest, updatedAt };
}

/** Merging never loses progress: union of milestones, best quiz score. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  return { done: [...new Set([...a.done, ...b.done])], quizBest: Math.max(a.quizBest, b.quizBest), updatedAt: Math.max(a.updatedAt, b.updatedAt) };
}

export function score(p: Progress): number {
  return MILESTONES.filter((m) => p.done.includes(m.id)).reduce((s, m) => s + m.points, 0);
}

export function levelFor(points: number): Level {
  return [...LEVELS].reverse().find((l) => points >= l.min) ?? LEVELS[0];
}

export function nextLevel(points: number): Level | null {
  return LEVELS.find((l) => l.min > points) ?? null;
}

/**
 * The single most useful next step. Chains into the next unlocked phase when the current one
 * is done, so reaching a goal always reveals the next meaningful one (counters post-reward reset).
 */
export function nextStep(p: Progress): Milestone | null {
  for (const phase of PHASES) {
    if (!phaseUnlocked(p, phase.id)) continue;
    const m = phase.milestones.find((x) => !p.done.includes(x.id));
    if (m) return m;
  }
  return null;
}
