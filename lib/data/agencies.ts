// DEMO DATA ONLY. These agencies are fictional. They show how the verified
// agency directory works. In production this table is synced from BMET's
// published recruiting-agency licence list and our own verified complaint records.

export type Agency = {
  rl: string;
  name: string;
  district: string;
  licenceStatus: "valid" | "suspended" | "cancelled";
  verifiedComplaints: number;
  placementsLastYear: number;
  sponsored: boolean;
};

export const DEMO_AGENCIES: Agency[] = [
  { rl: "RL-1001", name: "Shapla Overseas (demo)", district: "Dhaka", licenceStatus: "valid", verifiedComplaints: 0, placementsLastYear: 640, sponsored: true },
  { rl: "RL-1002", name: "Meghna Manpower (demo)", district: "Cumilla", licenceStatus: "valid", verifiedComplaints: 2, placementsLastYear: 310, sponsored: false },
  { rl: "RL-1003", name: "Padma Global HR (demo)", district: "Sylhet", licenceStatus: "suspended", verifiedComplaints: 17, placementsLastYear: 95, sponsored: false },
  { rl: "RL-1004", name: "Jamuna Recruiting (demo)", district: "Chattogram", licenceStatus: "cancelled", verifiedComplaints: 41, placementsLastYear: 0, sponsored: false },
  { rl: "RL-1005", name: "Sundarban Skills Abroad (demo)", district: "Khulna", licenceStatus: "valid", verifiedComplaints: 1, placementsLastYear: 220, sponsored: true },
];

/** Sponsored agencies lose their badge automatically above this many verified complaints. */
export const SPONSOR_COMPLAINT_LIMIT = 5;

export function normaliseRl(input: string): string {
  const digits = input.replace(/[^0-9০-৯]/g, "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  return digits ? `RL-${digits}` : "";
}

export function lookupAgency(query: string): Agency | undefined {
  const rl = normaliseRl(query);
  if (rl) {
    const byRl = DEMO_AGENCIES.find((a) => a.rl === rl);
    if (byRl) return byRl;
  }
  const q = query.trim().toLowerCase();
  if (q.length < 3) return undefined;
  return DEMO_AGENCIES.find((a) => a.name.toLowerCase().includes(q));
}

export function showSponsoredBadge(a: Agency): boolean {
  return a.sponsored && a.licenceStatus === "valid" && a.verifiedComplaints <= SPONSOR_COMPLAINT_LIMIT;
}
