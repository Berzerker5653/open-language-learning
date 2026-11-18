# Competitive gap analysis — LTS vs the 2026 market

Date: 2026-11-17 · Sources: full research log in `docs/research-notes-2026-11.md` (every claim cited there) · LTS inventory: `docs/FEATURE_PLAN.md` (2026-10-17 ledger)

## One-line verdict
The whole industry spent 2025–2026 bolting AI conversation onto scripted courses, and every player stumbled on the same three things: **ASR brittleness, no memory of your recurring errors, and fake CEFR calibration**. The Russian niche has *zero* voice-first AI players. LTS's shipped core (interlinear reading + morphology-aware SRS + guided speech + offline privacy) already covers what most users cobble together from 3 apps — the gaps are narrow and mostly content + one guided conversation loop.

## Where LTS already matches or beats the field
| LTS feature | Market position |
|---|---|
| Interlinear graded reading + sentence mining | Beats LingQ ($14.99/mo, buggy UI, "not a course"); only reader-first competitor worth naming |
| SRS + FSRS spike + per-dimension mastery | Matches Anki's scheduler without Anki's DIY burden; can do per-inflected-form cards — the pro move r/russian swears by — automatically, which no shipped app does |
| Guided speech suite (dictation, shadowing, discrimination, model selector) | More speech variety than Babbel Speak/TalkPal; honest guided-vs-automatic labeling is *better* than competitors' fake precision |
| World unlocks by capability, not streaks | Direct answer to the #1 engagement resentment (energy/hearts/leagues paywalling) |
| Offline-first, no cloud accounts | Unique among ALL researched apps |
| Fully-AI content pipeline | The majors just gave up on human content (Babbel Live killed Jul 2025) — vindication, and our cost structure beats Rocket's authoring |
| Placement/diagnostic (personal scores, honestly uncapped) | Competitors' CEFR labels are widely distrusted ("TalkPal calibration off", "Busuu overstates") |

## The gap list (ranked by value ÷ feasibility under our gates)

### G1. Open-ended guided conversation loop — the table-stakes feature we don't have
Every major (Duolingo Video Call, Babbel Speak, Busuu AI Conversations) and every AI-native app leads with free conversation. LTS has scripted scenarios with recovery branches but no freeform voice loop.
- Fits AI-001 (BUILD, opt-in, never a grade). Duolingo's own UX lessons are free intel: transcript + feedback AFTER the call (not mid-reply), topic pulled from recent lessons, cross-session memory of what you talked about, tap-to-speak (kills VAD awkwardness), short capped exchanges.
- Guardrails: conversation never produces a score or mastery signal (keeps SPEECH-007 gate clean); feedback is observations + "explain why" links, explicitly uncalibrated.

### G2. Error memory → SRS-for-errors — the industry's open gap, our moat
Langua's reviewer (the most complete AI tutor on the market): *"the correction has no stake in you being right… no memory of the mistake you have repeated for a month."* verbamor's Russian thesis: *"every step up buys correction, not content."* Nobody ships it.
- LTS uniquely can: local error ledger + existing SRS + pymorphy morphology. When dictation/scenario/composition surfaces a case-aspect-stress error, offer (never force) a per-form review card, and count recurrences to drive `personalize_progression`.
- This is personal-only signal (n=1 safe, FEATURE_PLAN build order #3 already anticipated it) — no calibration claim.

### G3. Russian hard-parts surfacing at point of need
Cases, aspect, stress = the Russian bottleneck per every source; Duolingo Russian plateaus early and isn't B2; NuanceDeck proves demand for stress-on-every-word + case-brackets-under-every-sentence (cards only, no speaking, no course).
- LTS's interlinear layer is the perfect delivery vehicle: stress marks, case labels, aspect pair links inline in stories and conversation transcripts. Nobody combines this with voice. **Correction 2026-11-17:** the reading half of this combo now exists (NuanceDeck, Russio — see `competitor-systems-deep-dive-2026-11.md`); only the *voice* half of the combination is still ours.

### G4. Instant grammar explanation ("why did the ending change?")
Duolingo made Explain My Answer FREE Jan 2026 — it's commodity UX now. Pimsleur's biggest stated weakness is exactly this (can produce endings, can't explain them).
- AI-001 button on any exercise: explain in L1 at moment of need (Babbel's per-native-language grammar pattern is the model worth copying).

### G5. Engagement ritual without paywall toxicity
Duolingo's engine (streaks, XP, leagues, 2025 Energy system) drives retention AND the biggest complaint volume. Babbel/Busuu billing traps pollute ~half their 1-star reviews.
- LTS gap: no daily ritual/return hook beyond the planner. Cheap wins: visible personal streak (no loss-punishment), session recap card, weekly "what got harder this week" report from your own data. Do NOT import energy/hearts/leagues.

### G6. ASR robustness as a stated quality bar
The #1 complaint in EVERY voice competitor: mic failures (Speak), strict recognizers rejecting correct speech (Busuu), misheard words scored wrong (TalkPal), tones not actually evaluated (marketing dishonesty).
- LTS already ships model selector + dictation-free ASR (ADR-0012). Add: forgiving-match scoring on dictation (edit-distance near-miss = "almost" not "wrong"), visible "I heard X" echo on every utterance, abstain-when-unsure behavior (already our guided posture — say so in UI, it's a trust feature competitors lack).

### G7. Content depth (AUTHOR lane, not a feature gap)
Our RU A1 corpus (68 sentences, 4 stories, 77 lemmas) vs Rocket's 146 hours / Pimsleur's 5 levels. The A2 ramp (verbamor's "course feels thin around A2" insight) is where users churn. Continue story/lemma expansion with the i+1 recycling pattern PlusOneLanguage gets praised for.

### G8. Platform reach
Competitors are mobile-first; LTS is desktop + LAN web review pages. PLAT/WEB lanes (already BUILD-bucket) gate any audience beyond the owner. Not urgent pre-launch but it's the true last-mile gap.

## Explicit non-gaps (don't chase)
- Automatic pronunciation scoring (SPEECH-007 gated; ELSA's phoneme scoring is their whole product, ours stays guided — honesty is the feature).
- Streak-paywall/energy monetization, leagues, avatars-as-marketing (Praktika's avatar focus correlates with its "repetitive conversation" complaints).
- Human tutoring features (industry abandoned them; ADR-0017 AI-only posture).
- Community peer correction (Busuu's is free and loved but needs network effects we can't have offline).

## Suggested next-step order (all within BUILD/AUTHOR buckets)
1. G2 error-ledger → per-form cards + recurrence signal (pure local, no new AI, biggest uniqueness).
2. G4 explanation button via AI-001 with privacy notice + "never a grade" rule.
3. G1 guided conversation loop reusing scenario runtime + G2/G4 (transcript-after feedback, tap-to-speak).
4. G3 stress/case/aspect inline annotation pass over existing RU pack.
5. G7 content: A2 story tranche with i+1 lemma recycling.
6. G5 recap/streak-lite ritual. G6 ASR echo + near-miss handling rides along with G1.

Pricing anchors for whenever LTS faces a launch decision: mainstream $10-13/mo (~$84-108/yr), AI tutors $10-30/mo ($60-168/yr), Russian niche one-time $150-450 (Rocket) — one-time-with-refund-window is the Russian market's trust signal (60-day guarantee is Rocket's strongest consumer fact; Langua's web-only refund wins goodwill vs app-store billing-trap resentment everywhere else).
