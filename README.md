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
| `/agency`, `/agency/[rl]` **Agency Lookup** | Search BMET's official licence list (RAIMS import): licence status and validity, an explainable **0–100 confidence score**, verified worker reviews, live offers | — |
| `/offers` **Verified offers** | Offers published by verified agencies only; each one passed the rule engine and the government cost ceiling | — |
| `/partner` **Agency portal** | Licensed agencies register their RL number (verified against the official list), publish offers (blocked automatically if above the legal cost or with free/visit visas), confirm worker placements, reply to reviews | — |
| `/help`, `/help/[ref]` **Report a problem** | Workers report fraud, unpaid wages, a held passport, abuse; get a case reference, official free channels, and (Premium or emergency) a legal-aid caseworker with a message timeline | — |
| `/legal` **Legal-aid dashboard** | Staff case queue (urgent first), assign, status, messages vs. internal notes, "substantiated" flag that counts in the agency score; agency, placement and review moderation queues | — |
| `/premium` + **AI phone line** | Premium: caseworker for every report and a Bangla AI phone agent. The caller is identified by a phone PIN, then the agent sees their memory and cases, checks offers and agencies, files reports and transfers to a human | OpenAI Realtime (SIP) |
| `/ask` **Ask in Bangla** | Voice or text Q&A with sources, 3 personalised follow-up suggestions, auto read-aloud; emergency answers surface 16135 / 999 | Claude / OpenAI |
| Voice everywhere | Natural Bangla speech-to-text (`gpt-4o-transcribe`) and neural text-to-speech (`gpt-4o-mini-tts`, warm Dhaka-Bangla instructions); browser voice as fallback | OpenAI |
| `/login`, `/account` **Accounts + memory** | Phone + password accounts; a **pgvector memory** of each user's checks and questions, recalled by meaning to personalise answers; view/forget memories, turn memory off, delete account | OpenAI embeddings |
| `/privacy` | What is stored and how it is protected | — |
| `/plan` **Family & Money Plan** | Formal remittance vs. hundi, debt payoff, savings goal, family document checklist | — |
| `/journey` **Safe Migration Readiness** | Gamified 0–100 readiness score from 10 real safety steps, 4 levels, celebrations, a "next step" prompt, emergency contact card, family share; synced to the account | — |
| `/quiz` **Scam Spotter** | 6 random real-world scenarios per round with explanations; 80%+ earns the step | — |
| On-device OCR | Free open-source **Tesseract** (Bangla + English) reads photos *on the phone* when cloud AI is unavailable, or on request for privacy; self-hosted, CSP-safe | — |
| `/` Landing | Problem, how it works, live real-usage counter, readiness teaser, trust section (Hairline vault), quiz teaser, **"why" FAQ**, pricing, business model and checks and balances, scale story, **buildathon watermark** | — |

### Trust by design
- A **deterministic rule engine** (`lib/rules.ts`) owns the verdict: official cost ceilings, minimum wages, free or visit visas, licence status, paying a dalal, no receipt, no BMET clearance, scam corridors (Russia, Libya, Myanmar/Cambodia scam compounds).
- **AI can add warnings but can never remove a rule-based flag.**
- Every figure carries its source (`lib/data/countries.ts`).
- Works without an API key: rules-only mode, on-device OCR and an offline FAQ.

### Ethical gamification
Built with the *onboarding-psychologist* skill's rule for high-stakes products: **"optimize for confidence and reassurance, not streak pressure"** and **"build habits through value, not addiction mechanics."**
- Points only for actions that protect the worker (verify agency, know the official cost, BMET registration, documents with family…). Nothing for time spent.
- No streaks, no countdowns, no fake scarcity, no invented testimonials. The live counter shows real database counts or nothing.
- Variable reward done honestly: each quiz round is a fresh mix of real scam patterns, and always includes a "safe" example so users learn what good looks like.
- Progress never decreases. The server only merges (union), so a bad client can't erase it.

## Agencies, reviews and legal aid

