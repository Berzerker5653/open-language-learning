# RU-MODALITY-PRACTICE-001 — acceptance evidence

Measured 2026-10-18 against `languages/ru-RU` pack v0.4.2 (`pack_id
org.openlanguage.ru-ru.reference`, `target_locale ru-RU`, `maturity experimental`).
Baseline of the card was measured 2026-10-15 and is stale; the re-measurement below
supersedes it (the pack grew: encounter-read 1,589 → 1,609, recall 798 → 838 total,
cloze 776 → 783).

Execution: work was integrated and verified on the Gaming PC. Four `lab_task` jobs
(Omarchy ×2, Hermes worker ×2) produced patches that were reviewed and applied here;
no remote patch was applied automatically.

## What shipped

Engine (`apps/desktop/src-tauri/src/lib.rs`, stays language-neutral — no Cyrillic
literals outside test fixtures, no synthesized audio, no pronunciation score):

- `activity_runner(activity_type, modality) -> Option<&'static str>` (lib.rs:6950-6974)
  is now the single scriptable definition of runnable practice: 13 arms, first match
  wins, `None` = declared but not runnable.
- `practice_build` refuses any activity the table rejects (`no practice runner for
  this activity yet`, lib.rs:5305 and :5491), so the table cannot drift from what the
  engine will actually run. The refusal is asserted, not documented (lib.rs:13968).
- Each `LessonStage` the planner serialises carries `stage_kind` and, where the table
  names one, `runner` (lib.rs:6887-6902); an absent `runner` is the engine stating that
  nothing executes that declared pair yet.
- Dictation ASR language comes from the pack manifest (`pack_asr_language`,
  lib.rs:4437-4445). It previously hardcoded `ja`, which manufactured `matched: false`
  for Russian audio. `ru-RU` → `ru`; a locale-less pack abstains
  (`pack-locale-unknown`) and an unavailable aligner abstains (`aligner-unavailable`).
- `comprehension-listening` is now a recognised kebab modality alias (lib.rs:688), so
  the comprehension-listening runner can record listening evidence at all.

Frontend:

- `apps/desktop/src/lesson.tsx` renders `data-runner={stage.runner ?? "none"}` (:112)
  and the learner-facing line "Served by the {runner} runner." (:118); an unserved
  stage says "Declared, but not runnable: no practice runner for this yet."
- `apps/desktop/src/home.tsx` maps servable modalities to practice verbs
  (`RUNNABLE_MODALITIES`, :118-126: Say it aloud / Listen / Hear the difference /
  Recognise the script / Write it / Type what you hear / Recall) and marks unservable
  plan rows " — no practice runner for this yet" (:392).
- New journey `apps/desktop/src/journeys/ru-modality.journey.tsx` with a Russian pack
  fixture in `apps/desktop/src/journeys/harness.tsx` that mirrors shipped pack facts
  (unit `ru.unit.b2.jstyle-03`, its five activities, four real sentences, real lexicon
  entries, real media-row provenance).

Tooling and docs: `tools/measure_language_coverage.py` (parses the Rust table at run
time instead of duplicating it) and a regenerated
`docs/assessment/RELEASE_COVERAGE_RU.yaml`.

## Criterion 1 — every claimed modality has runnable unit activities the planner serves

| layer | count |
| --- | --- |
| declared units / activities / goals | 818 / 3,248 / 60 (0 activities missing a `type:modality` key) |
| runnable practice (declared pair has a runner) | 3,248 with runner, 0 without |
| servable practice | 3,248 servable, 0 non-servable |
| valid evidence (dimension buckets) | production-writing 1,601 typed · comprehension-listening 9 · recall-meaning 20 · production-speaking 9 formative · `(none)` 1,609 encounter |
| review posture | 3 sources (1 CC-BY-NC-4.0), 4,856 media rows all `model-output`/`qwen3-tts`, 2 AI-drafted flags, newest worklist 2026-10-14 |

Declared pair → runner: `cloze:writing` 783 → cloze; `encounter-read:reading` 1,609 →
encounter; `recall:writing` 818 → typed; `recall:reading` 20 → recall-meaning;
`retrieval:speaking` 9 → guided-speaking; `listen-and-choose:listening` 9 →
comprehension-listening. Runner usage totals: cloze 783, comprehension-listening 9,
encounter 1,609, guided-speaking 9, recall-meaning 20, typed 818 = 3,248.

`unrunnable_declared_pairs: []` and `non_servable_activities: 0` are measured, not
defaulted: the same run carries `languages/ja-JP` as a control, where 1,560 of 4,587
activities still have no runner (`match:reading` 765, `recall-choice:speaking` 754, …)
and 1678 are non-servable (118 missing media rows + 1,560 no runner).

