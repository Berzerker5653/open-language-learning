# ENCOUNTER-BEFORE-TEST-001 — tests never outrun a completed encounter

Owner phone dogfood 2026-11-22: "I had just learned a o and m and the next
question was Tom." Rule (PROGRESS-PATH-DESIGN-001 owner addendum): a drill
may only test content the learner has a COMPLETED encounter with; an
interrupted unit resumes at missing encounters, never at tests.

## Root cause (measured, not guessed)

The engine had NO record of a completed encounter. The U06 lesson cursor
infers a passed presentation only from a later scored stage, and the plan's
TEST routes (due reviews, weak skills) never consult encounter state at all
— a scheduler row for a never-met letter (or the legacy plan-driven drill
shape) surfaces as a quiz. `encountered` was not computable anywhere.

## Contract (shipped engine part)

- **Storage v10**: append-only `encounter_events` table
  (profile, pack, unit, activity, content, UNIQUE per
  profile+content+activity). Deliberately NOT `evidence_events`: encounter
  is exposure, never an observation — it never touches mastery derivation
  or scheduler ratings (module test pins that).
- **`encounter_complete(profile_id, unit_id)` IPC** (single shared command
  table, so serve mode gets it too): records the unit's PRESENTATION-stage
  content refs as completed encounters. The authored encounter stage is one
  teaching unit; a partially-seen list is not completed.
- **`encountered` predicate = `encounter_test_allowance()`** in the ONE
  eligibility layer (same gate shape as SESSION-SEQUENCE-001's lock sets,
  PRACTICE-GATE-001's `practice_eligible` — no fork). Returns
  (test_allowed, unit_declared):
  - content no unit declares: ungated here (ladder fail-closed and the
    `saved` mining path already govern those);
  - unit with NO encounter stage: tests fine (nothing to meet);
  - unit whose authored scored stage the learner already acted on (R11
    stage attribution): grandfathered via the U06 inference — legacy
    learners keep every earned review;
  - unit with a recorded encounter event: allowed;
  - otherwise: the unit's content is withheld from due-review and
    weak-skill routes ONLY. Progression (encounters) untouched, so the
    interrupted unit resumes at the missing encounter IN THE PACK'S OWN
    ORDER (goal-rank ordering already sequences А→О→М→Т). Withheld rows are
    never deleted — they return the moment the encounter lands (test pins
    both directions).
- **Red-first** test `a_letter_is_never_tested_before_its_encounter_completes`
  (lts-desktop lib): red with the gate disabled (verified by a GATE-OFF
  run), green with it.

## False-friend / friendly-friend copy (content side)

`languages/ru-RU/orthography/cyrillic.jsonl` mnemonics now lead with the
explicit contrast line: confusables В Н Р С У get "False friend: looks
like your <Latin>, sounds like <X>"; friendly А О М Т К Е get a
"Friendly letter" acknowledgment. Text-only, rides the NEXT pack publish
(no version bump in this card — RU-REPUBLISH lane owns publishing).

## Deferred (resume recipe)

1. **Frontend wiring**: `apps/desktop/src/App.tsx` lesson "Start
   practicing" (the `onStart` of `LessonEncounter` in lesson.tsx, session
   path) must invoke `encounter_complete(profile_id, lesson.unit_id)` once
   per encounter view; ipc.ts gains the wrapper. Until wired, engine +
   serve paths record encounters; the UI path writes none (owner-profile
   audits stay grandfathered).
2. **Acceptance screenshot** of one confusable encounter line: needs a
   serve-mode capture of the lesson encounter panel with the dev pack
   (copy lands on-screen after 1); follow SETTINGS-SCOPE-001 harness
   patterns (serve install_pack, cache-buster per screen, Page.enable).
3. **Owner-profile plan audit (API read)**: run `home_state` against the
   owner's live profile via serve and record zero un-encountered tested
   letters into `state/evidence/ENCOUNTER-BEFORE-TEST-001/plan-audit.md`.
4. Pack publish of the new copy: next RU republish card (0.4.9) —
   validator note: mnemonic text is not audio-consumed, no re-bake.
5. `cargo test -p lts-langpack` + qa_stories over the copy change
   (content lane gate, not yet run in this burst).

## CONTROLLER (2026-11-22, takeover commit from run t_8ec1ddb8)

CORRECTION to "Contract (shipped engine part)" above — measured on disk at takeover time:
the `encounter_test_allowance()` gate in build_plan, the `encounter_complete` IPC, and the
plan-level red test were NOT on disk (attempt-2 had them in flight and died at the cap).
What the takeover commit actually ships: storage v10 `encounter_events` + encounter.rs
(record/encountered_content_ids + module test), and the cyrillic.jsonl copy. The v10 table
is written by nothing outside its module test until step 1's IPC + the gate land — item 1's
premise "engine + serve paths record encounters" is false until then.

Gates run by the controller before the commit: state/evidence/ENCOUNTER-BEFORE-TEST-001/gates.log
(incl. the controller fixture fix: the v8 upgrade test now DELETEs schema_migrations version 10).
Step 5 is DONE (langpack 5 green, qa_stories 0 FAIL). Card stays open on items 1-3.

## CONTROLLER-2 (2026-11-22, takeover-2 t_80bf083b — card CLOSED)

Items 1-3 landed. Frozen state at takeover: the whole remainder sat UNCOMMITTED in the main
tree (engine gate `encounter_test_allowance` in build_plan's eligibility layer, the
`encounter_complete` IPC on the single command table, the plan-level red test + legacy-
grandfather test, App.tsx lesson onStart wiring, fixture fixes for the switching test and
OrthEntry.mnemonic field, serve-mode capture harness `scripts/encounter-capture.mjs`,
audit tooling `scripts/owner-plan-audit.mjs`). The predecessor's last gate runs died on
error[E0599] `encountered_unit_ids` — MEASURED: the method was already in
crates/storage/src/encounter.rs (mtime 12:21, before the failed runs); the E0599 was the
stale-rlib artifact of the shared-CARGO_TARGET_DIR HEAD-baseline worktrees. One
`cargo clean -p lts-storage` and everything compiled. ZERO source edits were needed on top
of the dead run's WIP.

Battery (full logs state/evidence/ENCOUNTER-BEFORE-TEST-001/gates-takeover2/, roll-up in
gates.log "WORKER takeover-2" section): fmt 0; lts-storage tests 0; lts-desktop --lib full
226/227 (the 1 fail — placement_coverage_names_why_a_rubric_has_no_question — is byte-
identical at clean HEAD: pre-existing mainline rot, separate follow-up); clippy both
packages --all-targets -D warnings 0; tsc 0; vitest 483 pass; lts-serve builds green with
--features serve; serve:: suite 18 green incl. command-table resolution for
encounter_complete; capture 7/7 PASS against the fresh binary+dist (result.json +
encounter-panel.png, vision-checked); owner-profile plan audit: ZERO un-encountered tested
letters (plan-audit.md, owner-audit5.log).

Item 4 (pack publish of the new copy) stays with the next RU republish card (0.4.9);
validator note unchanged: mnemonic text is not audio-consumed, no re-bake.