- **Verification source.** Bangladesh has no "tender list" for recruiters; the authoritative source is BMET's licensed recruiting-agency register (RAIMS, `raims.oep.gov.bd/agencies`), which lists each agency's RL number, name, address, licence status and validity. Export it as CSV and import it with `scripts/import-registry.ts` or the admin endpoint. Every registered agency is re-checked daily (`/api/cron/reverify`, Vercel cron); a lapsed, suspended or cancelled licence suspends the agency and pauses its offers.
- **Proof of control.** Knowing an RL number is not enough to claim it. Instant verification needs the licence to be active, the name to match, *and* the account's phone to be the phone on the official record. Otherwise staff call the official number before verifying.
- **Reviews only from real placements.** A worker first adds their placement; the agency can confirm or dispute it (never delete it), and disputes go to staff. Reviews are public only from confirmed placements, phone/ID numbers are scrubbed, and only the reviewer's initial is shown. Agencies get one public reply.
- **Confidence score** (`lib/trust.ts`): licence (no active licence = danger, max 10), platform verification, verified reviews with a Bayesian prior (one review can't swing it), "promise kept" ratio, complaints our legal team **substantiated**, and blocked offers. Every point is listed as a reason. Payment never enters the formula.
- **Cases.** Every report gets a reference and the official free channels for its problem (Probash Bandhu 16135 / +8809610102030 from abroad, BMET arbitration, NLASO legal aid 16430, 999, embassy labour wing, police under the 2013 Migrants Act / 2012 Trafficking Act). Premium reports and **all emergencies** (abuse, trafficking, detention, held passport) go to a caseworker. Safety is never paywalled.
- **Staff roles** are granted only by configuration: `STAFF_PHONES="01711111111:admin,01811111111:legal"`.

## AI phone line

```
Caller ──PSTN──▶ SIP trunk (Twilio Elastic SIP, or a Bangladeshi IPTSP) ──▶ sip:<project-id>@sip.api.openai.com;transport=tls
OpenAI ──signed webhook realtime.call.incoming──▶ /api/phone/incoming ──accept (Bangla instructions, voice, tools)
/api/phone/incoming ──after()──▶ sideband WebSocket on the call: tool calls run on our server
```

- **Identification:** caller ID only selects the greeting (it can be spoofed). Account data is available only after `verify_identity` succeeds with the caller's Probashi AI phone PIN (scrypt-hashed, set in `/account`, Premium). Three wrong PINs end the call; ten failures per number per day lock the line for it. The agent is told never to ask for bKash/bank PINs, passwords or OTPs.
- **Tools:** `verify_identity`, `check_offer` (same rule engine), `check_agency` (licence list + score), `my_cases`, `report_issue` (creates a real case), `remember_fact` (vector memory), `transfer_to_human` (SIP REFER to `PHONE_TRANSFER_TO`), `end_call`. After identification the session instructions are updated with the caller's name, recalled memories and case statuses.
- **Privacy:** transcripts are never stored (the caller speaks their PIN); the call record keeps a salted hash of the number and which tools ran.
- **Setup:** OpenAI dashboard → Project → Webhooks → add `https://<domain>/api/phone/incoming` for `realtime.call.incoming` and copy the secret to `OPENAI_WEBHOOK_SECRET`. Point the SIP trunk's origination URI at `sip:<project-id>@sip.api.openai.com;transport=tls`. Set `PHONE_LINE_ENABLED=1`, `PHONE_LINE_NUMBER` (shown on the site) and `PHONE_TRANSFER_TO` (e.g. `tel:+8809...`). Calls are capped at `PHONE_MAX_CALL_MS` (default 12 min) to stay within the function's `maxDuration` (800 s needs Vercel Pro with Fluid compute). Twilio does not sell Bangladeshi numbers; use a local IPTSP SIP number or an international number with call forwarding.

## Business model

| Stream | Price |
|---|---|
| Free Safety Check, agency lookup, reviews, reports with official channels, emergency caseworker | ৳0 forever |
| **Premium** (caseworker for every report, AI phone line, priority help) | ৳199/month or ৳1,499/year |
| Verified Offer Report | ৳299 per offer, money back if a red flag is missed |
| Family Plan | ৳149/month |
| Licensed remittance / course / insurance referrals | bounty or 10–20% commission, always disclosed |
| Sponsored agency listing | ৳5–15k/month, labelled, never affects scores |

The AI cost per report is about ৳10–20 and the payment gateway takes about 2%, so gross margin is about 90%. The checkout is a **demo** (no real money is charged). Production would use the bKash Tokenized Checkout or SSLCommerz with server-side verification.

## Architecture

```
Browser ──HTTPS──▶ Next.js on Vercel (proxy.ts: nonce CSP + security headers)
                    ├─ /api/analyze ─ guards ─▶ rule engine ─▶ Claude (fallback: OpenAI) vision + JSON schema
                    ├─ /api/ask ───── guards ─▶ pgvector recall ─▶ Claude/OpenAI ─▶ answer + 3 suggestions
                    ├─ /api/voice/stt|tts ───▶ OpenAI gpt-4o-transcribe / gpt-4o-mini-tts
                    ├─ /api/auth/* /api/account /api/memories ─▶ Postgres + pgvector (Neon/Supabase)
                    └─ /api/unlock ─▶ AES-256-GCM sealed premium report
```

## Security

| Threat | Protection |
|---|---|
| XSS / script injection | Per-request **nonce CSP** with `strict-dynamic`, `object-src 'none'`, React escaping, no `dangerouslySetInnerHTML` |
| Clickjacking | `frame-ancestors 'none'`, `X-Frame-Options: DENY` |
| CSRF / other sites using our API | Strict **Origin check** on every state-changing route; SameSite=Lax cookies |
| Session theft | 256-bit random tokens, only SHA-256 stored, `__Host-` **HttpOnly Secure** cookie, server-side logout |
| Password cracking | **scrypt** (N=16384) with per-user salt, common-password block, constant-time compare |
| Brute force / enumeration | Per-IP and per-account login throttling; identical errors and timing for unknown numbers |
| Malicious uploads | **Magic-byte** type check, size caps, streaming body limit, PDFs with JavaScript/launch actions rejected |
| Injection (SQL / schema) | Parameterised SQL only; strict zod schemas reject unknown fields |
| Prompt injection | Untrusted content wrapped and labelled; AI can't remove rule-engine flags; outputs clamped |
| Bill abuse / DoS | Per-IP rate limits (Upstash-backed in prod), **global daily AI cap**, request timeouts |
| Payment bypass | Paid content **encrypted** until the unlock endpoint verifies payment; tampered tokens fail auth |
| Data leakage | Generic errors, no secrets in client bundle (tested), no document storage, delete-my-data |

## Testing (all must pass before deploying)

| Command | What it proves |
|---|---|
| `npm run lint` | TypeScript strict typecheck |
| `npm test` | **33 unit tests**: rule engine, journey, registry parsing/matching/expiry, CSV import, confidence score, offer blocking, personal-data scrubbing, case tiers, SIP caller parsing, PIN rules |
| `npm run test:integration` | **67 tests** on a production build with a recording mock AI (and a mock Realtime SIP + sideband WebSocket): agency verification (auto, staff, squatting, suspended), offer blocking, placement-gated reviews, case tiers and staff workflow, internal-note privacy, signed phone webhooks (forged/tampered/wrong key refused), a full simulated phone call with PIN identification, memory and case filing, PIN lockout, licence import + re-verification, cron auth, headers/CSP, origin/size/type guards, disguised and malicious uploads, Claude + OpenAI request shapes (image/PDF OCR blocks, schemas, fallbacks), refusal/bad-JSON/500 fallbacks, sealed report + tampering, accounts, cookie flags, brute-force throttling, vector-memory ranking, memory erase, account deletion, STT/TTS, rate limits, no secrets in the bundle |
| `npm run test:e2e` | Real Chromium, desktop + mobile (webapp-testing skill): **axe-core WCAG 2.2 AA scan of 16 pages**, agency search and profile, filing an emergency report, Premium + phone PIN, agency sign-up → instant verification → blocked and live offers, offer-letter upload, OCR result, paid unlock, sign-up, memory-personalised chat, suggestion chips, **fake microphone → STT**, TTS playback, readiness milestones, full quiz round, progress sync to a second device, account deletion, **real Tesseract OCR on device**, no CSP violations or console errors, no horizontal scroll |
| `npm run test:live` | **Real AI, no mocks**: OCR on generated English/Bangla offer letters (PNG + PDF), prompt-injection document, Bangla chat, TTS→STT voice round trip, account + memory personalisation |

| `npm run test:perf` | Low-end phone budget (4× CPU slowdown, slow 4G, mobile): JS ≤ 450 KB, LCP ≤ 4 s, **CLS ≤ 0.1**, TBT ≤ 900 ms on /, /check, /journey, /ask |

`npm run predeploy` runs all of them.

## Run locally

```bash
git clone https://github.com/shafin027/probashi-ai.git
cd probashi-ai
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY and/or OPENAI_API_KEY
npm run dev                  # http://localhost:3000 (embedded Postgres+pgvector, no setup)
```

## Deploy to Vercel (after `npm run predeploy` passes)

1. **Database:** create a Postgres database with pgvector, e.g. Neon from the Vercel Marketplace (Storage → Neon). This sets `DATABASE_URL`. Tables are created automatically on first request.
2. **Rate limits:** add Upstash Redis from the Vercel Marketplace (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
3. Import `shafin027/probashi-ai` on [vercel.com/new](https://vercel.com/new). The app is at the repository root, so leave Root Directory as is.
4. Environment variables (Production): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (optional but recommended), `REPORT_SECRET` (`openssl rand -base64 48`), `HEALTH_TOKEN`, `AI_DAILY_LIMIT`, `PAYMENT_MODE=demo`, `STAFF_PHONES`, `CRON_SECRET` (`openssl rand -base64 32`; Vercel sends it to the daily cron). For the phone line: `PHONE_LINE_ENABLED=1`, `OPENAI_WEBHOOK_SECRET`, `PHONE_LINE_NUMBER`, `PHONE_TRANSFER_TO`. Add `ALLOWED_ORIGINS` if you use a custom domain. For the buildathon demo you can set `DEMO_REGISTRY=1` to use the fictional agencies instead of a real RAIMS import.
5. **Licence list:** export the RAIMS agency list as CSV and run `DATABASE_URL=... node --experimental-strip-types scripts/import-registry.ts list.csv "RAIMS export <date>"` (or upload it as an admin via `POST /api/admin/registry`).
6. Deploy a **Preview** first, run `BASE_URL=<preview-url> npm run test:live`, then promote to Production.
7. Check `curl -H "x-health-token: $HEALTH_TOKEN" https://<domain>/api/health`: every value should be true.

## Watermark

The footer on every page shows the "Built for YUNet AIgnite Buildathon 2026" watermark from `public/yunet-watermark.svg`. **Replace that file with the official file from the organisers** (same name, or update the `src` in `components/Footer.tsx`).

## Pitch deck

`pitch/Probashi-AI-Pitch.pptx` is the 5-slide deck: problem, solution, how it works, business, team and roadmap. Speaker notes are included. To regenerate it, run `pitch/build-deck.js` (it needs `pptxgenjs`, `react-icons`, `react`, `react-dom` and `sharp`). **Edit slide 5** with your full name, photo and live URL before submitting.

## Tools evaluated for this version

| Tool | Verdict | Why |
|---|---|---|
| **@lucasmarkes/hairline** | ✅ Used | Zero-dependency MIT interactive line figures. Vault (trust), Elevator (readiness levels), Loupe (quiz), themed to the palette, reduced-motion safe |
| **motion-dev-animations** skill + `motion` | ✅ Used | Reveal/stagger/spring timings, AnimatePresence for quiz cards and toasts, `useReducedMotion` everywhere |
| **greensock/gsap-skills** | ✅ Used on the landing page | `gsap-react` (useGSAP, scoped cleanup), `gsap-timeline` (hero offer-scan story), `gsap-scrolltrigger` (scroll progress, CSS sticky instead of pin to avoid layout shift), `gsap-performance` (transform/opacity only, pause off-screen); loaded only on the landing page |
| **freshtechbro/claudedesignskills** | ✅ Patterns used | `motion-framer` and `lightweight-3d-effects` patterns (magnetic CTA, card tilt) built with Motion transforms instead of extra libraries; heavy WebGL/Three.js deliberately left out for low-end phones |
| **affaan-m/ECC frontend-design-direction** | ✅ Used | Design contract, all six content states, and the evidence gate: `docs/design-evidence/report.json` passes its `check-evidence.js` checker |
| **sickn33/agentic-awesome-skills** | ✅ Used selectively | `design-ux` (Nielsen audit by an independent judge), `onboarding-psychologist` (ethical habit design), `frontend-design`, `price-psychology-strategist`, `llm-app-security` |
| **affaan-m/ECC** | ✅ Used selectively | `accessibility` (WCAG 2.2 AA, enforced with axe-core in E2E), `security-review` |
| **baidu/Unlimited-OCR** | ❌ Not suitable | Needs an NVIDIA GPU (CUDA/vLLM), so it can't run on Vercel; no documented Bangla. Claude/GPT vision already read Bangla, and Tesseract (Bangla) is the free fallback |
| **pocketbase** | ❌ Not needed | Separate always-on Go server; we already have tested Postgres auth + pgvector on Vercel |
| **infiniflow/ragflow** | ❌ Not needed | Heavy RAG server (Docker, Elasticsearch); per-user pgvector memory covers our retrieval |
| **Graphify-Labs/graphify** | ❌ Not for the app | Code knowledge-graph tool for developers, not a product feature |
| **snarktank/ralph**, **ruvnet/ruflo** | ❌ Not for the app | Agent-orchestration harnesses for running coding agents; no user-facing value |

## Skills used

From [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills), vendored in this repo under `.claude/skills/` (Apache-2.0):
- **webapp-testing**: `with_server.py` runs the mock AI and multiple app configurations for the integration and E2E suites (`tests/run-*.sh`)
- **theme-factory**: the "Forest Canopy" theme for the web app and the deck
- **pptx**: the pitch deck

## Data caveats

Agency records in `lib/data/agencies.ts` are **fictional demo data**. Official cost ceilings are from Ministry circulars (2017; Malaysia 2021) and should be re-checked against bmet.gov.bd before launch.
