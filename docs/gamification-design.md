# Gamification design: Safe Migration Journey

Produced with the `gamification` skill's 7-step process. The journey is the main
engagement driver; the scam quiz is a small extra.

## 1. Objective (not a vanity metric)
**Of the people who check an offer, the share who also verify the agency and learn the official cost before paying.**
These two actions are what most often stop overcharging and fake offers.
Measured as `verifiedAgencyPct` and `knowsTrueCostPct` in the token-protected `/api/health` funnel.

## 2. Target behaviours and B=MAP blockers
| Behaviour | Blocker | Treatment |
|---|---|---|
| Check the offer | Ability (documents are hard) | Simplified: photo upload, OCR autofill, optional fields collapsed |
| Verify the agency | Prompt | Next-step card; counted automatically when an RL number is checked |
| Know the true cost | Ability | Simplified: the offer check shows the official limit and counts the step |
| BMET registration, orientation | Prompt | Links to Ami Probashi / BMET + self-reported step |
| Spot scams independently | Motivation | Gamified: quiz (small extra) |
| Protect self abroad | Prompt + motivation | Phase 2 steps, unlocked at "Prepared" |
| Help others | Motivation (meaning) | Phase 3 steps with one-tap WhatsApp share |

## 3. Players
- **Workers before departure** (Achiever + Philanthropist: progress and protecting family).
- **Family members** (Socialiser/Philanthropist: relatedness, shared decision).
- **Workers abroad** (need practical protection, low time).
Baseline interest in safety is high, so the **tangible-reward path is closed**: points are informational
(a readiness %), with no prizes, discounts or currency.

## 4. Loops
- **Engagement loop**: action → immediate, specific feedback (toast, ring) → next-step card.
- **Progression loop**: Before you pay (0–100) → After you arrive (unlocks at 50) → Protect others.
- **Post-reward reset**: each level-up names the next goal; finishing phase 1 chains into phase 2.
- **Month-three user**: is abroad, using phase 2 (passport, salary proof, formal remittance) and phase 3 (helping others).

## 5. Mechanics → need
| Mechanic | Need served | Rule from mechanics.md |
|---|---|---|
| Readiness ring / progress bars | Competence | Honest totals; only real actions count |
| Levels (4) | Competence | Each level = a real capability |
| Next-step card | Autonomy + prompt | Always one meaningful next goal |
| Phases | Competence over time | Goal chaining |
| Celebration toasts | Competence (informational) | Suppressed on danger/caution verdicts |
| Help someone / share with family | Relatedness, meaning | Cooperation over competition |
| Quiz with chosen difficulty | Competence (flow channel) | User picks standard or hard; variety is in content |

**Cut deliberately**: leaderboards (sensitive domain), streaks (occasional, high-stakes behaviour),
points shop or prizes (overjustification), countdowns or scarcity (black-hat), public counts of client events (gameable).

## 6. Ethics gate
- **Alignment**: pass. Every point is a step that protects the user; we earn the same whatever they do.
- **Manipulation Matrix**: pass. We would use it ourselves, and it materially reduces fraud risk.
- **Black-hat dosage**: pass. No FOMO, loss or scarcity mechanics.
- **Long-term change**: reflection and meaning ("why this matters" on every step); no rewards.
- **Regulatory floor**: no dark patterns; the paid report is optional and calm; no minors targeted.

## 7. Measure and iterate
`/api/events` counts allow-listed events (no user id, rate-limited). The funnel in `/api/health` reports:
offer checks → % verified agency → % knows true cost → % reached Prepared, plus quiz passes and help-someone shares.
Watch for metric gaming on self-reported steps (they are labelled "self-reported"), and for novelty decay in quiz use.
Remove any mechanic that doesn't move the objective rather than tuning it harder.
