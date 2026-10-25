// Destination knowledge pack. Every figure carries its source so the UI and the AI
// can cite it. Official cost ceilings come from Ministry of Expatriates' Welfare
// circulars; they change, so the UI always tells users to re-check on bmet.gov.bd.

export type Country = {
  code: string;
  name: string;
  nameBn: string;
  currency: string;
  /** BDT per 1 unit of local currency (approximate, for estimates only). */
  bdtRate: number;
  /** Government-set maximum migration cost in BDT, if one exists. */
  officialCostBdt: number | null;
  officialCostSource: string;
  /** Statutory monthly minimum wage in local currency, if one applies to migrant workers. */
  minWageLocal: number | null;
  minWageNote: string;
  /** Commonly reported real-world cost range in BDT (news / research). */
  reportedCostBdt: [number, number] | null;
  reportedCostSource: string;
  warnings: string[];
  embassy: string;
};

export const COUNTRIES: Country[] = [
  {
    code: "SA",
    name: "Saudi Arabia",
    nameBn: "সৌদি আরব",
    currency: "SAR",
    bdtRate: 32,
    officialCostBdt: 165000,
    officialCostSource: "Ministry of Expatriates' Welfare cost circular (2017)",
    minWageLocal: null,
    minWageNote: "No general statutory minimum wage for foreign workers. Your contract salary is what you can legally claim, so it must be written.",
    reportedCostBdt: [436000, 900000],
    reportedCostSource: "OKUP study via Dhaka Tribune; ILO estimate via The Daily Star",
    warnings: [
      "\"Free visa\" / \"azad visa\" is illegal in Saudi Arabia. Workers on it are often jailed and deported.",
      "Your iqama (residence permit) must be issued by your employer. Never pay a broker for it.",
    ],
    embassy: "Bangladesh Embassy Riyadh / Consulate Jeddah",
  },
  {
    code: "MY",
    name: "Malaysia",
    nameBn: "মালয়েশিয়া",
    currency: "MYR",
    bdtRate: 27,
    officialCostBdt: 78990,
    officialCostSource: "Bangladesh–Malaysia MoU cost set by the Ministry (2021)",
    minWageLocal: 1700,
    minWageNote: "Malaysia's national minimum wage is RM 1,700/month (from Feb 2025).",
    reportedCostBdt: [350000, 500000],
    reportedCostSource: "Dhaka Tribune; UN Special Rapporteurs letter (2024) cites $4,500–6,000 fees",
    warnings: [
      "Under the MoU the employer should pay most recruitment costs.",
      "Thousands of workers reached Malaysia in 2024 and found no job. Make sure the employer and job really exist before paying.",
    ],
    embassy: "Bangladesh High Commission Kuala Lumpur",
  },
  {
    code: "QA",
    name: "Qatar",
    nameBn: "কাতার",
    currency: "QAR",
    bdtRate: 33,
    officialCostBdt: 102780,
    officialCostSource: "Ministry of Expatriates' Welfare cost circular (2017)",
    minWageLocal: 1000,
    minWageNote: "Qatar minimum wage: QAR 1,000 basic plus QAR 300 food and QAR 500 housing if not provided (2021 law).",
    reportedCostBdt: [300000, 500000],
    reportedCostSource: "Migrant rights research and news reports",
    warnings: ["Qatar law bans charging workers recruitment fees. You can report it to the Qatar Ministry of Labour."],
    embassy: "Bangladesh Embassy Doha",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    nameBn: "সংযুক্ত আরব আমিরাত",
    currency: "AED",
    bdtRate: 33,
    officialCostBdt: 107780,
    officialCostSource: "Ministry of Expatriates' Welfare cost circular (2017)",
    minWageLocal: null,
    minWageNote: "No general statutory minimum wage. Check that the contract is registered on MOHRE.",
    reportedCostBdt: [300000, 600000],
    reportedCostSource: "News reports",
    warnings: ["Visit or tourist visas sold as \"work visas\" are a common scam. A work visa needs an employer-issued entry permit."],
    embassy: "Bangladesh Embassy Abu Dhabi / Consulate Dubai",
  },
  {
    code: "KW",
    name: "Kuwait",
    nameBn: "কুয়েত",
    currency: "KWD",
    bdtRate: 395,
    officialCostBdt: 106780,
    officialCostSource: "Ministry of Expatriates' Welfare cost circular (2017)",
    minWageLocal: 75,
    minWageNote: "Private-sector minimum wage KWD 75/month; domestic workers have a separate minimum.",
    reportedCostBdt: [400000, 700000],
    reportedCostSource: "News reports",
    warnings: ["Visa trading (\"buying\" a visa from a sponsor) has led to mass deportations."],
    embassy: "Bangladesh Embassy Kuwait City",
  },
  {
    code: "OM",
    name: "Oman",
    nameBn: "ওমান",
    currency: "OMR",
    bdtRate: 315,
    officialCostBdt: 109780,
    officialCostSource: "Ministry of Expatriates' Welfare cost circular (2017)",
    minWageLocal: null,
    minWageNote: "No general statutory minimum wage for foreign workers.",
    reportedCostBdt: [300000, 500000],
    reportedCostSource: "News reports",
    warnings: ["Oman has repeatedly paused visas for Bangladeshis. Be suspicious of anyone \"guaranteeing\" a visa during a pause."],
    embassy: "Bangladesh Embassy Muscat",
  },
  {
    code: "SG",
    name: "Singapore",
    nameBn: "সিঙ্গাপুর",
    currency: "SGD",
    bdtRate: 92,
    officialCostBdt: 262270,
    officialCostSource: "Ministry of Expatriates' Welfare cost circular (2017)",
    minWageLocal: null,
    minWageNote: "No general minimum wage. Your In-Principle Approval (IPA) letter states your basic salary. Compare it with your contract.",
    reportedCostBdt: [500000, 700000],
    reportedCostSource: "OKUP study via Dhaka Tribune (highest-cost corridor, ~Tk 5.74 lakh)",
    warnings: ["Check your IPA letter on the MOM website. It shows the employer and salary. A mismatch is a red flag."],
    embassy: "Bangladesh High Commission Singapore",
  },
  {
    code: "MV",
    name: "Maldives",
    nameBn: "মালদ্বীপ",
    currency: "MVR",
    bdtRate: 7.8,
    officialCostBdt: 115780,
    officialCostSource: "Ministry of Expatriates' Welfare cost circular (2017)",
    minWageLocal: null,
    minWageNote: "Sector-based minimum wage introduced in 2022. Ask for the employer's work permit details.",
    reportedCostBdt: [200000, 400000],
    reportedCostSource: "News reports",
    warnings: ["Many workers are left undocumented when the employer does not renew their permit."],
    embassy: "Bangladesh High Commission Malé",
  },
  {
    code: "RO",
    name: "Romania / Europe",
    nameBn: "রোমানিয়া / ইউরোপ",
    currency: "EUR",
    bdtRate: 135,
    officialCostBdt: null,
    officialCostSource: "No government-set cost",
    minWageLocal: 795,
    minWageNote: "Romania gross minimum wage is around €795/month (2025). Check the current national figure.",
    reportedCostBdt: [800000, 1500000],
    reportedCostSource: "News reports",
    warnings: [
      "Europe offers through Facebook/TikTok pages are among the most common scams. Real EU work permits are issued by the destination country's labour office.",
      "Never take a route through Libya. Smuggling to Italy kills many Bangladeshis every year.",
    ],
    embassy: "Bangladesh Embassy Bucharest",
  },
];

export const HIGH_RISK_DESTINATIONS = [
  { match: /russia|রাশিয়া/i, note: "Bangladeshis lured to Russia with job offers have been sent to the war front. Treat any Russia job offer as extremely high risk." },
  { match: /libya|লিবিয়া/i, note: "Libya is a trafficking hub for illegal boat journeys to Italy. Many deaths every year." },
  { match: /myanmar|cambodia|laos|মিয়ানমার|কম্বোডিয়া/i, note: "Online-scam compounds in Myanmar, Cambodia and Laos traffic workers who were promised IT or data-entry jobs." },
];

export const HELPLINES = [
  { name: "Probash Bandhu Call Centre (Expatriates' Welfare Ministry)", number: "16135" },
  { name: "National Emergency Service", number: "999" },
  { name: "BMET complaints (online)", number: "bmet.gov.bd" },
  { name: "Ami Probashi (registration, BMET clearance)", number: "amiprobashi.com" },
];

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
