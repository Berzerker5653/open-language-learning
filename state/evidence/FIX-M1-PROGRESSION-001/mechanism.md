# FIX-M1-PROGRESSION-001 — measured mechanism vs frozen RCA

The RCA (`LEARNER-REVIEW-M1-001/rca-progression-starvation.md`) is correct
about the OBSERVATION (6 RU / 15 JA unique items, then reviews-only forever,
`current_offer` null every day) but its code-level mechanism claim "the NEW
pool is provably empty from day 2" did not survive measurement.

## Measurement (this card, HEAD 40647adb, scratch probe in the tests harness)

A zero-evidence profile on the installed RU reference pack yields a NEW pool
of **43** candidates (34 cyrillic orth items + 8 contrasts + claimed
sentences; `ru.orth.cyrillic.t` included). After a 4-day walk of the REAL
`build_plan` path grading every served item as clean successes, the pool
still holds 22 NEW items and the plan keeps introducing material.

The starvation reproduces only under the sim's actual learner behaviour
(wrong/low-support answers → a permanent weak-skill backlog), which pins the
cause to the planner, not the pool:

1. **Reserved shares were never spendable.** In
   `crates/scheduler/src/planner.rs` each phase-1 fill loop compared the
   objective's budget cap against TOTAL elapsed seconds
   (`plan.total_seconds + est <= caps[k].min(budget - total)`). Once reviews
   (first stream) had filled 50% of the plan, the weak loop's check
   `total + 40 <= 180` and the progression check `total + 60 <= 120` were
   already false — those objectives could not spend a single second of their
   own reserved floors.
2. **The fill phase starved what the floor never filled.** Leftover budget
   was spent sequentially: all remaining reviews, then all remaining weak,
   then progression last. With a beginner's ~15-25 weak candidates at 40 s
   inside a 600 s budget, weak ate the entire leftover and progression got
   exactly 0 items — every day, forever. This is the day-2+ plan composition
   the sim logged (100% weak-skill).
3. **Shared modality cap.** `max_per_modality: 3` counted across objectives:
   3 weak reviews of seen letters in `orthography-recognition` closed that
   dimension to NEW letters entirely, even when time remained.
4. The untouched-goals funnel in `progression_items()` (the RCA's mechanism 1)
   is real but secondary at the pool level: raw seeding streams did cover
   letters/words/contrasts/sentences. It still starved every non-first
   `required_concepts` entry and emitted dead `comprehension-reading` letter
   items no runner can build (day-1 phantom 7th plan item).

## Fix shipped by this card

- `progression_items()` rewritten: NEW selection is per-activity
  `content_ref` inside UNLOCKED units (K-70 phase gates + goal band edges
  evaluated per unit via the same predicates `practice_met_content` uses),
  dimension resolved from the pack's own tables to the exact dimension
  `practice_build` can run; refs with evidence on the dimension are not NEW
  (reviews untouched); ids with no runner (grammar) are not minted as plan
  items. Missing-letter case (`т`) fixed at the pool level
  (`missing_letter_of_an_unlocked_unit_stays_new_eligible`, red-first).
- Planner phase 1 now fills each objective against its OWN spent seconds;
  phase 2 spends leftovers strictly round-robin one item per objective per
  cycle; `max_per_modality` is per objective. Pinned red-first by
  `new_material_keeps_its_share_behind_a_weak_skill_backlog` (planner
  test), re-pin of `modality_repetition_limit_is_enforced` documents the
  per-objective contract. `PLANNER_VERSION` bumped to `session-planner-0.2.0`.
