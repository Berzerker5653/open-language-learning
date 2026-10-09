# K-71 — How language-learning products compose "today's work" and handle onboarding

Research note, 2026-10-09. Owner-requested during the 2026-10-09 walkthrough.
Status: research findings + implementation hypotheses. Nothing in the Recommendations
section is decided; every numbered item is a proposal for owner review.
Contested findings are flagged inline; uncertain content is marked `[UNCERTAIN — human review]`.

## 1. Context

The owner asked: when a learner opens the app, how do mature products decide *what the
day's work is* — how much is review vs. new material, how is a time budget enforced —
and how do they *get a learner started* (onboarding, placement, teaching sequence)?
The decision this feeds: the design of the Home "Today" surface (composition of
`PlanItemView` entries under the ~5-minute `next_session` budget, ADR-0020) and the
hiragana→katakana phase gate the owner wants (policy: teach **all** hiragana, confirm
the learner knows it, then all katakana, sprinkling in only words whose letters have
been learned). The open design question is **what counts as "knows it"**: an SRS
criterion threshold, an explicit milestone test, or a pack-declared phase gate — and
how the daily plan should mix review of the previous alphabet while introducing the
next.

The product model being compared against (verified repo facts): desktop Tauri app,
offline-first, Japanese pack; the Home "Today" plan is derived from SRS
`next_session` with a ~5-minute budget via `build_plan_view` / `build_plan`
(`apps/desktop/src-tauri/src/lib.rs:1688,1956`, ADR-0020 derived guidance); guided
first-run ("Where to begin"); the spine is hiragana units then katakana units with
vocabulary words seeded from minute one (ADR-0018 environments-are-pack-data,
ADR-0021 script-introduction-as-pack-data); mastery is per-modality SRS
(reading/recognition/…); a goal map with prerequisites renders goals locked/open
(`band_sort_key` walk, `home_state`); `PlanItemView.kind` is `review | introduction`;
the unit capability enum in `schemas/v0.2/unit.schema.json` currently has the single
value `"script-introduction"`, declared on `ja.unit.kana-hiragana-vowels-ko`; kana
data lives in `languages/ja-JP/orthography/hiragana.jsonl` with a `teaching_order`
field. ADR-0002 bans streaks; ADR-0011 makes local speech models user-selectable and
off by default; ADR-0013 makes production (pronunciation) targets pack-declared.

## 2. Systems studied

For each system: how the daily work is composed (new vs. review mix, time budgeting),
the gating/unlock model, and the onboarding flow (including capability/feature
downloads). All sources accessed 2026-10-09; see §6 for full list.

### 2.1 WaniKani (kanji/kana SRS)

**Daily work.** The day is fundamentally *reviews first*. Items progress through 9 SRS
stages in 5 groups — Apprentice 1–4, Guru 1–2, Master, Enlightened, Burned — on
intervals 4h, 8h, 1d, 2d, 1w, 2w, 1mo, 4mo; levels 1–2 items use an accelerated
Apprentice ramp (2h, 4h, 8h, 1d) so beginners get content moving quickly [S1]. A
failed review demotes the item one stage (penalty), and Burned items leave the review
queue permanently after the final 4-month interval [S1]. New "lessons" are a separate
queue that the learner pulls from *after* reviews; the official guidance for "how do I
get more lessons" is literally "the quick answer: do your reviews" [S3].

**Gating.** This is the closest existing analog of the owner's phase gate, and it is a
pure SRS-stage criterion: reaching **Guru** ("you know this fairly well") *unlocks
associated items* — a kanji lesson requires its radical lessons, and a vocabulary item
(e.g. 人工) unlocks only when both its kanji (人, 工) are at Guru [S1][S3]. "Leveling
up" is a fixed count of that level's *kanji* at Guru (17 of 18 for Level 1); radicals
and vocabulary do not move the level bar [S2]. Note the two-tier effect: Guru *opens
the next material* while the SRS keeps reviewing the old material for two more years
until Burned. Passing a gate never freezes the old material's schedule.

