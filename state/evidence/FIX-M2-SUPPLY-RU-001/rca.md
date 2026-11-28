# RCA — FIX-M2-SUPPLY-RU-001: RU days 31-60 new-content starvation

Measured from the committed M2 raw payloads
(`state/evidence/LEARNER-REVIEW-M2-001/sim/raw/ru-day*.json`) and the tree
at `40a5016d`. Card asked: supply gap in curriculum generation vs
progression-gate bug. **Answer: a pack goal-graph defect — the RU ladder
edges demand evidence on dimensions and content kinds the engine can never
grade, so the band unlock is structurally unsatisfiable and supply past
the on-ramp band is pinned to zero.** It is not a generation-volume gap:
the pack ships 798 units / ~3,700 lexicon entries the sim never reaches.

## 1. The measured freeze (from the raw logs, re-derived)

- day 31 → day 60: unit_path payload 823 units, **803 locked on both days**
  (only the 20 on-ramp-band units are unlocked; 17 done, 3 stuck at 5/6).
- `new_items` per day (chained-first-seen, `sim/exp-metrics.json`):
  `[3,2,0,0,...]` = 5 new texts in 30 days; every offer 100% review.
- The 3 stuck units (`greetings-01`, `self-introduction-01`,
  `everyday-01`) each schedule 6 refs; the unmet 6th ref is exactly their
  **grammar** ref (`ru.grammar.on-ramp.formulaic-politeness`,
  `zero-present-copula`, `eto-identification`). All 17 DONE units have
  **zero grammar refs** — a perfect split on one axis, verified per unit.

## 2. Why the 6th ref never lands, and why nothing unlocks (mechanism)

All engine facts below read at `40a5016d`, `apps/desktop/src-tauri/src/lib.rs`:

1. **Engine-gradeable dimensions are exactly six**: recall-meaning,
   orthography-recognition, phonological-discrimination, production-writing,
   orthographic-encoding, comprehension-listening. These are the only
   dimensions the practice runners build/grade (ADR-0036 runner table;
   `progression_items` 2691-2719; seeding streams 3110-3261).
   **`grammar-controlled` and `comprehension-reading` are declared
   dimensions with no runner** — a content id referenced only by unrunnable
   activities (grammar concept rows, `Explanation` kind) can never receive a
   derived evidence row. `progression_items` deliberately skips grammar ids
   ("taught by the unit's authored encounter stage, not minted as a plan item").
2. **Mastery needs evidence**: `derive_mastery_in_pack` filters events to
   rows that `target` the content id on the evaluated dimension
   (`crates/learner-model/src/derive.rs`); encounter records live in a
   separate table and mint no evidence (by design — "exposure, never
   mastery"). ⇒ a grammar ref stays `Unseen` forever.
3. **Unit done-gate**: `done = refs_done == refs_total` over *all* scheduled
   refs, `refs_done` counts evidence-Introduced refs (`unit_path_at`
   4140-4153). ⇒ any RU unit with a grammar ref (797 of 818) can never read
   done. Cosmetic for supply (band unlock does not ride unit-done) but it is
   the visible 5/6 symptom. **Kept as a follow-up card, not engine-fixed here.**
4. **Band unlock**: units unlock via `unit_goal_locked` → hard prerequisite
   edges → `prereq_satisfied` → `goal_derived_state(goal, dim, derived)` =
   **minimum over the goal's `required_concepts`** of their derived state on
   the edge's dimension (ADR-0031, accepted). A missing row is `Unseen`.
5. **The RU pack violates (1)+(4) on both axes** (`languages/ru-RU/curriculum/goals.yaml`):
   - all 60 goals' `required_concepts` are **grammar-only** — 174 concepts,
     every one on the ungradeable `grammar` kind (measured; the `ru.goal.on-ramp.cyrillic`
     goal is the sole exception, 34 orth refs);
   - 106 of 172 prerequisite edges use `dimension: comprehension-reading`,
     another dimension with no runner (64 edges use `recall-meaning`, 6 use
     `orthography-recognition` — those dimensions are gradeable, but every
     on-ramp/a1 target goal's `required_concepts` are grammar-only, so the
     minimum is `Unseen` on *every* edge anyway).
   ⇒ every hard goal→goal edge is permanently unsatisfied ⇒ every non-on-ramp
   unit is goal-locked ⇒ both new-content routes (`progression_items` over
   unlocked units, and the raw seeding streams behind
   `goal_locked_new_content`/ORPHAN-CONTENT-001) exclude all 798 deep units.
   Month-1 supply (FIX-M1-CONTENT-RU-001) was real but bounded: it densified
   content *inside* the only unlocked band — exactly the "one month of
   pool" shape M2 measured (1,152 new texts days 1-30, 5 days 31-60).

## 3. Why JA looked healthy (and is not fully healthy either)

JA goals put **149 lexicon refs (gradeable on recall-meaning) into
`required_concepts`** and only 6 grammar refs, so its early ladder is
satisfiable and month-2 supply ran (117 new texts). But the same audit
flags 56 of 77 JA goals carrying a hard `grammar-controlled` edge
(independent) — **JA is expected to hit the identical wall deeper in the
ladder (month 3/4)**. That class is fixed on this card too (measured
before/after), and M3 re-checks it at days 61-90.

## 4. Fix (pack data — the product is the packs; the engine behaves exactly per ADR-0031/0036)

`languages/ru-RU/curriculum/goals.yaml` (and the 56 JA edges):

1. Every RU goal except `ru.goal.on-ramp.cyrillic` gets
   `required_concepts` = 4 shared high-frequency **lexicon** refs — chosen
   from the 25 words the on-ramp band and the deep bands teach together
   (`ru.lex.everyday.eto/dom/mama`, `ru.lex.personal.ya/vy/ty/on/ona`,
   numbers …) so they are drilled while the goal is still locked
   (exclusive-lock rule keeps shared words eligible) and can reach
   `independent`. Grammar concepts leave `required_concepts` (they stay in
   units' `generation_contract.allowed_grammar` and unit `content_refs`, so
   the encounter stages still teach them — nothing about how grammar is
   taught changes, only what the ladder is asked to *grade*).
2. Every `comprehension-reading` prereq edge (106) switches to
   `recall-meaning` (gradeable, and the concepts chosen in (1) are
   recall-meaning-drillable). `orthography-recognition` edges onto the
   cyrillic goal stay untouched.
3. JA: the 60 `grammar-controlled` + 2 `comprehension-reading` edges switch
   to `recall-meaning` (targets already hold lexicon `required_concepts`);
   the 4 already-gradeable `supported` edges stay.
4. Pack versions ride (next 0.5.x per card).
5. Recurrence guard: a pack-level gate that fails any hard goal→goal edge
   whose dimension has no engine runner or whose target goal has zero
   gradeable `required_concepts` (see gates.log for where it landed).

## 5. Classified separately (not fixed here)

- **5/6 unit-done semantics** (point 3 of §2): ungradeable refs pin the unit
  ring/done gate forever (797 RU units). Needs an engine decision
  (exclude no-runner refs from the done denominator, or record exposure
  evidence) touching ADR surfaces PATH-VISUAL-001/PATH-VIEW-001 pins →
  proposed follow-up card, kept out of this pack-only fix so rollback is one
  pack bump. Supply acceptance does not depend on it (verified: after the
  fix, new items flow without any unit additionally reading done).
- **Front-loaded pacing**: deep-band concepts shared across all goals means
  the band opens as a burst once the shared words reach independent;
  M2's JA finding 3 already covers pacing shape. Acceptance here is the
  card's: ≥25/30 days with ≥1 new item, no 5+ day starvation run.
