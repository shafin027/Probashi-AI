// The "why" questions a customer asks, answered honestly. Shown on the landing
// page, and used as an offline fallback when AI is unavailable.

export type FaqItem = { q: string; qBn: string; a: string; aBn: string; keywords: RegExp };

export const WHY_FAQ: FaqItem[] = [
  {
    q: "Why should I trust you over my dalal or agency?",
    qBn: "দালাল বা এজেন্সির চেয়ে আপনাদের কেন বিশ্বাস করব?",
    a: "A dalal earns more when you pay more. We earn the same whichever agency you choose, and our risk score comes from rules and documents that no agency can pay to change.",
    aBn: "দালাল যত বেশি টাকা নেয়, তত বেশি লাভ করে। আপনি যে এজেন্সিই বেছে নিন, আমাদের আয় একই থাকে। আমাদের ঝুঁকির স্কোর নিয়ম আর কাগজপত্র থেকে আসে, কোনো এজেন্সি টাকা দিয়ে তা বদলাতে পারে না।",
    keywords: /trust|dalal|দালাল|বিশ্বাস/i,
  },
  {
    q: "Why pay when Ami Probashi is free?",
    qBn: "আমি প্রবাসী অ্যাপ ফ্রি, তাহলে কেন টাকা দেব?",
    a: "Ami Probashi handles your registration and BMET clearance. We do something different: we check whether the offer, the agency and the price are fair before you pay. The basic check is free too. You pay only for the full report.",
    aBn: "আমি প্রবাসী অ্যাপে রেজিস্ট্রেশন আর বিএমইটি ছাড়পত্র হয়। আমরা অন্য কাজ করি: টাকা দেওয়ার আগে অফার, এজেন্সি আর খরচ ঠিক আছে কিনা তা যাচাই করি। প্রাথমিক যাচাইও ফ্রি। শুধু পূর্ণ রিপোর্টের জন্য টাকা লাগে।",
    keywords: /ami probashi|আমি প্রবাসী|free|ফ্রি/i,
  },
  {
    q: "Why is Tk 299 worth it?",
    qBn: "২৯৯ টাকা কেন দেব?",
    a: "A fake or overpriced offer costs Tk 4–9 lakh. The full report gives you the cost breakdown, a negotiation script and questions to ask the agency. If the report misses a red flag it should have caught, you get your money back.",
    aBn: "একটা ভুয়া বা অতিরিক্ত দামের অফারে ৪–৯ লাখ টাকা চলে যায়। পূর্ণ রিপোর্টে খরচের হিসাব, দরকষাকষির কথা আর এজেন্সিকে কী জিজ্ঞেস করবেন তা থাকে। রিপোর্ট কোনো ঝুঁকি ধরতে না পারলে টাকা ফেরত।",
    keywords: /price|cost|299|টাকা|দাম/i,
  },
  {
    q: "Why trust an AI?",
    qBn: "এআই-কে কেন বিশ্বাস করব?",
    a: "You don't have to trust it blindly. Every red flag comes with its reason and source (law, MoU, BMET data). When the AI is unsure it says so, and it always points you to BMET and the 16135 helpline for a final check.",
    aBn: "চোখ বন্ধ করে বিশ্বাস করতে হবে না। প্রতিটি ঝুঁকির সাথে কারণ আর উৎস (আইন, চুক্তি, বিএমইটি তথ্য) দেখানো হয়। এআই নিশ্চিত না হলে সেটা বলে দেয়, আর শেষ যাচাইয়ের জন্য বিএমইটি ও ১৬১৩৫ হেল্পলাইনে যেতে বলে।",
    keywords: /ai|এআই|robot/i,
  },
  {
    q: "I can't read well. Can I still use it?",
    qBn: "আমি ভালো পড়তে পারি না, ব্যবহার করতে পারব?",
    a: "Yes. Tap the microphone and speak in Bangla. Answers can be read aloud, and the result is a simple green, yellow or red signal.",
    aBn: "হ্যাঁ। মাইক্রোফোনে চাপ দিয়ে বাংলায় বলুন। উত্তর পড়ে শোনানো যায়, আর ফলাফল সহজ সবুজ, হলুদ বা লাল সংকেতে দেখায়।",
    keywords: /read|voice|পড়|কথা|মাইক/i,
  },
  {
    q: "What happens to my documents?",
    qBn: "আমার কাগজপত্রের কী হবে?",
    a: "Documents are only used to run your check. We don't store them on our servers in this version, we never sell your data, and agencies never see your documents.",
    aBn: "শুধু যাচাইয়ের জন্য কাগজ ব্যবহার হয়। এই ভার্সনে আমরা সার্ভারে সংরক্ষণ করি না, কখনো তথ্য বিক্রি করি না, এজেন্সিও আপনার কাগজ দেখতে পায় না।",
    keywords: /data|privacy|document|কাগজ|তথ্য|গোপন/i,
  },
  {
    q: "How do you make money without exploiting migrants?",
    qBn: "প্রবাসীদের ঠকিয়ে না করে আপনারা আয় করেন কীভাবে?",
    a: "The core safety check is free forever. We earn from the optional full report, a family plan, and clearly labelled commissions from licensed partners (remittance, training, insurance). Sponsored agencies are labelled and lose the label automatically if complaints pile up.",
    aBn: "মূল নিরাপত্তা যাচাই সবসময় ফ্রি। আয় আসে ঐচ্ছিক পূর্ণ রিপোর্ট, ফ্যামিলি প্ল্যান, আর লাইসেন্সধারী পার্টনারের (রেমিট্যান্স, প্রশিক্ষণ, বীমা) স্পষ্টভাবে দেখানো কমিশন থেকে। স্পন্সর এজেন্সির গায়ে লেবেল থাকে, অভিযোগ বাড়লে লেবেল নিজে থেকেই উঠে যায়।",
    keywords: /money|earn|business|আয়|ব্যবসা/i,
  },
];