**Onboarding.** Placement is minimal and self-declared: the learner picks a starting
level (or starts at Level 1); there is no placement test. The first levels' accelerated
ramp [S1] and radical-before-kanji dependency [S3] carry the sequencing. No
capability downloads exist (browser app).

### 2.2 Bunpro (grammar SRS)

**Daily work.** Reviews are the daily core; the queue timing is a user setting —
"Hourly" (reviews appear as due) vs. "Daily" (a single batched session) [S4]. The SRS
ladder runs from 4 hours up to roughly 6 months; reaching the final stage marks an
item **Mastered** and ends its review life [S5]. Two mechanisms are directly relevant
to a mixed-alphabet Today plan:

- **Split Reviews**: grammar and vocabulary reviews run as *separate sessions* with
  separate orderings — precedent for rendering "keep-alive review" and "new material"
  as distinct rows of one plan rather than one interleaved pile [S4].
- **Ghost Reviews**: when a learner misses a *component* of a sentence (e.g. a single
  kanji inside a vocabulary item), that component gets its own separate four-pass
  mini-SRS (4h, 12h, 24h, 48h) attached to the item [S4] — precedent for "missed
  symbol inside a word re-enrolls the *symbol itself* in the symbol SRS."

Study (new material) works by batch: the Study page presents a batch of grammar points
and ends with a quiz that inserts them into the review queue [S5]. Time budgeting is
soft: the learner controls batch sizes and queue timing; there is no enforced daily
minute cap. New-vs-review mix therefore emerges from SRS due-counts plus the size of
the study batch the learner pulls.

**Gating.** Content is organized by NDL/JLPT-aligned levels; a level becomes available
to study by the learner's own pacing, and a WaniKani sync option can mark
WaniKani-learned vocabulary as Mastered ("Master Content") or seed it mid-ladder at
Seasoned 1 ("Extra Practice") — i.e. external mastery evidence can *skip or
accelerate* the SRS [S5]. Hint ladder (Hints → Translation → Nuance → Nuance
Translation) governs how much support a review may consume [S4].

**Onboarding.** Account setup + level choice; no capability downloads (web app). Its
streak exists but is explicitly hideable ("Hide Streak") and Vacation Mode pauses the
queue [S5] — a softer gamification stance than Duolingo's, closer to this repo's
ADR-0002 posture.

### 2.3 Duolingo (course method + Japanese course + Literacy)

**Daily work (method).** The Duolingo Research whitepaper describes the plan as
machine-composed: Birdbrain, a per-learner model of item difficulty, assembles and
sorts exercises into dynamic lessons from a candidate pool; spaced repetition
resurfaces items; lessons target the learner's zone of proximal development and
"desirable difficulty"; lessons are bite-sized (a few minutes); CEFR-aligned units
carry real-world communicative goals [S6]. The Birdbrain announcement adds detail: it
complements a per-word knowledge model; a Session Generator builds each lesson from a
candidate pool, skipping topics the learner has mastered and targeting weak ones, with
A/B-verified learning gains [S7]. Streaks/XP/leagues drive daily volume — noted here
as **anti-patterns for this repo** (ADR-0002 bans streaks; ADR-0020 derives guidance
from the SRS rather than authored nudges).

**Daily work (Japanese course, current design).** Duolingo's own curriculum designer
explains the current Japanese course deliberately does *not* front-load kana:
hiragana, katakana and romaji all appear in every exercise from the start, and
learners "jump straight into words and phrases without knowing all hiragana and
katakana." Kana are taught in a *separate practice-hub tab*; characters the learner
has absorbed are decorated ("gilded"), kanji material begins after some kana are
absorbed, and romaji display is a user toggle [S8]. This is the strongest available
*word-first* counterpoint to the owner's kana-first policy, from a shipping product.

