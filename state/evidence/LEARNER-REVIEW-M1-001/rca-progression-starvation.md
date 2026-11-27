# RCA — D-001: Month-1 content starvation after day 1 (RU + JA)

## Measured behavior (journey-sim, real engine at HEAD 355d847c)

`scripts/sim_month1.py` walks a from-zero learner through the REAL
learner surface (`lts-serve`, libfaketime, days advanced 24h). The sim
touches exactly the endpoints the UI's `inv()` surface exposes for daily
use (home_state, unit_path, practice_plan, practice_task/submit,
lesson_plan/encounter_complete, current_offer, story/scenario flows) —
there is no start-a-unit command anywhere in the frontend command set
(swept: `inv("<cmd>"` across apps/desktop/src), so the sim cannot be
missing a UI action that would feed new content.

| pack | unique practice items served days 1-30 | plan composition day 2+ | current_offer | unlocked-but-untouched units |
|------|----------------------------------------|--------------------------|---------------|------------------------------|
| RU   | **6** (а/о/м drills + 3 voicing contrasts) | 100% `weak-skill` reviews of those 6 | `null` every day | 10 cyrillic units, all refs_done frozen |
| JA   | **15** | 100% `weak-skill` reviews of those 15 | `null` every day | 42 unlocked units (greeting, kana-hiragana-*, kanji-time-verbs 3/29, sound-contrasts 3/4) |

Progression evidence: RU `cyrillic-a-o-m-t` is `current` with
`refs_done: 3/4` — the 4th letter **т is never served on any day**;
`cyrillic-b-p-d-g` sits at 3/7. Because gate units never finish,
`greetings-01` and every later unit stay `locked: true` with
`refs_done: 0`. Day 30 the RU learner has studied exactly 6 content
items and confidence 0.29 on all of them.

## Mechanism (code pointers, apps/desktop/src-tauri/src/lib.rs)

1. `progression_items()` (~line 2608): new-material candidates are
   goals with **no evidence yet on any required concept** ("untouched"
   goals), and contribute **only** `required_concepts.first()` with
   `modalities.first()`. Once a goal has any evidence (day 1 grading),
   it never contributes again — the remaining letters of the cyrillic
   goal (т, б…, all later cyrillic units' refs) never enter the plan.
2. `add_new_item_candidates()` (~line 2910): the lexicon-word NEW pool
   is filtered by `locked_new_content()` (requires_unit gates) and
   `goal_locked_new_content()` (goal band edges). Every RU lexicon word
   belongs to a greetings/self-intro/… unit gated behind the never-
   finishing cyrillic units → the lexicon pool is empty for a month.
3. The only other NEW route is `current_offer`, which returns null
   under this state, and manual word mining (`mine_add`), which is not
   a source of engine-scheduled content.

Net: after day 1 the NEW pool is provably empty (untouched-goals-only
+ gate-locked lexicon), so the planner can only re-serve the day-1 set
as weak-skill reviews — forever. A real learner following the app's
intended path hits the identical wall; the sim merely made it enumerable.

## Why this is a blocker for Month 1 (owner contract)

Docs promise ~30 path nodes + pools + early stories/quizzes in the
first month. Measured: 6/15 items, zero story/scenario content ever
reachable (story_list empty past day 1), zero quiz variety. "Content
110% correct and accurate" is moot when the content never appears.

## Fix direction for FIX-M1-PROGRESSION-001 (not binding; decision lives there)

NEW selection must be per-UNIT-ACTIVITY (refs not yet introduced inside
unlocked units), not per-unTOUCHED-GOAL-first-concept; and the current
unit's own unscheduled refs must always be NEW-eligible (т case).
Acceptance gate: `scripts/sim_month1.py` day-30 walk enumerates ≥ N
unique items and ≥ 3 non-first-band units with refs_done > 0 (pick N
against curriculum; suggested ≥ 60 RU / ≥ 40 JA).

## Reproduction

```
python3 scripts/sim_month1.py --pack ru --days 30   # ~2 min under faketime
python3 scripts/sim_month1.py --pack ja --days 30
# compare raw/{ru,ja}-day001.json vs day030.json: practice_plan items,
# unit_path refs_done/current/locked, current_offer
```
