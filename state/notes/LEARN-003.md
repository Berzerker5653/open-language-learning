# LEARN-003 Acceptance Notes — Scheduler abstraction + FSRS spike

Date: 2026-10-02

## Acceptance 1: Research note compares maintained FSRS implementations and licenses

`docs/assessment/SCHEDULING_RESEARCH.md` compares:

- `fsrs-rs` (open-spaced-repetition, BSD-3-Clause, actively maintained, ~437★) — full
  parameter optimization + scheduling; leading production candidate.
- `rs-fsrs` (MIT, ~50★) — scheduler-only, no optimizer.
- `ts-fsrs` (MIT) — TypeScript port; would leak scheduling into the UI layer.
- Python `fsrs` reference implementation — reference only, not a Rust dependency.

License review (BSD-3/MIT permissive) and vendoring/attribution plan recorded there.
No dependency was vendored in the spike; the spike is dependency-free.

## Acceptance 2: Discrete retrievable items scheduled without daily-attendance requirement

- `crates/scheduler/src/fsrs.rs`: `Scheduler::review` produces a per-item `due_at`
  timestamp from stability/interval math; nothing in the crate references days
  attended, streaks, or calendar presence.
- `crates/scheduler/tests/spike.rs::due_time_is_a_property_of_the_item_not_the_day`
  proves: due time = review time + interval (rounded), item not due the next day,
  due exactly at `due_at`, and per-item independence.
- `crates/storage/src/scheduler.rs`: `save_scheduler_state` (upsert) +
  `due_items(profile, scheduler, due_cutoff)` — retrieval is by due cutoff, not by
  "today's session". Covered by `persistence_round_trip_and_due_query` (storage).
- `rating_from_evidence` maps only linguistically scored outcomes to ratings;
  technical failures/abstentions return `None` and never touch the schedule
  (`unscored_evidence_never_reviews_an_item`).

## Acceptance 3: Interface + deterministic under test clock/seed

- Trait `Scheduler { review, retrievability, is_due, version }` in
  `crates/scheduler/src/fsrs.rs`; `FsrsSpike` is one implementation; consumers depend
  only on the trait.
- `determinism_under_fixed_clock_and_parameters` asserts bit-identical
  (`to_bits`) state/due/retrievability across two runs with the same fixed clock
  (`t0 = 1_790_966_400`) and fixed parameters — no RNG, no wall clock.
- `stability_grows_on_success_and_falls_on_lapse` pins monotonic behavior.

## Spike honesty

`DEFAULT_W` is explicitly labeled placeholder engineering values in the FSRS-4.5
formula shape, NOT community/calibrated defaults (an earlier draft that claimed
community defaults produced absurd post-failure stability ~900 days and was
replaced). Post-failure stability is capped at pre-lapse stability (forgetting can
never increase stability). Production path: adopt `fsrs-rs` with calibrated
parameters; the trait exists so the spike can be swapped without touching callers.

## Evidence

- `state/evidence/LEARN-003/cargo-test-2026-10-02.txt` — lts-scheduler 5 tests,
  lts-storage 8 tests, all green, zero warnings.
- `state/evidence/LEARN-003/ci-2026-10-02.txt` — full `./scripts/ci.sh` exit 0
  ("CI OK"), plus handoff validator PASS (48 data files).