**Literacy counterpoint.** Duolingo's separate Japanese Literacy app teaches reading
with *synthetic phonics and decodable sentences as early as possible* [S6] — the
direct analog of the owner's "words using only letters learned so far." So Duolingo
ships both philosophies in two products.

**Time budgeting.** A user-set daily goal in minutes; Birdbrain sizes sessions to
fit [S6]. **Gating.** Unit-by-unit course path; units unlock by path position and
completion, not by an SRS-stage criterion [S6]. **Onboarding.** Placement test
(anywhere in the course) or self-declared start; the course is pre-loaded (server-side;
no user-visible capability downloads on mobile beyond asset streaming) — not a good
model for this repo's offline-first pack install.

### 2.4 Busuu

**Daily work.** The Premium Study Plan turns a goal (target CEFR level) into a
schedule: days per week × minutes per day, reminders/calendar sync, and an
auto-computed estimated completion date; the dashboard tracks minutes, fluency %, and
ETA. A "Next Up" recommender proposes what to study next from progress and recent
errors, and review tools auto-calculate *when* to review and *which words are
struggling* [S9]. This is the closest commercial analog of this repo's derived
`next_session` plan (ADR-0020): the schedule is computed, the learner follows it.

**Gating.** Lessons are sequenced by CEFR level; placement affects review content, not
lesson order (see below).

**Onboarding — placement test.** A ~5-minute test covering vocabulary, grammar,
listening and reading produces a suggested level; the learner chooses the start point;
placement marks prior-level vocabulary and grammar as "mastered" so they never appear
in the Review section — but it does *not* skip lessons; Japanese is supported, and the
test can be retaken anytime [S10]. The "marks prior content mastered without skipping
lessons" split is a useful precedent: placement seeds the SRS/known-state without
rearranging the spine.

### 2.5 KaniWani (reverse production companion)

**Evidence limit, stated up front:** kaniwani.com serves an empty JavaScript shell to
non-browser agents and its API documentation host no longer resolves; the account of
its behavior below rests on the official GitHub organization and backend README only
[accessed 2026-10-09]. KaniWani is "an English-to-Japanese vocabulary memorization
site": it syncs the learner's *top-level WaniKani vocabulary* via the WaniKani v2 API
and quizzes in the reverse direction (English prompt → produce Japanese), reusing the
WaniKani SRS state [S11]. Product-level mechanics beyond that (exact burn intervals,
per-item behavior) could not be verified from primary sources —
`[UNCERTAIN — human review]`. Its relevance to this repo: the same item can be trained
in *multiple modalities on top of one SRS core* (recognize vs. produce), which matches
this repo's per-modality mastery (ADR-0013 production targets are pack-declared) and
suggests a phase-gate criterion should quantify per-modality state, not just "item
seen."

### 2.6 Migaku (starter guide; immersion-oriented SRS)

**Daily work.** Recommends an SRS pace of ~10 new cards/day, and — directly relevant
to budgeting — "drop new cards to zero but keep reviews going daily" during busy
periods: review is the invariant, introduction is the elastic budget line [S12].
Time budgeting is by daily card count, not minutes.

**Sequencing.** For kana: "Start With Kana, Not Romaji… Before anything else" —
3–7 days hiragana, then 3–7 more days katakana, with a *readiness test* (read a full
kana sentence such as わたしは がくせいです at natural speed) as the pass criterion;
warns that learners who neglect katakana hit a "permanent slow patch" [S12]. Note the
internal tension in this single guide: a sequential week-by-week timeline (week 1
hiragana, week 2 katakana + first vocabulary deck) coexists with the advice to "give
both systems equal weight from day one" — worth citing precisely because it shows
practitioner disagreement inside one source [S12].

**Onboarding.** None product-wise (it is a guide + tools ecosystem); the readiness
test is the load-bearing onboarding *criterion* — a timed whole-chart read, not an SRS
stage.

