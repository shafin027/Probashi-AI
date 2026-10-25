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

## Business model

| Stream | Price |
|---|---|
| Free Safety Check | ৳0 forever |
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
| `npm test` | Rule-engine unit tests |
| `npm run test:integration` | **43 tests** on a production build with a recording mock AI: headers/CSP, origin/size/type guards, disguised and malicious uploads, Claude + OpenAI request shapes (image/PDF OCR blocks, schemas, fallbacks), refusal/bad-JSON/500 fallbacks, sealed report + tampering, accounts, cookie flags, brute-force throttling, vector-memory ranking, memory erase, account deletion, STT/TTS, rate limits, no secrets in the bundle |
| `npm run test:e2e` | Real Chromium, desktop + mobile (webapp-testing skill): **axe-core WCAG 2.2 AA scan of 10 pages**, offer-letter upload, OCR result, paid unlock, sign-up, memory-personalised chat, suggestion chips, **fake microphone → STT**, TTS playback, readiness milestones, full quiz round, progress sync to a second device, account deletion, **real Tesseract OCR on device**, no CSP violations or console errors, no horizontal scroll |
| `npm run test:live` | **Real AI, no mocks**: OCR on generated English/Bangla offer letters (PNG + PDF), prompt-injection document, Bangla chat, TTS→STT voice round trip, account + memory personalisation |

| `npm run test:perf` | Low-end phone budget (4× CPU slowdown, slow 4G, mobile): JS ≤ 450 KB, LCP ≤ 4 s, **CLS ≤ 0.1**, TBT ≤ 900 ms on /, /check, /journey, /ask |

`npm run predeploy` runs all of them.

## Run locally

```bash
cd probashi-ai
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY and/or OPENAI_API_KEY
npm run dev                  # http://localhost:3000 (embedded Postgres+pgvector, no setup)
```

## Deploy to Vercel (after `npm run predeploy` passes)

1. **Database:** create a Postgres database with pgvector, e.g. Neon from the Vercel Marketplace (Storage → Neon). This sets `DATABASE_URL`. Tables are created automatically on first request.
2. **Rate limits:** add Upstash Redis from the Vercel Marketplace (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
3. Import `shafin027/CS` on [vercel.com/new](https://vercel.com/new), set **Root Directory = `probashi-ai`**.
4. Environment variables (Production): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (optional but recommended), `REPORT_SECRET` (`openssl rand -base64 48`), `HEALTH_TOKEN`, `AI_DAILY_LIMIT`, `PAYMENT_MODE=demo`. Add `ALLOWED_ORIGINS` if you use a custom domain.
5. Deploy a **Preview** first, run `BASE_URL=<preview-url> npm run test:live`, then promote to Production.
6. Check `curl -H "x-health-token: $HEALTH_TOKEN" https://<domain>/api/health`: every value should be true.

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

From [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills), vendored in `.claude/skills/` (Apache-2.0):
- **webapp-testing**: `with_server.py` runs the mock AI and multiple app configurations for the integration and E2E suites (`tests/run-*.sh`)
- **theme-factory**: the "Forest Canopy" theme for the web app and the deck
- **pptx**: the pitch deck

## Data caveats

Agency records in `lib/data/agencies.ts` are **fictional demo data**. Official cost ceilings are from Ministry circulars (2017; Malaysia 2021) and should be re-checked against bmet.gov.bd before launch.
