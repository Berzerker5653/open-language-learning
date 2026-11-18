# Competitor systems deep dive — how they run OUR systems, and where they beat us

Date: 2026-11-17. Companion to `competitive-gap-analysis-2026-11.md` (that doc
rated whole apps; this one goes system-by-system against LTS's shipped systems).
Sources: vendor engineering blogs (Duolingo HLR + AI pipeline), app-store
listings (NuanceDeck, Russio, LangLeap, Mishka), independent 2026 reviews
(languatalk, practiceme, lingoseven, rework), Reddit sentiment captured in
`research-notes-2026-11.md`.

**Honest headline: our combo is rare, but no longer unique.** The Russian niche
filled up in 2025–26 with apps that replicate pieces of our stack:

- **NuanceDeck** (2026): 7,500 words inside real sentences with **case labels
  under every word, aspect on every verb, stress on every syllable**, FSRS
  scheduling, per-sentence AI tutor with shared answers, conjugation/aspect
  drills, retention dashboard. That is our interlinear+SRS idea as a product —
  minus stories, speaking, and world.
- **Russio** (2026): alphabet tracing → A1–C2 course, all six cases drilled in
  sentences **containing only already-learned words** ("never a sentence you
  cannot read"), SRS over letters/words/grammar-patterns, 50+ graded readers
  with tap-to-translate, offline per-level audio, "no streaks, no guilt".
- **LangLeap** (2026): full course, stress marks on every word, placement test,
  tap-to-translate reading, phone-call speaking scenes, AI writing feedback.
- **Mishka**: 100s of sequenced grammar lessons, 10+ exercise types incl. error
  correction and **minimal pairs**, conjugation/declension trainers.

So the claim "nobody combines grammar-labeled input + SRS" is now **false**.
What nobody has: our **speak-out-loud scenario runtime with recovery branches
tied to a capability-unlocked world**, plus per-dimension mastery. That is the
defensible edge — and it's thinner than the previous doc implied.

---

## 1. SRS / review — how they run it, where they're better

| Player | Mechanism | Better than LTS at |
|---|---|---|
| Duolingo | No separate review deck. Half-Life Regression student model predicts per-word forgetting from billions of reviews; weak words are **smuggled back into new lessons** as "Review Exercises" (~300k/day measured). Word-level difficulty priors learned from population (rare/irregular forms decay faster). +12% engagement when shipped. | Review without a review queue; difficulty priors; measuring recall continuously |
| NuanceDeck | FSRS (same family we spiked) + dashboard: due today, retention %, 12-week calendar, "last ten answers" on every drill | Memory transparency — learner *sees* their forgetting curve |
| Russio | SRS items are **grammar patterns**, not just words; drill sentences exclude any word not yet learned | Pattern-level scheduling; comprehension-safe drills |
| Anki/FSRS | open algorithm trained on hundreds of millions of reviews | We already spiked FSRS — parity here, not advantage |

**Gaps for LTS:** (a) reviews live only in the review deck, not woven into
stories/scenarios; (b) no difficulty priors — we could seed FSRS from frequency
data (OpenRussian ranks from 462M subtitle words, updated 2026-09); (c) case
frames and aspect pairs are not first-class SRS items; (d) no memory dashboard.

## 2. Interlinear reading — how they run it, where they're better

| Player | Mechanism | Better than LTS at |
|---|---|---|
| NuanceDeck | Grammar **always visible inline**: case bracket, aspect, stress on every word, no tap needed; one new word per sentence; tap word → its card; ask AI about that exact sentence; answers shared between learners | Zero-friction grammar; community Q&A per sentence |
| LingQ | Known-word status pipeline over a huge importable library; read+audio sync | Content volume; user-imported content |
| Readlang | Any web page → click-translate → flashcards | Infinite input |
| Lingopie / Language Reactor | Video with clickable dual subtitles | Video as input (we have none) |
| Beelinguapp / LangLeap | Parallel text + karaoke-synced audio; stress on every course word | Word-level audio highlighting |
| Russio | Graded readers where every sentence respects the learner's known-words list | Readability guarantee |

**Gaps for LTS:** our interlinear layer shows glosses but case/aspect labels
are not as *always-on* as NuanceDeck's; no word-synced karaoke highlighting
during story audio; no known-words readability gate on generated content; our
corpus is ~68 A1 sentences vs their thousands.

## 3. Scenarios / conversation — how they run it, where they're better

| Player | Mechanism | Verdict |
|---|---|---|
| Praktika | Free-form spoken conversation; corrects pronunciation+grammar+word choice **in real time**, explains in L1, claims to remember goals and mistakes; ~140 topics; **upload your own document and practice it as a conversation**; L1→TL gradual switch | Best-in-class loop; but uncanny avatars, misses subtle grammar (languatalk) |
| Mondly (Pearson) | Scripted scenario chatbot with suggested replies | Safe floor for nervous beginners; "illusion breaks if you say something unexpected"; no memory (practiceme) |
| Speak | Structured lessons + custom AI roleplays | Structure beats openness |
| TalkPal | Cheap unlimited free-form chat | "little sense of continuity between lessons" |
| Langua | Best AI tutor UX; **no cross-session error memory** — reviewer: "no memory of the mistake you have repeated for a month" | The industry's #1 open failure |
| LTS | Scripted scenarios + recovery branches + recorded-speech review | Our recovery branches beat Mondly's rigidity; but we are **scripted-only** — no free-form speech anywhere |

**Copy move:** Praktika's "practice YOUR document as a conversation" is exactly
how we could let the learner talk through our own stories interactively. And
**our n=1 error ledger makes us the only app that CAN have the memory all of
them lack** — G2 stays the top move, now with stronger evidence.

## 4. Speech training — how they run it, where they're better

- **ELSA** (Speechace engine): per-syllable scores, wrong phonemes flagged,
  mouth-position animations, minimal-pair drills, goal modes. This is the
  benchmark for granularity; our pronunciation feedback is guided and coarse.
- **Speechling**: human coach feedback on recordings (pro tier) — the quality
  bar learners compare against.
- **Pimsleur**: agile-recall pacing (timed prompts before you forget) — still
  the best audio-only drill design; portable, hands-free.
- **Rocket Russian**: rate-yourself 1–100 against target sentence.
- **LangLeap**: pronunciation drills training the ear on tricky sounds + AI
  writing feedback.

**Gaps for LTS:** no phoneme/mora-level feedback yet (our aligner ships but
word tokens ≠ mora timing, per FEATURE_PLAN), no articulation visualization, no
minimal-pair drill type (Mishka has one; ELSA built a company on it), no
hands-free audio-first mode (Pimsleur owns commutes), and our TTS clips have
owner-audible defects (breathing, gaps, elongations) while majors ship
studio-grade audio. The GATED calibration constraint doesn't block any of this
as *guided* feedback — ELSA-style granularity is a BUILD item.

## 5. Placement / level validation — how they run it, where they're better

- **EF SET**: free, 50-min adaptive, research-backed, CEFR-aligned certificate —
  free public benchmark for English.
- **Duolingo**: placement test + CEFR-aligned paths (7 flagship courses to B2),
  validated by in-house learning scientists with A/B tests and regression
  discontinuity designs; publishes papers.
- **Busuu**: A1–B2 alignment co-developed with McGraw-Hill (certificate).
- **Russio/LangLeap**: placement test with skip-ahead.

**Honest status:** our placement is personal-only and capped at 0.9 — correct
per our review gates, but we have **zero external anchoring**. Cheap upgrade:
tag every pack item with CEFR-WLI-ish descriptors + frequency ranks so the
personal score at least correlates with the scale everyone else uses.

## 6. World / progression / retention — how they run it, where they're better

- **Duolingo**: streaks + freezes, leagues, quests, friend streaks, hearts,
  push notifications, character meme IP — obsessive A/B-tested retention
  machinery. Also widely criticized (streak-chasing ≠ learning; league shame).
- **Russio** markets "**no streaks, no guilt**" — anti-Duolingo positioning is
  now a selling point in the Russian niche.
- LTS's capability-unlocked world is philosophically in the no-guilt camp
  (deliberate). But we lack the *micro-loop* rewards that make daily return
  effortless: daily quests, visible mastery meters, memory dashboards, streak
  *freezes* (guilt-free continuity devices, not guilt).

## 7. Content pipeline — how they build, where they're better

- **Duolingo**: LLM generates exercises from parameterized "Mad Lib" prompts
  (language, CEFR level, grammar focus, length caps) → **Birdbrain difficulty
  model auto-rejects mis-leveled content** → human learning designer final
  pick → "shared content" base course localized to dozens of L1s → **148
  courses in ~1 year** (vs 100 in 12 years pre-AI).
- **Russio/NuanceDeck discipline**: one new word per sentence; never show a
  sentence containing unknown words.

**Our pipeline (pack schema/validator, AI TTS) validates structure, not
pedagogical difficulty.** Two cheap, high-value gates to copy: (1) readability
gate — generated sentence passes only if ≤1 word outside the learner's known
lexicon (we already have the learner lexicon from sentence mining); (2) a
difficulty proxy gate using frequency ranks + grammar-band tags before a pack
installs. Birdbrain itself needs population data we can't have; the gate idea
works at n=1 against the owner's own lexicon.

---

## Where we genuinely lead (defensible, evidence-based)

1. **Scenario speech with recovery branches inside a capability-unlocked
   world** — Mondly is rigid, AI tutors are memoryless and grade-free, no
   Russian app has speaking at all. Nobody else has this combo.
2. **Cross-session error memory is possible for us and absent everywhere**
   (Praktika claims memory marketing; Langua's best reviewer says it doesn't
   exist in practice). Our local ledger + pymorphy can close the industry's #1
   complaint.
3. **Per-dimension multimodal mastery** (reading/listening/speaking tracked
   separately) — no competitor separates skill dimensions; all treat "level"
   as one number.
4. Offline, private, no subscription, no engagement-manipulation — a real
   positioning (Russio proves the market segment exists).

## Where we're demonstrably behind (fix list, ranked)

1. **No readability gate on generated content** — copy Russio/NuanceDeck's
   ≤1-unknown-word rule into the pack pipeline using the learner's own lexicon.
2. **Grammar labels not always-on in interlinear** — NuanceDeck's
   case-bracket/aspect/stress inline display is the niche standard now.
3. **No error→SRS loop** (G2; industry-wide open gap — first mover still ours).
4. **Reviews siloed in the review deck** — weave SRS picks into story/scenario
   flow (Duolingo's embedded Review Exercises).
5. **No pattern-level SRS items** — case frames and aspect pairs as cards
   (Russio/NuanceDeck/Mishka all do this).
6. **Pronunciation feedback granularity** — mora/phoneme feedback + minimal
   pairs + articulation hints (ELSA/Mishka playbook; all guided, gate-safe).
7. **No word-synced audio highlight** during story playback (Beelinguapp/
   LingQ karaoke standard).
8. **Audio artifact bar too low** — breathing/gaps/elongations made it into
   shipped clips; majors never ship that. Tighten post-process + audition gate.
9. **No memory transparency** — due/retention/calendar dashboard (NuanceDeck).
10. **No free-form speech option anywhere** — consider one opt-in free-talk
    scenario (AI-001 constrained, "never a grade") so scripted branches aren't
    the only speaking mode.
11. **Placement has no CEFR/frequency anchoring** — cheap tagging upgrade.

## Corrections to `competitive-gap-analysis-2026-11.md`

- "No competitor combines stories + SRS + grammar labels" → **superseded**:
  NuanceDeck (grammar-labeled sentences + FSRS + AI tutor) and Russio (graded
  readers + SRS + audio + placement) cover the reading half. Our surviving
  uniqueness: speaking scenarios, world/progression, per-dimension mastery,
  offline privacy-first.