## 3. Kana-sequencing evidence (hiragana-first vs. parallel) — genuinely contested

**What is solid.** Japanese-speaking children are schooled hiragana-first, then
katakana: "In elementary school, Japanese-speaking children first learn hiragana and
then katakana" — stated in the introduction of a peer-reviewed open-access study
(Higuchi & Kobayashi 2023, citing Wydell & Butterworth 1999) [S13]. That same study
measured perceptual distances for 4,278 kana pairs by discrimination reaction time and
found (a) same-sound cross-script pairs (え–エ) are discriminated *more slowly* than
different-sound pairs, and (b) it speculates that hiragana knowledge transfers into
katakana acquisition — visually similar pairs (か–カ) plausibly easier to acquire than
dissimilar ones (あ–ア) [S13]. Related psycholinguistic work exists ("Evidence for
cross-script abstract identities in learners of Japanese kana," Memory & Cognition
2018; "Cognitive predictors of literacy acquisition in syllabic Hiragana and
morphographic Kanji," Reading & Writing 2017 — pointers from [S13]'s reference/related
set; not independently reviewed for this note).

**What is contested.** Whether *L2 adults* should be taught hiragana-first (the owner's
policy) or both scripts in parallel / word-first is **not settled by any peer-reviewed
study found in this research**; no controlled instructional-order comparison was
located. `[UNCERTAIN — human review]` Practitioner sources split: Polyglottist and
LingoDeer report hiragana is "almost always" learned first [S14][S15]; 80/20 Japanese
argues for delaying script entirely in favor of spoken language [S16]; Shinobi
Japanese recommends learning both scripts together with mnemonics [S17]; Migaku's
guide contains both positions in one document [S12]; and Duolingo's Japanese course
is a *shipping, deliberately word-first/simultaneous-kana* design with kana absorbed
"by osmosis" in a separate gilded tab [S8]. The transfer-direction facts from [S13]
(hiragana→katakana similarity effects) are *consistent with* a hiragana-first spine
but do not *demonstrate* that hiragana-first instruction outperforms parallel
introduction for adults. Treat the owner's kana-first policy as a reasonable design
choice with L1-schooling and partial-psycholinguistic support, not as an established
L2 outcome, and note the risk [S12] flags: katakana under-practice creates a permanent
slow patch — which argues the phase gate must keep katakana review substantial once
opened, not just at introduction.

Implementation hypotheses (explicitly not claims): visual-similarity data from [S13]
could bias *katakana teaching order within the katakana phase* (similar-to-known-
hiragana pairs first) and could bias *confusable-pair scheduling* (シ/ツ, ソ/ン get
extra discrimination reps). Both are unvalidated here; mark for experiment, not
release.

## 4. Recommendations

All items are proposals; none are decided. Repo mechanics cited for concreteness.

### Home "Today" composition

