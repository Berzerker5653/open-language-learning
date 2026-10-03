# LEARN-004 Acceptance Notes — Session planner

Date: 2026-10-02

## Acceptance 1: 5/10/20/30+ minute budgets

`crates/scheduler/src/planner.rs`: `BUDGET_PRESETS = [5, 10, 20, 30]`;
`plan_session` accepts any positive `budget_minutes` (30+ tiers like 45
work). Test `budget_presets_5_10_20_30_plus_all_fit_and_grow` asserts
every plan fits its budget, is non-empty with candidates, and total
seconds are monotone across 5/10/20/30/45.

## Acceptance 2: Balances due review, weak skills, progression, modality repetition limits

- Three objectives with configurable budget shares (default 0.5/0.3/0.2):
  due reviews (ordered by ascending retrievability — most-likely-forgotten
  first), weak-skill practice (ascending derived-mastery confidence),
  curriculum progression (input order = curriculum order).
- Phase 1 fills each objective's reserved share; phase 2 spends leftover
  budget cycling review → weak → progression so no objective starves.
- `max_per_modality` repetition cap enforced across all objectives
  (`modality_repetition_limit_is_enforced`: 60 listening candidates,
  cap 3 → exactly 3 planned).
- `balances_due_review_weak_skills_and_progression` shows all three
  reasons present in one 10-minute plan and weakest skill first.

## Acceptance 3: No streak/day-presence objective

The planner API takes no attendance, day, or calendar inputs; every
planned item carries one of exactly three learning reasons
(`DueReview`/`WeakSkill`/`Progression`). An empty candidate set yields
an empty plan — the planner never pads sessions with filler to
"maintain presence" (`every_planned_item_has_a_learning_reason_no_attendance_objective`,
ADR-0002).

## Acceptance 4: Reproducible with fixed input/seed

Pure function, no RNG: `plans_are_reproducible_with_fixed_input_and_seed`
asserts two runs with identical config (seed 1234) produce equal plans;
the seed is recorded in `SessionPlan` for future stochastic variants;
retrievability ties resolve by item id (stable total order), so output
never depends on iteration luck.

## Evidence

- `state/evidence/LEARN-004/cargo-test-2026-10-02.txt` — lts-scheduler
  11 tests (6 planner + 5 spike) green, zero warnings.
- `state/evidence/LEARN-004/ci-2026-10-02.txt` — full `./scripts/ci.sh`
  exit 0 ("CI OK") + handoff validator PASS (48 data files).