Planner half of the criterion: `the_lesson_plan_names_the_runner_for_every_declared_stage`
(lib.rs:14015) asserts each of unit 818's five declared stages resolves to the expected
runner, and the journey below asserts the rendered lesson carries those names.

Why the reading count moved into "runnable": `stage_kind` (lib.rs:6919-6933) already
classified `encounter-read` as encounter presentation, so 1,609 real Russian stages were
already rendering as encounters while being counted unrunnable. The table now agrees
with the engine. `None` deliberately stays for `match`, `game`, `pattern-transform`,
`character-writing`, `listen-and-draw`, `situational-dialogue`, `roleplay-scenario`,
`story-reading`, bare `reading`/`listening`, `listening-discrimination-*`,
`timed-assessment`, `diagnostic-test`, `placement-test`, `hvpt`, `scenario`,
`fill-blank`, `recall-choice`, `comprehension`, `dictation` and `cloze:reading`.

## Criterion 2 — offline journeys execute the declared task types; speaking stays unscored

One journey, one offline run, all four claimed modalities:
`apps/desktop/src/journeys/ru-modality.journey.tsx`
("runs encounter, listening, writing, and guided-speaking honestly", 143 ms):

- Home plan shows runner verb chips `Say it aloud`, `Listen`, `Write it`, plus review
  rows `Write it` (production-writing) and `Recall` (recall-meaning), and no plan row
  carries the unservable copy.
- Lesson for `Повтор: правка и отправка` names the runner per stage:
  `-grammar` encounter, `-cloze` cloze, `-write` typed, `-listen`
  comprehension-listening, `-speak` guided-speaking (both as `data-runner` and as
  learner copy).
- Encounter presents the pack's own concept rows.
- Listening: `comprehension-listening` runner over the real pack sentence; audio is
  labelled "synthesized voice (model output)"; transcript withheld until after the
  answer; the submit carries `modality: "comprehension-listening"` on
  `ru.sent.b2.j2`.
- Writing: `cloze` / typed runner, `#practice-answer`, submit carries
  `modality: "production-writing"`; no choice chips are offered.
- Speaking (ADR-0017 decision 1, guided-only): `retrieval:speaking` → guided-speaking
  runner. Record/Stop only; no `Check` button, no `.verdict`, empty `aria-live`, no
  score-shaped text (`/\d+\s*\/\s*\d+|\d+\s*%/` absent); the microphone attempt goes to
  `dictation_check` and abstains with `aligner-unavailable`; the panel is forbidden
  from saying matched/not quite/correct/wrong; the guided-mode notice states
  "Speaking practice is formative: it is not scored, and it never counts toward
  mastery." Zero `practice_submit` calls carry `modality: "production-speaking"`.
- Abstinence is honest: with no aligner model on the offline path the tool reports
  `aligner-unavailable`, it never invents a verdict.

Engine-side guarantees (Rust, same file):
`comprehension_listening_runs_over_a_russian_pack_sentence` (:13877),
`the_writing_pair_builds_a_typed_cloze_task` (:13917),
`the_speaking_pair_builds_a_guided_unscored_task` (:13940),
`a_speaking_attempt_is_refused_before_any_mastery_write` (:13976),
`the_lesson_plan_names_the_runner_for_every_declared_stage` (:14015),
`dictation_abstains_rather_than_comparing_in_an_undeclared_language` (:14057).

## Criterion 3 — separate counts, rubric counts never imply enacted practice

`tools/measure_language_coverage.py` prints exactly five layers, and
`docs/assessment/RELEASE_COVERAGE_RU.yaml` reproduces them verbatim (its STATUS block
is documented as the printed output of that tool, not hand-edited numbers). The
`measurement:` block records tool, invocation, measured date, runner-table source,
policy version, control pack, posture flags and the remote-audio caveat.

Separation is enforced in the tool: rubric definition is counted from
`assessments/definitions.jsonl` only; runnable practice comes from the Rust table;
valid evidence is bucketed by the runner that produces it (`RUNNER_DIMENSION`), with
`production-speaking` excluded from `scored_evidence_capable` because
`MASTERY_POLICY.yaml` disqualifies `text-input-substitution`/`response-template` for
production-speaking — the policy's `scored_eligibility` is read from the YAML, not
assumed. Layer 5 posture never feeds any other count. The RU rubric counts (60 goals,
60 listening + 60 speaking rubric records) appear only in layer 1/5 and can no longer be
read as enacted practice: RU now also has 9 runnable listening and 9 runnable speaking
activities, which is exactly the distinction the card asked to keep visible.

Machine cross-check: 29 numeric claims in the regenerated YAML were compared against a
fresh `--json` run; 0 mismatches. `coverage_version` stays `1.0.0` because the
owner-approved denominator is unchanged; only measurements changed, and those are
recorded under `measurement:`.

## Verification log (2026-10-18, Gaming PC)

