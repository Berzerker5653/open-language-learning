# REVIEW-FIX-M1-PROGRESSION-001 — axis (b) STANDARDS

Repo conventions (AGENTS.md + CODING_STANDARDS.md section B), commit/ledger
hygiene, new-test quality, pin integrity. Reviewer re-runs at the exact
commits in detached worktrees (shared CARGO_TARGET_DIR, gitignored pack media
hardlinked in with `cp -al -n`): see `gates.log`.

## Gate re-verification (reviewer-run, not taken on faith)

At `87786961` (code commit): fmt 0; lts-scheduler tests 15/15 green; clippy
-p lts-scheduler --all-targets -D warnings 0; clippy -p lts-desktop
--all-targets -D warnings 0; **full lts-desktop lib suite 259 passed / 0
failed / 2 ignored** (379s). This independently confirms the lane's headline
"259/0" claim on the exact committed tree — despite the evidence logs for
that claim not showing worktree paths (below).

At `25757ff3` (ledger commit): `python3 tools/validate_handoff.py
--require-explicit-ledger-records` → **PASSED**. The card's ledger close was
machine-green when recorded.

## Commit/ledger hygiene

- Two-commit convention (code + ledger), scoped staging, evidence committed
  with the code commit: correct shapes.
- Ledger message and task-state notes repeat a figure no artifact supports
  ("60-day sim acceptance PASS" — every artifact says 30 days; see SPEC S2).
  `CODING_STANDARDS.md` B: "a commit message asserts only verifications that
  actually ran." The 30-day verification ran; the 60-day one did not.
  Defect — FIX card.
- The task-state note claims "Standalone-verified committed tree (clean
  worktree + generated media synced)" but the committed `battery.log` /
  `gates.log` show compile paths under `/home/hunter/game-dev/LTS` (main
  tree) — no worktree paths anywhere in the evidence. The claim turned out
  TRUE by my independent re-run, but as committed, the evidence does not
  document where it ran. Note, not a defect.
- `gates.log`'s fmt section is empty (no exit marker) and the fmt/desktop/
  clippy results actually live in `battery.log`; the card named `gates.log`
  specifically. Both files are in the card's evidence dir and task-state
  points at `gates.log` only for the gate trail. Minor note.
- `state/evidence/LEARNER-REVIEW-M1-001/sim/raw/` is gitignored and gets
  overwritten by each re-sim: the RCA's raw day logs are preserved ONLY in
  the tarballs. That worked this time (I reproduced the RCA's 6-item
  starvation from `raw-ru.tar.gz`), but the on-disk directory that the RCA
  cites as evidence no longer contains the run it cites. Convention note for
  the review program: cite tarballs, treat the loose dir as scratch.

## Test quality of the new gating tests

- `missing_letter_of_an_unlocked_unit_stays_new_eligible` — reproduces the
  incident shape (goal touched, letters a/o/m at `independent` via two prompt
  families) and pins `т` NEW-eligible. The two-family seeding is the
  load-bearing part: at sup 0 the old funnel would also pass. Good.
- `gated_unit_content_never_enters_the_new_selection` — K-70 regression pin
  with a positive control (`cyrillic.a` must seed), so the negative
  assertion can't pass on an empty pool. Good shape.
- `letter_drills_span_two_prompt_families_and_reach_independent` — pins the
  rotation property (14-day both-forms sweep), the submit-side family
  stamping, AND the ladder outcome (two clean drill days -> `Independent`).
  Covers mechanism + evidence record + ladder consequence. Strong.
- `new_material_keeps_its_share_behind_a_weak_skill_backlog` (scheduler) —
  pins both starvation mechanisms (progression floor survives a 30-item weak
  backlog; weak keeps its share too). Good.

## Pin integrity (weakened-pin check)

- `modality_repetition_limit_is_enforced` re-pin: OLD asserted a global
  modality cap of 3; NEW asserts per-objective caps of 3 for two populated
  objectives AND total 6. Contract change is deliberate (shared cap was
  starvation mechanism 3), documented in the test and in `mechanism.md`, and
  the assertions are strictly more numerous. Not a weakening.
- `russian_cyrillic_practice_unlocks_the_greetings_gate` re-pin: verified at
  the pre-commit image — the old pin asserted `first_required("ru.goal.on-
  ramp.greetings")` (i.e. `ru.grammar.on-ramp.formulaic-politeness`, which
  `practice_build` refuses to build) reached the offered stream, so the
  commit message's "old pin certified an unclickable item" is accurate.
  New pin = positive (real vocabulary offered) + negative (no-runner id must
  never be minted). Strictly stronger; superseded contract documented in the
  test comment. Correct re-pin discipline.

## Judgement-call checklist (CODING_STANDARDS B)

- Deterministic core preserved: rotation is `fnv1a(content#day)`, no RNG;
  the documented UTC-midnight attempt-attribution edge is self-correcting.
- Versioned semantics: `PLANNER_VERSION` -> `session-planner-0.2.0` for the
  changed plan composition. New evidence `prompt_family` values
  (`<content>.drill-recognize|produce`) ride an existing string field; no
  persisted-schema change, so no migration needed.
- No language-specific data added to the engine; packs stay data.
- No privacy, offline-path, or accessibility surface touched.
- No learner-facing copy added. `tools/audit_learner_copy.py` not re-run
  here (no copy files in the diff).
- Out-of-scope extras: covered under SPEC (measured, justified, pinned).

## STANDARDS verdict

**PASS WITH NOTES.** All lane-tier gates green at the exact commits under
reviewer re-run (including a full 259/0 desktop lib at the code commit);
validate_handoff green at the ledger commit; tests are behavior-level and
the two re-pins are documented, strictly stronger contract changes rather
than weakenings. Notes: the false "60-day" figure in the durable record
(defect, FIX card), and evidence-provenance gaps (worktree claim without
worktree paths; gates split across gates.log/battery.log; gitignored loose
sim logs overwritten post-RCA).

## Repo-state observation (NOT from this lane)

`validate_handoff.py --require-explicit-ledger-records` FAILS at HEAD
`d62822da` (introduced there; `935814a2` passed): four cards added by that
evidence commit (`FIX-M1-CONTENT-RU-001`, `FIX-M1-CONTENT-JA-001`,
`FIX-M1-PATH-VIS-001`, `LEARNER-REVIEW-M2-001`) carry
`required_for_desktop_1_0: false` but are missing from
`execution_scope.optional_tasks` — the known publication-policy mismatch.
CI `schemas` job is red at HEAD for this. Separate FIX card filed.
