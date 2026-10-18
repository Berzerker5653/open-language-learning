# ADR 0036: The engine's activity-runner table is the denominator for runnable practice

Status: Accepted
Date: 2026-10-18

## Context

`RU-MODALITY-PRACTICE-001` had to answer whether the 3,248 activities the Russian
pack declares actually execute, or only appear in a modality tally. Nothing in the
tree could answer that: routing knowledge lived implicitly inside the
`practice_build`/`practice_submit` match arms, and the coverage document's
`RUNNABLE PRACTICE` heading (2026-10-14) recorded **declared** modality counts
(reading 1,629 / writing 1,601 / listening 9 / speaking 9 — the same 3,248), which
is exactly the conflation `docs/18` and ADR-0025 forbid. The 1,560 declared
activities that the ja-JP pack cannot serve were invisible, and the UI had no way
to say "this stage is declared but nothing runs it" without restating engine logic.

Pinned versions at the time of writing: Rust toolchain 1.89.0, `lts-desktop` crate
(lib.rs), Prettier 3.9.9. Prettier 3.9.x is stricter than the 3.3–3.6 rule sets
most of this tree was formatted with; formatting drift is repo-wide (see
Consequences) and is not caused by this decision.

## Decision

1. **One pure table decides runnability.**
   `activity_runner(activity_type, modality) -> Option<&'static str>`
   (`apps/desktop/src-tauri/src/lib.rs:6950`) is the single source of truth for
   whether a declared `(type, modality)` pair has a practice runner, and which one.
   It answers in the pack's short-name namespace (`encounter-read`, not
   `encounter-presentation`); `practice_build` and `practice_submit` keep answering
   in the kebab dimension namespace via `parse_dimension`. `None` is a real answer,
   and `practice_build` refuses those activities with
   `no practice runner for this activity yet` (lib.rs:5305, :5491) — asserted, not
   documented (lib.rs:13968).
2. **The planner serialises the answer.** Each `LessonStage` carries `stage_kind`
   and, where the table names one, `runner` (lib.rs:6887-6902). The frontend renders
   `data-runner` and the copy "Served by the X runner.", and shows "Declared, but
   not runnable: no practice runner for this yet" when the field is absent. No
   frontend copy of the table exists.
3. **The coverage tool measures instead of restating.**
   `tools/measure_language_coverage.py` parses that table out of `lib.rs` at run
   time and prints the five layers — declared, runnable practice, servable
   practice, valid evidence, review posture — as separate counts, `--json` included.
   `docs/assessment/RELEASE_COVERAGE_RU.yaml`'s STATUS block is the tool's printed
   output, with invocation, measurement date, table source commit, policy version
   and a control pack recorded in its `measurement:` block.
4. **`comprehension-listening` is a recognised kebab modality alias** (lib.rs:688).
   Without it the listening runner's evidence could never be recorded at all.
5. **Dictation ASR language comes from the pack manifest** (`pack_asr_language`,
   lib.rs:4437). A hardcoded `ja` in the dictation request manufactured
   `matched: false` for Russian audio. A locale-less pack abstains
   (`pack-locale-unknown`); an unavailable aligner abstains
   (`aligner-unavailable`). Guided speaking stays unscored per ADR-0017: no mastery
   write, no verdict, no typed substitution.

## Consequences

- "Runnable practice" becomes measurable per pack, and adding a runner is one arm
  plus a runner→dimension mapping in the tool. Omitting the mapping is loud: the
  tool counts the runner as evidence-unknown rather than guessing a dimension.
- A new declared activity type without a runner is now a visible gap in the report
  (`unrunnable_declared_pairs`, per-reason servability) instead of a silent
  overcount. Deliberate `None`s stay: `match`, `game`, `pattern-transform`,
  `character-writing`, `listen-and-draw`, `situational-dialogue`,
  `roleplay-scenario`, `story-reading`, bare `reading`/`listening`,
  `listening-discrimination-*`, and every assessment type
  (`timed-assessment`, `diagnostic-test`, `placement-test`, `hvpt`, `scenario`).
- The tool depends on the table's source shape. If the signature, arms or comment
  style change, the tool exits 1 with `activity_runner table not found` rather than
  reporting zeros.
- The tool is **not** in CI. ADR-0025 explicitly rejected machine-enforcing the
  coverage denominator, and the release-coverage document states its gates are
  hand-checked. Keeping the numbers correct is therefore a manual discipline: any
  pack or engine change requires a re-run and a document re-check.
- Reading stays on encounter presentation rather than gaining an invented "reading"
  task type: `stage_kind` already classified `encounter-read` that way
  (lib.rs:6921), so 1,609 servable activities were merely unlabelled.
- Formatting drift is repo-wide and pre-existing: pinned Prettier 3.9.9 flags six
  files already at `50989f8c` (`App.tsx`, `home.tsx`, `hub.tsx`,
  `journeys/harness.tsx`, `journeys/kanji-decomp.journey.tsx`,
  `lib/kanji-decomposition.ts`), so `pnpm fmt:check` is red on the base commit
  independently of this decision. A separate formatting-only commit is the owner's
  call; engine and measurement changes stay reviewable on their own.

## Alternatives considered

- **Declare runners in the pack.** Rejected: packs are untrusted data (AGENTS.md,
  ADR-0001). They may reference capabilities, not choose engine execution paths.
- **Duplicate the table in the tool.** Rejected: a second source of truth is how the
  2026-10-14 category error happened in the first place.
- **Infer runnability from pack YAML modality counts.** Rejected: that was the
  status quo and it reported declared content as runnable practice.
- **Leave routing implicit in `practice_build`.** Rejected: nothing could then count
  the declared-but-unrunnable pairs, which is the number criterion 3 of
  `RU-MODALITY-PRACTICE-001` requires.
- **Add a CI gate that runs the tool.** Rejected for now: it would machine-enforce a
  denominator whose values the owner has not agreed to gate on (ADR-0025), and the
  document's own gates are hand-checked. Revisit if the owner wants the counts to
  become blocking.

## Verification at adoption

`cargo test -p lts-desktop` 159 passed / 0 failed / 1 ignored, including the six
Russian tests; the six run individually by name; `tsc --noEmit` clean, 265 Vitest
tests in 32 files pass, `vite build` clean, `eslint .` clean; the coverage tool ran
against both packs in one pass (ja-JP as control) and every numeric claim in
`docs/assessment/RELEASE_COVERAGE_RU.yaml` was compared against that run's
`--json` output — 29 claims checked, none missing. Evidence:
`state/evidence/RU-MODALITY-PRACTICE-001/`.