1. **Review-first fill, introduction headroom.** Keep the ~5-minute budget. Fill the
   plan from `next_session` due reviews first (both alphabets); spend the remaining
   budget on at most one `introduction` item from the open goal-map front
   (`band_sort_key` walk). Precedent: WaniKani's reviews-before-lessons discipline
   [S1][S3]; Migaku's "reviews invariant, new cards elastic" [S12]. Cap
   introductions/day (a small pack-tunable number, e.g. 1–3 units' worth) so the
   plan cannot silently become an unbounded new-material firehose — Duolingo enforces
   the analogous bound via minute-size sessions [S6].
2. **Split the plan into two visible rows: "Keep-alive" (due reviews, any script) and
   "New" (introductions).** This is Bunpro Split Reviews applied to the Home surface
   [S4], and it makes the cross-alphabet mixing the owner asked about *visible*:
   hiragana review stays present in the row every day during the katakana phase,
   mirroring WaniKani where Guru-gated items keep reviewing until Burned [S1].
3. **Ghost-review analog at the symbol level.** When a learner errs on a *symbol
   inside a vocabulary item*, enqueue the symbol itself in its orthography SRS on a
   short catch-up ladder. Precedent: Bunpro Ghost Reviews [S4]; WaniKani
   dependency structure [S3]. Data hook already exists: `languages/ja-JP/orthography/
   hiragana.jsonl` symbols are items; a katakana sibling file is the natural target.
4. **Offer a Daily-batch vs. As-due queue setting** (Bunpro precedent [S4]); offline
   desktop defaults to Daily batch ("Today" is one coherent plan), which is also what
   the derived-plan architecture (ADR-0020) implies.
5. **Do not import streaks/XP/leagues.** Duolingo's engagement levers [S6] conflict
   with ADR-0002; Bunpro's hideable streak [S5] is the ceiling of what this repo
   should tolerate (it should simply not exist).

### Hiragana→katakana phase gate and the "knows it" criterion

Three gate options, with their precedent carriers:

- **(A) SRS-criterion stage threshold** — WaniKani Guru precedent [S1][S3]: the gate
  is a predicate over per-modality SRS stage, e.g. "*N*% of hiragana symbols reach
  stage *G* (Guru-equivalent) in at least the reading and recognition modalities."
  Pros: zero extra tests, continuous measurement, matches per-modality mastery.
  Cons: an SRS stage is a *schedule*, not proof of fluent retrieval; a slow learner
  can technically pass by surviving intervals.
- **(B) Explicit milestone** — Migaku readiness-test precedent [S12]: a pack-declared
  assessment unit (e.g. read a kana-only passage at natural speed) that passes the
  phase. Pros: direct evidence of the actual skill (chart-read fluency), easy to
  communicate. Cons: one-shot tests mis-measure; needs item authoring.
- **(C) Pack-declared phase gate as data** — extend the goal map / `capabilities` so
  katakana units declare a prerequisite goal (`kana-hiragana-complete`), rendered
  locked/open exactly like existing prerequisites; the validator already errors on
  `unit_capability_items_missing`, so a gate is schema-consistent with ADR-0021.

6. **Adopt the hybrid: (C) declares the gate, (A) satisfies it automatically, (B)
   offers an override.** Concretely: katakana spine goals gain a prerequisite goal
   whose completion predicate is `≥ N% of symbols at stage ≥ G across required
   modalities`; a milestone unit (`script-introduction`-adjacent assessment) can
   complete the same goal early for learners who already know hiragana. This is also
   the Busuu-placement pattern — external evidence marks known content mastered
   without rearranging the spine [S10]. Suggested starting parameters for owner
   review (hypotheses): N = 90%, G = Guru-equivalent, required modalities = reading +
   recognition (production modalities track the phase but do not gate it).
7. **Gate opens the next phase; it never freezes the old one.** Once katakana opens,
   hiragana items stay in normal SRS rotation (recommend surfacing their due-count in
   the Keep-alive row per Rec. 2). WaniKani shows both tiers coexisting: Guru unlocks
   downstream content while upstream items review for years [S1]. Migaku's "permanent
   slow patch" warning [S12] is the failure mode this prevents.
8. **Decodable-word sprinkling as a coverage rule, not an author habit.** Extend the
   vocabulary-seeding validator (scripts/vocab-coverage style) with a script-coverage
   rule: a seeded word is eligible only when every kana symbol it contains is in
   *introduced* state (or *known* state for review-phase words) per the orthography
   SRS. Precedents: Duolingo Literacy's decodable-sentences-ASAP design [S6];
   Migaku's week-2 "first vocabulary deck" [S12]. The owner's policy ("words using
   ONLY letters learned so far") becomes an enforceable, pack-declared invariant —
   consistent with ADR-0018/ADR-0021 (pedagogy as pack data, not app code).
9. **Optional, flagged as unvalidated:** order katakana introduction by visual
   similarity to known hiragana, and add discrimination reps for confusable pairs —
   using the perceptual-distance data in [S13] as the ordering signal. Hypothesis only;
   A/B-gate before adoption `[UNCERTAIN — human review]`.

### Onboarding flow (including capability downloads)

10. **Sequence: pack install → capability downloads → optional placement → guided
    "Where to begin" → first `script-introduction` unit → decodable words.** Rationale
    per step: (a) the app ships no pedagogy; the pack declares everything
    (ADR-0018/0021). (b) Before the first lesson, enumerate and offer the
    capabilities its units need: user-selectable local speech models (ADR-0011,
    off-by-default) and any production targets (ADR-0013); the first hiragana-vowel
    unit must be completable with zero downloads (text/typing modality), so
    speech-model downloads are an *opt-in step*, not a blocker — the offline-first
    analog of nothing in the studied web products, so this is a repo-specific call.
    (c) **Optional 2–5 minute self-placement** (Busuu analog [S10]): read a few kana
    cards; matched symbols are seeded directly into the orthography SRS at a mature
    stage and marked introduced, so known kana are never re-introduced and never
    pollute the Today plan — and the spine is *not* reordered (Busuu explicitly
    doesn't skip lessons [S10]). (d) Existing "Where to begin" then derives the plan
    (ADR-0020). (e) First unit stays `ja.unit.kana-hiragana-vowels-ko`
    (`teaching_order` data drives the rest). (f) From lesson one, the plan may include
    decodable kana-only words (Rec. 8).
11. **Romaji policy needs an explicit decision surfaced at onboarding.** Duolingo made
    romaji display a user toggle while teaching it implicitly [S8]; Migaku says
    "start with kana, not romaji… before anything else" [S12]. Recommendation: default
    romaji off after the first session, with the toggle available (owner decision —
    see §5).

## 5. Open questions for the owner

1. Gate parameters: what *N*% and which SRS stage (Guru-equivalent?) satisfy
   "knows hiragana," and do production modalities gate the phase or only follow it?
2. Milestone override: allow the timed chart-read test to *complete* the gate (Rec. 6),
   and if so which modalities does it score?
3. Daily budget split: acceptable review:introduction ratio and the per-day
   introduction cap (Rec. 1)? Is the 5-minute budget per row (Keep-alive/New) or for
   the total?
4. Placement: is seeding mature SRS stages from a 2–5 minute placement acceptable
   (Busuu-style, Rec. 10c), or does this repo's evidence bar require the milestone
   test for any mastery claim?
5. Romaji: display toggle per Duolingo [S8] or prohibited early per Migaku [S12]?
6. Kana-order experimentation: fund the [S13]-derived similarity-ordering experiment
   (Rec. 9) now or defer?
7. KaniWani mechanics could not be verified from primary sources (JS shell + dead API
   docs); if reverse-production scheduling matters to the roadmap, it needs a human
   walkthrough of the live product `[UNCERTAIN — human review]`.
8. No peer-reviewed study directly comparing instructional order (hiragana-first vs.
   parallel) outcomes for adult L2 learners was found; the owner's kana-first policy
   is supported by L1 schooling practice and partial transfer evidence [S13], not by
   direct instructional comparison. Accept as design stance, or commission/gather
   more evidence? `[UNCERTAIN — human review]`

## 6. Sources

All URLs accessed 2026-10-09. Citation-only use of copyrighted pages; no content
reproduced beyond short attributed quotations.

- **[S1]** WaniKani Knowledge Base — "SRS stages." https://knowledge.wanikani.com/wanikani/srs-stages/ (published 2018-11-25; © WaniKani; official product documentation)
- **[S2]** WaniKani Knowledge Base — "How do I level up?" https://knowledge.wanikani.com/wanikani/getting-started/level-up/ (© WaniKani; official product documentation)
- **[S3]** WaniKani Knowledge Base — "How do I get more lessons?" https://knowledge.wanikani.com/getting-started/unlock-new-lessons (© WaniKani; official product documentation)
- **[S4]** Bunpro Support — "Review Settings." https://bunpro.jp/support/account/Review-Settings (last updated 2025-03-11; © Bunpro; official product documentation; read via text-proxy because the page is script-rendered)
- **[S5]** Bunpro Support — "General Overview." https://bunpro.jp/support/account/General-Overview (last updated 2025-03-11; © Bunpro; official product documentation; read via text-proxy)
- **[S6]** Freeman, Kittredge, Wilson, Pajak — "The Duolingo Method" (Duolingo Research Report, 2023-01-11). https://duolingo-papers.s3.amazonaws.com/reports/Duolingo_whitepaper_duolingo_method_2023.pdf (© 2023 Duolingo Inc.; publisher-hosted PDF; cite only)
- **[S7]** Bicknell & Brust — "Introducing Birdbrain" (Duolingo blog, 2020-10-07). https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain/ (© Duolingo; official engineering post)
- **[S8]** Anthony Chan (Duolingo curriculum designer) — "Dear Duolingo: How am I learning the Japanese writing systems?" (Duolingo blog, 2026-07-21). https://blog.duolingo.com/japanese-writing-systems (© Duolingo; official curriculum statement)
- **[S9]** Emily Duncan — "Personalized study plan" (Busuu blog, 2026-08-25). https://www.busuu.com/en/english/personalized-study-plan-busuu-premium (© Busuu; official product description)
- **[S10]** Busuu Help Center — "What is a Placement Test?" https://help.busuu.com/hc/en-us/articles/16526383831569-What-is-a-Placement-Test (© Busuu; official product documentation)
- **[S11]** KaniWani GitHub organization — org description "An English-to-Japanese vocabulary memorization site" https://github.com/KaniWani and kw-backend README (WaniKani v2 API vocabulary sync) https://raw.githubusercontent.com/KaniWani/kw-backend/master/README.md (kw-frontend is MIT-licensed; site itself returned an empty JS shell and api.kaniwani.net did not resolve on 2026-10-09 — evidence limit stated in §2.5)
- **[S12]** Migaku — "How to Learn Japanese for Beginners: A 2026 Starter Guide" (updated 2026-05-01). https://migaku.com/blog/japanese/how-to-learn-japanese-for-beginners-a-2026-starter-guide (© Migaku; practitioner guide, not product documentation)
- **[S13]** Higuchi, H., & Kobayashi, T. (2023). "Letter visual similarity of Japanese hiragana and katakana based on reaction times." *Current Psychology* 42(15), 12835–12844. Open access (CC), Springer. https://link.springer.com/article/10.1007/s12144-021-02664-w (full text read; secondary references cited within: Wydell & Butterworth 1999, *Cognition* 70(3):273–305 — source for the hiragana-first-in-schools claim; plus Memory & Cognition 2018 and Reading & Writing 2017 pointers noted in §3, not independently read)
- **[S14]** Polyglottist Language Academy — "Hiragana, Katakana, and Kanji: Japanese Writing Guide for Beginners" (2026-06-17). https://www.polyglottistlanguageacademy.com/language-culture-travelling-blog/2026/6/17/hiragana-katakana-and-kanji-what-japanese-learners-need-to-know-first (practitioner blog; snippet-level evidence only)
- **[S15]** LingoDeer blog — "Differences Between Hiragana and Katakana and Which to Learn First?" https://blog.lingodeer.com/differences-between-hiragana-and-katakana (practitioner blog; snippet-level evidence only)
- **[S16]** 80/20 Japanese — "Should you learn Hiragana, Katakana and Kanji? And if so, when?" https://8020japanese.com/when-to-learn-japanese-characters (practitioner blog; snippet-level evidence only)
- **[S17]** Shinobi Japanese — "Hiragana and Katakana: The Complete Beginner's Guide" (2026-05-28). https://www.shinobi-japanese.com/blog/hiragana-and-katakana (practitioner blog; snippet-level evidence only)