const EMERGENCY_RE = /help|danger|abuse|beat|passport|salary not|trafficked|বিপদ|মার|পাসপোর্ট|বেতন দিচ্ছে না|আটকে/i;

export function offlineAnswer(question: string): string {
  if (EMERGENCY_RE.test(question)) {
    return [
      "আপনি বিপদে থাকলে এখনই যোগাযোগ করুন:",
      "• প্রবাস বন্ধু কল সেন্টার: 16135",
      "• বাংলাদেশে জরুরি সেবা: 999",
      "• আপনার দেশের বাংলাদেশ দূতাবাস / লেবার উইং",
      "পাসপোর্ট, চুক্তিপত্র আর বেতনের প্রমাণের ছবি তুলে নিরাপদ জায়গায় (পরিবারের কাছে) পাঠিয়ে রাখুন।",
    ].join("\n");
  }
  const hit = WHY_FAQ.find((f) => f.keywords.test(question));
  if (hit) return `${hit.aBn}\n\n${hit.a}`;
  return "এই মুহূর্তে এআই চালু নেই। অফার যাচাই করতে 'অফার চেক' পাতায় যান, অথবা 16135-এ ফোন করুন।\n\nAI is offline right now. Use the Offer Check page, or call 16135.";
}

const DEFAULT_SUGGESTIONS = ["মালয়েশিয়া যেতে সরকারি খরচ কত?", "এজেন্সি আসল কিনা কীভাবে বুঝব?", "বিএমইটি স্মার্ট কার্ড কেন লাগে?"];

/** Follow-up questions when AI is offline, so the conversation can keep going. */
export function offlineSuggestions(question: string): string[] {
  if (EMERGENCY_RE.test(question)) return ["দূতাবাসে কীভাবে অভিযোগ করব?", "পাসপোর্ট ফেরত পেতে কী করব?", "বেতন না দিলে কোথায় যাব?"];
  if (/visa|ভিসা/i.test(question)) return ["ফ্রি ভিসা কেন বিপজ্জনক?", "ভিসার আসল-নকল কীভাবে চিনব?", "কাজের ভিসা আর ভিজিট ভিসার পার্থক্য কী?"];
  if (/cost|খরচ|টাকা/i.test(question)) return ["সৌদি যেতে সরকারি খরচ কত?", "দালাল বেশি টাকা চাইলে কী করব?", "ঋণ নিয়ে বিদেশ যাওয়া কি ঠিক?"];
  return DEFAULT_SUGGESTIONS;
}
