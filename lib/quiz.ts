// Scam-spotter scenarios, drawn from real reported patterns (BMET complaints, news,
// migrant-rights research). Each round shows a random selection, so it stays fresh.

export type Scenario = { id: string; bn: string; en: string; scam: boolean; whyBn: string; whyEn: string };

export const SCENARIOS: Scenario[] = [
  { id: "free-visa", bn: "দালাল বলছে: “সৌদিতে আজাদ ভিসা, যেকোনো কাজ করতে পারবেন। ৬ লাখ টাকা।”", en: "Broker: “Azad visa for Saudi, do any job you like. Tk 6 lakh.”", scam: true, whyBn: "আজাদ/ফ্রি ভিসা সৌদিতে অবৈধ। কোনো মালিক আপনার দায়িত্ব নেয় না, ধরা পড়লে জেল ও ফেরত।", whyEn: "Free/azad visas are illegal in Saudi Arabia. No employer is responsible for you; workers are jailed and deported." },
  { id: "visit-convert", bn: "“ভিজিট ভিসায় দুবাই যান, সেখানে গিয়ে কাজের ভিসা করে দেব।”", en: "“Go to Dubai on a visit visa, we'll convert it to a work visa there.”", scam: true, whyBn: "ভিজিট ভিসায় কাজ করা অবৈধ। ‘পরে কনভার্ট’ প্রায়ই হয় না, আপনি অবৈধ হয়ে আটকে যান।", whyEn: "Working on a visit visa is illegal. The promised conversion rarely happens and you end up undocumented." },
  { id: "rl-receipt", bn: "এজেন্সি তাদের RL নম্বর দিয়েছে, বিএমইটি ওয়েবসাইটে মিলেছে, আর ব্যাংকে টাকা নিয়ে রসিদ দিচ্ছে।", en: "The agency gave its RL number, it matches on the BMET website, and it takes payment by bank with a receipt.", scam: false, whyBn: "এগুলো ভালো লক্ষণ। তবু চুক্তিপত্র ও ভিসার কাজের নাম মিলিয়ে নিন।", whyEn: "These are good signs. Still match the contract and the job title on the visa." },
  { id: "passport-hold", bn: "দালাল বলছে: “পাসপোর্ট আমার কাছে রাখুন, ভিসা হলে ফেরত দেব। কোনো রসিদ লাগবে না।”", en: "Broker: “Leave your passport with me until the visa comes. No receipt needed.”", scam: true, whyBn: "পাসপোর্ট শুধু লাইসেন্সধারী এজেন্সিকে, লিখিত রসিদে দিন। রসিদ ছাড়া দিলে প্রমাণ থাকে না।", whyEn: "Give your passport only to a licensed agency, against a written receipt. Without one you have no proof." },
  { id: "facebook-europe", bn: "ফেসবুক পেজে বিজ্ঞাপন: “রোমানিয়া ওয়ার্ক পারমিট, ৯০% ভিসা গ্যারান্টি, আজই ২ লাখ অগ্রিম।”", en: "Facebook ad: “Romania work permit, 90% visa guarantee, pay Tk 2 lakh advance today.”", scam: true, whyBn: "ভিসার ‘গ্যারান্টি’ কেউ দিতে পারে না। অগ্রিম চাপ আর সোশ্যাল মিডিয়া অফার বড় ঝুঁকির লক্ষণ।", whyEn: "Nobody can guarantee a visa. Pressure to pay in advance and social-media offers are major warning signs." },
  { id: "malaysia-official", bn: "মালয়েশিয়ার জন্য এজেন্সি সরকার নির্ধারিত খরচের কাছাকাছি টাকা চাইছে এবং মালিকের নাম-ঠিকানা লিখিত দিয়েছে।", en: "For Malaysia, the agency asks close to the government-set cost and gives the employer's name and address in writing.", scam: false, whyBn: "সরকারি খরচের কাছাকাছি দাম এবং লিখিত তথ্য নিরাপদ অভিবাসনের লক্ষণ।", whyEn: "A price near the official ceiling and written details are signs of safe migration." },
  { id: "russia-guard", bn: "“রাশিয়ায় সিকিউরিটি গার্ডের চাকরি, বেতন ২ লাখ টাকা, খরচ মাত্র ১ লাখ।”", en: "“Security guard job in Russia, Tk 2 lakh a month, only Tk 1 lakh cost.”", scam: true, whyBn: "এমন অফারে বাংলাদেশিদের যুদ্ধক্ষেত্রে পাঠানোর খবর আছে। অবাস্তব বেতন সবচেয়ে বড় সতর্কতা।", whyEn: "Bangladeshis lured by such offers have been sent to the war front. Unrealistic pay is the biggest warning." },
  { id: "job-mismatch", bn: "আপনাকে ড্রাইভারের চাকরি বলা হয়েছে, কিন্তু ভিসায় লেখা ‘ক্লিনার’।", en: "You were promised a driver's job, but the visa says “cleaner”.", scam: true, whyBn: "ভিসার কাজই আইনত আপনার কাজ। অমিল মানে আপনাকে অন্য কাজ করতে বাধ্য করা হতে পারে।", whyEn: "The visa job is legally your job. A mismatch means you may be forced into different work." },
  { id: "bmet-card", bn: "যাওয়ার আগে বিএমইটি স্মার্ট কার্ড ও প্রি-ডিপার্চার প্রশিক্ষণ করানো হচ্ছে।", en: "Before departure you get a BMET smart card and pre-departure orientation.", scam: false, whyBn: "এটা আইনসম্মত প্রক্রিয়া। স্মার্ট কার্ড আপনাকে বীমা ও সরকারি সহায়তা দেয়।", whyEn: "This is the legal process. The smart card gives you insurance and government support." },
  { id: "cash-relative", bn: "মামাতো ভাই বলছে: “টাকা আমার বিকাশে দাও, আমার পরিচিত লোক ভিসা করে দেবে।”", en: "A cousin says: “Send the money to my bKash, my contact will arrange the visa.”", scam: true, whyBn: "আত্মীয়ের মাধ্যমেও প্রতারণা হয়। ব্যক্তির কাছে টাকা দিলে বিএমইটি-তে অভিযোগে টাকা ফেরত পাওয়া কঠিন।", whyEn: "Fraud often comes through relatives. Money paid to an individual is very hard to recover through BMET." },
  { id: "it-cambodia", bn: "“কম্বোডিয়ায় ডাটা এন্ট্রির কাজ, ইংরেজি জানলেই হবে, টিকিট ফ্রি।”", en: "“Data-entry job in Cambodia, just need English, free ticket.”", scam: true, whyBn: "এমন অফারে লোকজনকে অনলাইন-প্রতারণার ক্যাম্পে আটকে রাখার ঘটনা আছে।", whyEn: "Offers like this have trafficked people into online-scam compounds." },
  { id: "contract-copy", bn: "সই করার আগে বাংলায় বোঝানো চুক্তিপত্রের একটা কপি আপনাকে দেওয়া হয়েছে।", en: "Before signing, you get a copy of the contract explained in Bangla.", scam: false, whyBn: "ঠিক এটাই হওয়া উচিত। কপিটি পরিবারের কাছেও রাখুন।", whyEn: "This is exactly right. Keep a copy with your family too." },
];

export const ROUND_SIZE = 6;

export function pickRound(seed = Math.random()): Scenario[] {
  // Fisher–Yates with a seeded LCG so a round is reproducible in tests.
  let s = Math.floor(seed * 2 ** 31) || 1;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const arr = [...SCENARIOS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Always include at least one safe example, so the quiz teaches what "good" looks like.
  const round = arr.slice(0, ROUND_SIZE);
  if (!round.some((x) => !x.scam)) round[ROUND_SIZE - 1] = arr.find((x) => !x.scam)!;
  return round;
}
