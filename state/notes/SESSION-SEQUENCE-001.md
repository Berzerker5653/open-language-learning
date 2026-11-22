# SESSION-SEQUENCE-001 — beginner plan served upper-band content (owner phone dogfood 2026-11-21)

## Incident (measured)

Owner profile `prof-e1799551…` (level 0, RU pack): the 4th activity of a
letter-learning session was the unit `410-argue-01` lesson "Claim" (B2
argument vocabulary). `state/evidence/DOGFOOD-2026-11-21/complaint-05-claim-lesson.png`.

## Root cause (traced in code, 2026-11-21 run 119)

The plan has three candidate sources (`build_plan` in
`apps/desktop/src-tauri/src/lib.rs`):

1. `progression_items` — goal-path items, already gated by
   `goal_is_locked` (hard prerequisite edges evaluated against derived
   mastery). This path was NOT the leak.
2. `add_new_item_candidates` — the lexicon/script/contrast/sentence
   NEW-item seeding streams. Its ONLY content lock is
   `locked_new_content`, which covers just the units that declare
   `requires_unit` phase gates (ADR-0022). The RU reference pack declares
   `requires_unit` in exactly 3 units (812/815/818); its band ladder lives
   entirely in the GOAL graph (`curriculum/goals.yaml` hard prerequisites,
   B2 goals requiring B1 goals at `independent`, …). The seeding streams
   never consult the goal graph ⇒ every RU lexicon word, including the
   B2 argue words, was NEW-eligible for a day-1 profile. That is the leak.
3. `due_reviews` — scheduler rows. The bug poisoned itself: the learner
   actually answered the Claim words, so `fsrs-spike-0.1.0` rows exist in
   `profiles.db` and keep resurfacing them as due reviews even after the
   seeding gate is fixed (confirmed: 2 of the owner's 5 scheduler rows are
   `ru.lex.argue.utverzhdenie/otricanie#recall-meaning`).

No plan cache exists (`home_state` rebuilds via `build_plan_view` every
call), so scope (3) of the card (pack-version plan invalidation) is NOT a
contributing factor — the stale part is the scheduler rows, handled by the
due-review gate below.

## The gate contract (engine-level, no pack hiding)

For each selected pack version:

- `pack_goals(root)` reads the goal map via `pack_goal_files` (shard-safe)
  and is cached per immutable version root.
- A unit is goal-locked when its `goal_id` names a declared goal that has
  at least one HARD prerequisite whose target is ANOTHER GOAL in the map,
  and that prerequisite does not hold — `goal_derived_state(goal, prereq
  dimension, derived) >= required_state` — in ANY of the goal's declared
  modalities. Content-targeted prereq edges keep today's behavior (they
  gate only the goal-path stream via `prereq_satisfied`); that keeps the
  ADR-0022 phase-gate semantics of the ja reference pack and the fixture
  packs byte-identical.
- NEW-material exclusion is EXCLUSIVE: a content id is locked when every
  unit that references it is goal-locked AND no `requires_unit`-unlocked
  unit references it. A word taught by any unlocked unit stays eligible
  (shared words like `ru.lex.everyday.eto` never disappear).
- Due pack-content reviews (non-saved FSRS rows) whose content is locked
  by this rule stay out of the plan; the rows are NOT deleted — they
  return when the learner's evidence unlocks the unit (same shape as the
  R07 language-switch scoping). Learner-mined (`saved`) rows are
  learner-owned and exempt.
- `lesson_plan_at` follows the plan item's content id; gating at the plan
  source keeps lesson routing consistent without a second rule.

## Day-one shape on the RU reference pack (computed from pack data)

Zero evidence ⇒ the only unlocked goal is `ru.goal.on-ramp.cyrillic` (no
prerequisites); its letter-unit content (000/01x band) seeds, and the
ladder opens one rung at a time as `independent`/`introduced` evidence
lands on each goal's required concepts. B2 argumentation sits behind three
hard goal edges — unreachable in a beginner session walk.

## Verification

- RED-then-green test `beginner_plan_never_serves_a_locked_units_content`
  (tests module): fresh RU profile, poisoned scheduler rows pre-seeded,
  six executed sessions through the real `build_plan`; asserts zero
  B2-banded unit content and zero poisoned ids in any plan, and that the
  plan is never empty (sessions must always offer learning).
- Owner acceptance: fresh read of the live API (`home_state`) after the
  fixed binary is deployed on the serve box — zero plan activities from
  units above the on-ramp band.

## Lane hygiene

`lib.rs` is shared with the sibling ORTHO-LETTER-UNITS-001 lane's WIP;
this lane commits via the worktree-at-HEAD + `git update-index` graft so
the sibling's uncommitted hunks stay unstaged.

## RUN 120 status block (2026-11-21 ~20:00)

Gate unit `lts-ss1-gates` is running the full battery; logs land in
`/home/hunter/.hermes/cache/scratch/ss1-logs/` (red-test, green-test,
fmt, clippy, full-lib, full-base). Do NOT re-run the gates or start a
second battery. Worktrees: `~/.hermes/cache/scratch/lts-ss1-work`
(HEAD+fix+test), `lts-ss1-red` (HEAD+test only); both symlink the main
tree's `languages/*/media` (wavs are gitignored — without the link
`install_reference_pack_fast` dies on the archive build, which is an env
artifact, not a lane bug). The RED test from run 119 lives in the DIRTY
main lib.rs (hunk after `install_reference_pack_fast`, before
`/// The reference pack's source tree`) — extraction copy:
`~/.hermes/cache/scratch/ss1-test-block.txt`.
After the battery: commit = HEAD lib.rs + engine fix + test via
`git hash-object -w`/`git update-index`; apply the same hunks to the
dirty main copy with `patch -p1` so the ORTHO lane keeps them; ROADMAP
entry must be grafted onto HEAD's ROADMAP.yaml (HEAD has NO
SESSION-SEQUENCE-001 entry; the dirty copy's entry+optional_tasks line
are run 119's). Ledger graft onto HEAD task-state.json (HEAD has no
entry, active_task null). Acceptance: fresh `lts-serve` (rebuild with
serve feature) on a spare port with default data dir
`~/.local/share/openlang` — owner profile
`prof-e1799551-fc43-494b-ae07-6426bc530ca8`, plan must contain zero
activities from above-on-ramp units; the two poisoned
`ru.lex.argue.*#recall-meaning` scheduler rows are WITHHELD, not
deleted (verify rows still on disk after the read). Clear this block
when the lane lands.