- `cargo test --workspace` → all `test result: ok.` lines, no failures (largest run 159
  tests in `lts-desktop`, 1 ignored), including the six tests above.
  `cargo fmt --all --check` clean; `cargo clippy --workspace --all-targets -- -D
  warnings` clean. See `cargo-test-2026-10-18.txt`.
- `cargo run -q -p lts-langpack-cli -- validate|lint|test languages/ru-RU` and
  `languages/ja-JP` → exit 0 each.
- Web gates (pnpm is not installed here, so each script's pinned tool was invoked
  directly): `npx tsc --noEmit` 0; `npx vitest run` → 32 files / 265 tests passed;
  `npx vite build` ok; `npx eslint .` 0; `npx prettier --check` on every file this task
  touched → no findings inside the changed lines.
- `.venv/bin/python tools/validate_handoff.py --require-explicit-ledger-records` →
  PASSED (1,960 data files), warnings only.
- `.venv/bin/python tools/audit_content_templates.py languages/ja-JP languages/ru-RU`
  → exit 0. `tools/audit_learner_copy.py` → 39 source files scanned, 0 findings
  (includes the new learner copy).
- `.venv/bin/python tools/measure_language_coverage.py --pack languages/ru-RU --pack
  languages/ja-JP` → captured in `coverage-2026-10-18.txt`.

## Pre-existing failures observed, not caused by this card

1. `pnpm fmt:check` (prettier 3.9.9, same version this repo pins) already fails at HEAD
   `50989f8c` on six files untouched by this card: `apps/desktop/src/App.tsx`,
   `home.tsx`, `hub.tsx`, `journeys/harness.tsx`,
   `journeys/kanji-decomp.journey.tsx`, `lib/kanji-decomposition.ts`. Probe:
   `git archive HEAD | tar -x -C /tmp/headcheck && cd /tmp/headcheck && ln -s
   $OLDPWD/node_modules node_modules && npx prettier --check .`. This card fixed
   formatting only inside its own added lines; unrelated reformatting is left for a
   separate formatting-only commit so this diff stays reviewable.
2. `cargo run -p lts-langpack-cli -- test tools/pack-templates/example-pack` fails with
   `media_manifest_absent` (4 audio-addressable items declared, no `media/manifest.jsonl`).
   Nothing under `tools/pack-templates/` is tracked with media and this card changes no
   file there; CI runs only `lint` on that path (`.github/workflows/ci.yml:74`).
3. Remote-job snapshots initially showed 33 audio-related test failures. Cause: pack
   `.wav` bytes are gitignored by design (`.gitignore:26 languages/*/media/*.wav`; only
   `media/manifest.jsonl` is tracked, 4,856 rows) and are restored in CI by
   `./scripts/fetch-pack-audio.sh` (`ci.yml:45-48`). They are not regressions; the same
   tests pass on this host, where the generated audio is present.

## Judgement calls recorded

- `home.tsx` list keys: drill rows are keyed by `drill.target_id`, "First look" rows by
  `verb`, goal rows by `goal.goal_id`. Unit 818's five activities share one goal
  (`ru.goal.b2.style-register`) but render as lesson/activity rows keyed by
  `activity_id`, so no duplicate React key arises; keys were left unchanged.
- The journey fixture originally seeded a `comprehension-reading` review item on
  `ru.lex.style.nadpiska`. That was fabricated: RU produces no `comprehension-reading`
  evidence (layer 4 has no such bucket for RU; the dimension appears only on ja-JP
  paths). It was replaced with RU-real dimensions (`production-writing`,
  `recall-meaning`), which also let the journey prove a second runner verb. The honest
  no-runner path is proven where it really exists: the engine refusal test (lib.rs:13968)
  and the ja-JP control measurement (1,560 unrunnable).
- No CI step was added for the coverage tool. The `schemas` job does not run it and the
  release-coverage document states its gates are hand-checked (ADR-0025); the YAML gates
  comment now names the producer of the layer counts explicitly instead of inventing a
  gate.
- Privacy/posture flags carried forward, unchanged: `sources.jsonl` still lists
  `zalizniak-2010` under CC-BY-NC-4.0, so RU content is audit-clean but not commercially
  cleared for a paid desktop 1.0 (owner decision outstanding); all 4,856 RU media rows
  are `model-output` from `qwen3-tts`; two sources are flagged for AI model drafting;
  the newest open review queue is `languages/ru-RU/review/WORKLIST-2026-10-12.md` with
  5 open items and 0 closed, so review posture stays provisional regardless of the
  runnable counts.

## Out of scope for this card

`RU-MODALITY-PRACTICE-001` closes the runnable/servable/journey/measurement gap. It does
not clear licensing, does not close the review queue, does not fund a speaking scoring
model (ADR-0017 keeps desktop 1.0 speech feedback guided-only), and does not run
release-gate performance/packaging suites.
