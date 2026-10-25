// Premium plans. Checking offers, agency lookups, reviews and emergency help stay free.
export const PLANS = { monthly: { bdt: 199, days: 30 }, yearly: { bdt: 1499, days: 365 } } as const;
export type PlanId = keyof typeof PLANS;
