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


## RUN 120 outcome + RUN 121 RESUME RECIPE (2026-11-21 20:25)

SHIPPED (commit 2c6f328, gates in state/evidence/SESSION-SEQUENCE-001/):
goal-graph band locks on NEW seeding + due reviews; RED-then-green test
passes; full lts-desktop lib suite 214/0 (HEAD baseline 213+1 red);
fmt/clippy green. Dirty main copy also carries the hunks (ORTHO lane
keeps them; duplicate test removed).

NOT SHIPPED — acceptance FAILED for a newly-traced reason: the live
owner read (fixed lts-serve on :17641, profileId arg, pack 0.4.6) still
served 3 argue rows:
- ru.lex.argue.otricanie / utverzhdenie: reason `weak-skill` — the plan
  has a THIRD content route, `weak_skills` in build_plan (derived rows
  with confidence < WEAK_CONFIDENCE become WeakSkillItems). My fix gated
  `progression` (NEW seeding) and `due_reviews`, never weak_skills.
- ru.lex.argue.kontrargument: reason `progression` — check which units
  reference it in the INSTALLED 0.4.6 pack; if any referencing unit has
  an undeclared goal_id (unit_goal_locked returns false for undeclared
  goals) it survives the exclusive rule. See grep output in the board
  comment; likely 0.4.6 (published from 96367af, pre-ORTHO) has a unit
  whose goal is not in goals.yaml, OR a shared ref in an unlocked unit.

NEXT (TAKEOVER card):
1. Gate weak_skills in build_plan exactly like due_reviews:
   `weak_skills.retain(|w| !band_locked.contains(&w.content_id));`
   (same band_locked set; evidence rows on disk untouched — the rows
   return when the unit unlocks).
2. Investigate kontrargument: for the 0.4.6 installed pack list every
   unit that references it and its goal_id; if the goal is undeclared,
   decide: fail-CLOSED (a unit whose goal is declared-missing and whose
   goal_id is non-empty is locked when goals map is non-empty) — that
   matches "the goal graph alone gates bands"; keep the empty-goal_id
   fixture escape hatch. Rewrite the test to assert weak-skill rows
   withheld too (extend the poison assertions: reason must never be
   weak-skill for locked-band content).
3. Re-run lane gates (worktrees + media symlink recipe above), then the
   :17641-style acceptance (POST /api/home_state body uses `profileId`
   camelCase!), require zero above-on-ramp activities.
4. Ledger graft (HEAD task-state has NO entry; my entry text is in the
   dirty task-state.json, flip to done) + evidence dir + notes; run
   tools/validate_handoff.py --require-explicit-ledger-records in the
   fix worktree (main tree carries ORTHO WIP that pollutes validation).
5. Close: unblock+complete t_fb35220d (it is still `running`-claimed by
   the cap-death; takeover closes the parent per the standard recipe).


## RUN 121 TAKEOVER record (2026-11-22, board t_426b4251)

Step-2 premise REFUTED by measurement (full numbers + decision in
state/evidence/SESSION-SEQUENCE-001/takeover-findings.md): in installed
0.4.6 ZERO units reference `ru.lex.argue.kontrargument` (the 688-bal-09
lead was an id conflation with `ru.lex.soc.kontrargumentaciya`), and ALL
818 unit goal_ids are declared. The leak is the raw-lexicon seeding stream
iterating UNATTACHED entries — 178/4057 RU entries have no unit claiming
them, so the exclusive goal-lock cannot see them.

Shipped gates (takeover): (1) `weak_skills.retain(!band_locked)` like due
reviews; (2) fail-CLOSED: unit with non-empty goal_id absent from a
non-empty goals map is locked (empty-goal_id + empty-map fixture escapes
kept); (3) lexicon stream: in a pack with a goal map, a lexicon entry
referenced by no unit is NEW-ineligible. Due/weak retention keeps using
the goal-locked set only — already-introduced items are never hidden.
Tests: beginner_plan_never_serves_a_locked_units_content extended (poison
EVIDENCE now feeds the weak-skill route; weak-skill-reason assertion;
kontrargument absence), new lexicon_words_outside_the_goal_ladder_are_not_seeded.

