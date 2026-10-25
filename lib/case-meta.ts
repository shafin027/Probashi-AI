// Case categories, statuses and official referral channels. No server imports: shared with the UI.

export const CATEGORIES = {
  overcharge: { bn: "চুক্তির চেয়ে বেশি টাকা নিয়েছে", en: "Charged more than agreed / above the legal limit" },
  fake_job: { bn: "ভুয়া চাকরি বা ভিসা", en: "Fake job or visa" },
  no_job: { bn: "বিদেশে গিয়ে কাজ পাইনি", en: "No job on arrival" },
  wage_theft: { bn: "বেতন দেয় না বা কম দেয়", en: "Unpaid or underpaid wages" },
  passport_withheld: { bn: "পাসপোর্ট আটকে রেখেছে", en: "Passport withheld" },
  abuse: { bn: "নির্যাতন বা হুমকি", en: "Abuse or threats" },
  trafficking: { bn: "পাচার বা জোর করে আটকে রাখা", en: "Trafficking or forced confinement" },
  detained: { bn: "আটক বা জেলে", en: "Detained or in jail" },
  refund: { bn: "টাকা ফেরত পাচ্ছি না", en: "Money not refunded" },
  other: { bn: "অন্য সমস্যা", en: "Other" },
} as const;

export type Category = keyof typeof CATEGORIES;

export const EMERGENCY: Category[] = ["abuse", "trafficking", "detained", "passport_withheld"];

export const STATUSES = ["new", "self_help", "triaged", "in_progress", "referred", "resolved", "closed"] as const;
export type CaseStatus = (typeof STATUSES)[number];

/** Official, free channels for each problem. Numbers re-checked Oct 2026; staff should re-confirm periodically. */
export function referralPack(category: Category, whereNow: "bangladesh" | "abroad"): { bn: string; en: string; contact: string }[] {
  const list: { bn: string; en: string; contact: string }[] = [];
  if (EMERGENCY.includes(category)) list.push({ bn: "জরুরি সেবা (বাংলাদেশে)", en: "National emergency service (in Bangladesh)", contact: "999" });
  list.push(
    whereNow === "abroad"
      ? { bn: "প্রবাসবন্ধু কল সেন্টার (বিদেশ থেকে)", en: "Probash Bandhu call centre, from abroad", contact: "+8809610102030" }
      : { bn: "প্রবাসবন্ধু কল সেন্টার (টোল-ফ্রি)", en: "Probash Bandhu call centre (toll-free)", contact: "16135" },
  );
  if (whereNow === "abroad") list.push({ bn: "দূতাবাসের শ্রম কল্যাণ উইং", en: "Labour welfare wing of the Bangladesh embassy", contact: "See the embassy listed for your country" });
  if (["overcharge", "fake_job", "no_job", "refund", "wage_theft"].includes(category)) {
    list.push({ bn: "বিএমইটি-তে অভিযোগ (সালিশে ক্ষতিপূরণ)", en: "BMET complaint (arbitration for compensation)", contact: "bmet.gov.bd" });
  }
  list.push({ bn: "সরকারি বিনা খরচে আইনি সহায়তা (NLASO)", en: "Free government legal aid (NLASO)", contact: "16430" });
  if (["fake_job", "trafficking"].includes(category)) {
    list.push({ bn: "থানায় মামলা (বৈদেশিক কর্মসংস্থান ও অভিবাসী আইন ২০১৩ / মানব পাচার আইন ২০১২)", en: "Police case under the Overseas Employment and Migrants Act 2013 / Human Trafficking Act 2012", contact: "Nearest police station" });
  }
  return list;
}


export const STATUS_BN: Record<CaseStatus, string> = {
  new: "নতুন · New, waiting for a caseworker",
  self_help: "নিজে করণীয় · Official channels shared",
  triaged: "কেসওয়ার্কার নিয়েছেন · Caseworker assigned",
  in_progress: "কাজ চলছে · In progress",
  referred: "সংস্থায় পাঠানো হয়েছে · Referred to an official body",
  resolved: "সমাধান হয়েছে · Resolved",
  closed: "বন্ধ · Closed",
};
