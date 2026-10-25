# Probashi AI: টাকা দেওয়ার আগে যাচাই করুন

**An AI safety copilot for Bangladeshi migrant workers and their families.** It checks an overseas job offer, the recruiting agency and the price in plain Bangla *before* anyone hands lakhs of taka to a dalal.

Built for **YUNet AIgnite Buildathon 2026**.

## The problem

- About **11.3 lakh** Bangladeshis went abroad for work in 2025 (BMET / RMMRU), and remittance hit a record **$35.6B** in FY2025-26.
- Workers pay several times the government ceiling. Malaysia's official cost is Tk 78,990, but workers report Tk 3.5–5 lakh. The UN cites $4,500–6,000 recruitment fees against a $720 MoU limit.
- In a study of BMET arbitration complaints, only **24%** of workers who received permits got the promised job.
- Government apps (Ami Probashi) handle registration and clearance. **Nobody checks the offer itself** before money changes hands. That is the gap Probashi AI fills.

## Features

| Page | What it does | AI |
|---|---|---|
| `/check` **Offer Checker** | Photo/PDF of visa, contract or demand letter, plus a pasted or spoken offer message → 🟢🟡🔴 verdict, red flags, cost check, next steps, full report (negotiation script, agency questions, printable/WhatsApp share) | Claude vision + structured JSON |
| `/cost` **True Cost Calculator** | Official ceiling vs. asked price, loan interest, payoff months, take-home after the contract | — |
| `/agency` **Agency Lookup** | RL licence status, verified complaints, labelled "Sponsored" listings that lose the badge automatically | — |
| `/ask` **Ask in Bangla** | Voice or text Q&A with sources; emergency answers surface 16135 / 999 | Claude |
| `/plan` **Family & Money Plan** | Formal remittance vs. hundi, debt payoff, savings goal, family document checklist | — |
| `/` Landing | Problem, how it works, **"why" FAQ**, pricing, business model and checks and balances, scale story, **buildathon watermark** | — |

### Trust by design
- A **deterministic rule engine** (`lib/rules.ts`) owns the verdict: official cost ceilings, minimum wages, free or visit visas, licence status, paying a dalal, no receipt, no BMET clearance, scam corridors (Russia, Libya, Myanmar/Cambodia scam compounds).
- **AI can add warnings but can never remove a rule-based flag.**
- Every figure carries its source (`lib/data/countries.ts`).
- Works without an API key: rules-only mode plus an offline FAQ.

## Business model

| Stream | Price |
|---|---|
| Free Safety Check | ৳0 forever |
| Verified Offer Report | ৳299 per offer, money back if a red flag is missed |
| Family Plan | ৳149/month |
| Licensed remittance / course / insurance referrals | bounty or 10–20% commission, always disclosed |
| Sponsored agency listing | ৳5–15k/month, labelled, never affects scores |

The AI cost per report is about ৳10–20 and the payment gateway takes about 2%, so gross margin is about 90%. The checkout is a **demo** (no real money is charged). Production would use the bKash Tokenized Checkout or SSLCommerz with server-side verification.

## Run locally

```bash
cd probashi-ai
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to enable AI
npm run dev                  # http://localhost:3000
```

## Deploy (live link for judges)

1. Import `shafin027/CS` on [vercel.com/new](https://vercel.com/new) and set **Root Directory = `probashi-ai`**.
2. Add the environment variable `ANTHROPIC_API_KEY` (optionally `CLAUDE_MODEL`).
3. Deploy, then put the URL into the deck (slide 5) and your submission.

## Watermark

The footer on every page shows the "Built for YUNet AIgnite Buildathon 2026" watermark from `public/yunet-watermark.svg`. **Replace that file with the official file from the organisers** (same name, or update the `src` in `components/Footer.tsx`).

## Tests

```bash
npm test                     # rule-engine unit tests
npm run build
python ../.claude/skills/webapp-testing/scripts/with_server.py \
  --server "npm run start -- -p 3100" --port 3100 -- python tests/e2e.py   # Playwright E2E, desktop + mobile
```

## Pitch deck

`pitch/Probashi-AI-Pitch.pptx` is the 5-slide deck: problem, solution, how it works, business, team and roadmap. Speaker notes are included. To regenerate it, run `pitch/build-deck.js` (it needs `pptxgenjs`, `react-icons`, `react`, `react-dom` and `sharp`). **Edit slide 5** with your full name, photo and live URL before submitting.

## Skills used

From [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills), vendored in `.claude/skills/` (Apache-2.0):
- **webapp-testing**: Playwright E2E harness (`with_server.py`, `tests/e2e.py`)
- **theme-factory**: the "Forest Canopy" theme for the web app and the deck
- **pptx**: the pitch deck

## Data caveats

Agency records in `lib/data/agencies.ts` are **fictional demo data**. Official cost ceilings are from Ministry circulars (2017; Malaysia 2021) and should be re-checked against bmet.gov.bd before launch.