REMAINING RECIPE if this run dies mid-way:
1. Gates run as systemd unit lts-ss1to-gates; logs
   ~/.hermes/cache/scratch/ss1to-logs/{fmt,test-targeted,test-lib-full,
   clippy-desktop,clippy-engine}.log + summary.txt + DONE marker. Worktree
   ~/.hermes/cache/scratch/lts-ss1-to-work (HEAD+fix+tests, media wav
   symlinks in place; shared CARGO_TARGET_DIR=<repo>/target).
2. RED demo (optional evidence): revert the 3 code hunks in the worktree
   (unit_goal_locked `return true`→`false`, the lexicon `ladder_locked_lexicon`
   guard, the weak_skills retain) keeping the tests → the extended test
   fails on the weak/unclaimed assertions; restore. Otherwise cite
   state/evidence/SESSION-SEQUENCE-001/acceptance-home_state* from run 120
   as the measured RED (rows listed with reasons).
3. Acceptance: build lts-serve (feature serve) from the worktree, spare
   port :17641, DEFAULT data dir ~/.local/share/openlang; POST
   /api/home_state with body key `profileId`, owner
   prof-e1799551-fc43-494b-ae07-6426bc530ca8 ⇒ zero activities above
   on-ramp (no argue/argue2*/... content ids in plan). Scheduler rows on
   disk UNCHANGED (2 argue rows must still be there).
4. Ledger graft onto HEAD copies IN THE WORKTREE (main tree carries
   sibling WIP in task-state.json/KANBAN.md): entry SESSION-SEQUENCE-001
   → done, evidence += takeover-findings.md + takeover-gates.log,
   summary set; active_task must be null unless another card is
   in_progress; KANBAN.md done row. validate_handoff
   --require-explicit-ledger-records IN THE WORKTREE.
5. Commit: worktree lib.rs blob via git hash-object -w + git update-index
   (keeps ORTHO WIP unstaged); apply same diff to the dirty main lib.rs
   with patch -p1 (ORTHO keeps it); git add ONLY: the two blobs,
   state/notes/SESSION-SEQUENCE-001.md, state/evidence/SESSION-SEQUENCE-001/
   takeover-*.
6. Close parent t_fb35220d: unblock then complete --result with shas.
   Follow-up card: claim orphan lexicon entries into RU/JA units.


## RUN 122 controller record (2026-11-22, takeover t_426b4251 — LANDED)

Gates (unit lts-ss1to-gates3, logs ~/.hermes/cache/scratch/ss1to-logs3/, distilled into
state/evidence/SESSION-SEQUENCE-001/takeover-gates.log): fmt exit 0; targeted 6/6 green
(both lane tests by NAME); full desktop lib 218/1 where the single red is the vendor-gated
dictation ASR load-flake (passes filtered with neighbours; untouched by this lane); clippy
-p lts-desktop --all-targets -D warnings exit 0. NOTE: `-p lts-engine` (card gate line) is a
nonexistent crate — workspace has no lts-engine; the lane diff is lts-desktop-only.

Controller fix over run 143's diff: the new lexicon test's eto assertion was a FALSE PREMISE
(measured: every unit referencing ru.lex.everyday.eto sits behind a hard goal edge — 006's goal
requires on-ramp.cyrillic@independent — so the run-120 exclusive rule correctly locks it at zero
evidence). Assertion corrected to the honest day-one lock; claimed-word positive path stays
covered by the K-70 konnichiwa line. No gate/engine weakened.

Acceptance (:17641, built from this lane's worktree, owner profile prof-e1799551…): plan has
ZERO argue/kontrargument rows (run-120 RED had 3); zero above-on-ramp UNIT-BANDED activities;
poisoned scheduler rows intact (5 scheduler_state / 6 evidence_events before == after).
NEW measured limitation (same class as unclaimed sentences): the 3 ru.contrast.voicing.* plan
rows are UNCLAIMED phonology content — zero units reference any contrast id. Frozen contract
scoped the orphan gate to the lexicon stream; phonology/sentence orphan gating goes on the
orphan-content follow-up card (also: claim the 178 orphan RU lexicon entries there).
