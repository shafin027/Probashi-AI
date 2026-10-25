# Brag plan: Probashi AI

Workflow: /brag-slim (Opus 5.5 hand-off). Tone: **polished** (serious, elegant, restrained), with one dramatic hook.
Format: landscape 1920×1080, 30 fps. Duration **21.6 s**. Tempo **100 BPM**: 1 beat = 0.6 s = 18 frames, so every cut lands exactly on a frame.

## Inspect: answers
- **What is it?** A Bangla, voice-first web app that checks an overseas job offer, agency and price *before* a migrant worker pays a broker.
- **Who is it for?** Bangladeshi migrant workers and their families. It tells them whether an offer is fair, and what to do next.
- **What sets it apart?** A transparent rule engine (official cost limits, licences, visa tricks) plus AI document reading, in plain Bangla, with a safety journey that continues after departure.
- **Most impressive claim (from the product's own output):** the app's sample offer asks **৳6,50,000** where the official limit is **৳1,65,000**: **3.9×**, ৳4,85,000 extra. Score **0/100**, **9 red flags**.
- **Visual hook:** a WhatsApp-style broker message and a price that keeps climbing, then the question "would you pay this?".
- **Real UI to show:** the offer check (verdict card, score ring, red flags with Bangla severity, cost table), voice mic, readiness ring and phases, verified seal.
- **Tone:** polished; the stakes are real, so no jokes.
- **Share caption:** "Before you pay a broker lakhs of taka, check the offer. Probashi AI reads it in Bangla and shows the red flags in seconds."

Data note: all on-screen numbers and flags are the real output of `lib/rules.ts` for the app's built-in sample offer. No personal data; no secrets.

## Angle
**"Would you pay ৳6,50,000 for this?"** Open on the broker's message, the way the scam actually arrives, then show the product calmly taking it apart.

## Visual identity (from app/globals.css)
Forest `#2d4a2b` (dominant) · ivory `#faf9f6` · olive `#a4ac86` · terracotta `#b5452f` (danger only) · gold `#b8862b` (achievement only).
Headlines Noto Serif Bengali 700; body Hind Siliguri. Signature motif: the verified seal (shield + check) from the app's logo.

## Storyboard (beats @100 BPM, B = beat index)
| # | Beats | Time | Scene | On screen (Bangla first, English line under) | Motion | Sound |
|---|---|---|---|---|---|---|
| 1 Hook | B0–6 | 0.0–3.6 | Broker message | Dark forest bg. WhatsApp-style bubble types the real sample text; a price counter climbs to **৳৬,৫০,০০০**, then "দেবেন?" / "Would you pay this?" | Bubble pops (B0), counter B1–B3, question lands B4 | Low drone + heartbeat kicks; riser B4→B6 |
| 2 Reveal | B6–10 | 3.6–6.0 | Brand | Seal draws; **টাকা দেওয়ার আগে যাচাই করুন** / "Check before you pay." + "Probashi AI" | Seal stroke B6–7, headline B7 | Drop: boom + C-major chime on B6; groove starts |
| 3 Check | B10–22 | 6.0–13.2 | Offer check in use | Offer-letter card slides in; scan line; verdict card: ring falls 100→0, **বিপদ! টাকা দেবেন না**; 4 real flags stack (free visa, 3.9× limit, money to a person, passport with broker); caption "ছবি তুলুন, লাল পতাকা দেখুন" / "Snap the offer. See every red flag, in Bangla." | Scan B11–13; score B13–15; flags on B15, 16, 17, 18 | Soft plucks in key on each flag |
| 4 Cost | B22–27 | 13.2–16.2 | True cost | Official ৳১,৬৫,০০০ vs asked ৳৬,৫০,০০০ → **বাড়তি ৳৪,৮৫,০০০** (terracotta), "৩.৯×"; source line | Bars grow B22–24; extra lands B24 | Bass accent on B24 |
| 5 Voice + journey | B27–31 | 16.2–18.6 | Use it by voice, get ready | Mic pulses with a Bangla question "ফ্রি ভিসা কি নিরাপদ?"; readiness ring 0→55 **প্রস্তুত · Prepared**; three phase chips | Ring fill B28–30 | Rising arp |
| 6 Outro | B31–36 | 18.6–21.6 | Brand + promise | Seal, **Probashi AI**, "টাকা দেওয়ার আগে যাচাই করুন", "Free · Bangla · Voice-first", small "Built for YUNet AIgnite Buildathon 2026" | Settles by B32, holds | Final chord rings, fade last 1.2 s |

Reading time: every line meant to be read holds ≥ 0.3 s/word after it is fully on screen.

## Music
Original, synthesized for this video (no bundled tracks): 100 BPM, hook in A minor (drone + heartbeat), drop at B6 into C major groove, chords C–G–Am–F every 4 beats from B6, soft kick/clap/hats, bass, pluck arpeggio. Sound effects in the same key on the same grid (plucks on flags, whoosh into cuts, boom on the reveal), mixed under the music.
