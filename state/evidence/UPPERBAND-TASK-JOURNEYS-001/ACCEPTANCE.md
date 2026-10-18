# UPPERBAND-TASK-JOURNEYS-001 — acceptance evidence

Closed: 2026-10-18. Card: `tasks/ROADMAP.yaml` `UPPERBAND-TASK-JOURNEYS-001`
(M10, P1, `required_for_desktop_1_0: false`, dependency `CONTENT-DEPTH-001`,
already `done`). This card makes upper-band goals claim a runnable task; it
certifies no language content.

## Acceptance item 1 — one named representative goal per upper band, per language, declares a runnable task sequence

Six sequences are now declared as pack data (ADR-0037: the optional v0.2 unit
field `task_sequence` with roles `input`, `scaffolded`, `independent`,
`transfer`, `reuse`, each naming one activity id). Every named activity has a
runner in the engine's own `fn activity_runner` table, and the reuse stage's
unit is phase-gated on the declaring unit through `requires_unit`
(ADR-0022, `state: supported`) — engine-real machinery, no invented interval.

| band | pack | representative goal | declaring unit | input → scaffolded → independent → transfer → reuse |
| --- | --- | --- | --- | --- |
| A2 | ru-RU | `ru.goal.a2.past-events` | `ru.unit.a2.jpast-01` (unit 810) | `u810-read` → `u810-cloze` → `u810-write` → `u811-speak` (unit 811, changed context) → `u812-write` (unit 812, gated) |
| B1 | ru-RU | `ru.goal.b1.practical-problems` | `ru.unit.b1.jprob-01` (813) | `u813-read` → `u813-cloze` → `u813-write` → `u814-speak` (814) → `u815-write` (815, gated) |
| B2 | ru-RU | `ru.goal.b2.style-register` | `ru.unit.b2.jstyle-01` (816) | `u816-read` → `u816-cloze` → `u816-write` → `u817-speak` (817) → `u818-write` (818, gated) |
| A2 | ja-JP | `ja.goal.a2.daily-admin` | `ja.unit.admin-bill-payment` (812) | `-enc` → `-cloze0` → `-write` (new independent stage) → `-scenario` (`scenario_id: ja.scenario.a2.admin.bill-payment`) → `…-rev-write` (new unit 826, gated) |
| B1 | ja-JP | `ja.goal.b1.work-professional` | `ja.unit.b1-work-notice` (820) | `-enc` → `-cloze` → `-write` → `b1-work-notice-call-scenario` (821, `ja.scenario.b1.office.notice-call`) → `…-rev-write` (822, gated) |
| B2 | ja-JP | `ja.goal.b2.film-analysis` | `ja.unit.b2-film-opinion` (823) | `-enc` → `-cloze` → `-write` → `b2-film-friends-scenario` (824, `ja.scenario.b2.film.movie-talk`) → `…-film-rev-write` (825, gated) |

Machine check (`state/evidence/UPPERBAND-TASK-JOURNEYS-001/audit-2026-10-18.txt`):

```
pack languages/ja-JP: 831 sentences in 4 file(s), 793 units; 92 finding(s)
Task sequences: declared 3, complete 3   band a2: 1 · b1: 1 · b2: 1
pack languages/ru-RU: 825 sentences in 3 file(s), 818 units; 35 finding(s)
Task sequences: declared 3, complete 3   band a2: 1 · b1: 1 · b2: 1
```

Engine-side proof (`a_declared_task_sequence_loads_and_names_a_runner_for_every_stage`,
`apps/desktop/src-tauri/src/lib.rs`): a fixture journey mirroring the 810/811/812
trio plans **byte-identically with and without** the `task_sequence` block (the
engine ignores the field — no `deny_unknown_fields` anywhere), and the planner
names runners `[encounter, cloze, typed, guided-speaking]` for the introducing
unit, `[encounter, guided-speaking]` for the changed-context unit and
`[encounter, typed]` for the gated reuse unit. The phase gate itself is pinned by
the ADR-0022 gate tests, not re-pinned here.

Learner surface (`apps/desktop/src/journeys/upperband-sequence.journey.tsx`,
real `<App/>`, only the engine under the IPC boundary replaced, fixture strings
mirrored verbatim from `sentences/journeys-2026-10-14.jsonl` rows 1–3,
`lexicon/pastevents.jsonl` and `grammar/concepts.jsonl` rows 26/27/166): unit
810's lesson names all six runners; the scaffolded cloze blanks the pack's first
declared `cloze_targets` entry `были`; the independent writing stage is a typed
card the app scores; the independent speaking stage offers **no submit control,
no verdict, no score**, answers with the aligner abstention and produces zero
`production-speaking` `practice_submit` calls; asking for `ru.sent.a2.j3` plans
unit 811, whose guided-speaking card presents both the new sentence and the
already-met `ru.sent.a2.j1` — the pack's changed-context claim at the surface a
learner sees. Unit 812 is gated and is never planned at this surface.

## Acceptance item 2 — `tools/audit_content_templates.py` is the machine check, and findings are reported even when unfixed

The tool gained `rule_task_sequences`, a `Task sequences:` section, the
`task_sequences` JSON summary (`counts.task_sequences_declared/_complete`,
`by_band`, `representatives` with all five roles) and a repeatable
`--require-band` (default `a2 b1 b2`). Finding families:
`task-sequence-incomplete`, `-unrunnable`, `-no-scaffold`,
`-no-context-change`, `-no-reuse`, `-missing-band`, `-unverifiable`.

The runner table is not restated: the rule imports `parse_runner_table` /
`runner_for` from `tools/measure_language_coverage.py` (ADR-0036), and if that
table cannot be parsed the rule degrades to one `task-sequence-unverifiable`
finding instead of failing CI.

Findings still report and CI still exits 0 with them present. Measured both ways
with the same tool (`--require-band a2 --require-band b1 --require-band b2`):
against the packs as they stood at `f4b9336` the new rule adds exactly three
findings per pack (`task-sequence-missing-band`, one per upper band) — ru-RU 38,
ja-JP 95; with the declarations above those six rows close and every other
finding is byte-identical (ru-RU 35: 3 leading-token, 23 skeleton,
9 identical-grammar-sets; ja-JP 92: 1 leading-token, 58 skeleton,
32 identical-grammar-sets, 1 `no-stage-progression`). The audit exits 0 either
way. The new families are wired into the reviewer worklist too: on a
deliberately broken fixture declaration the report prints

```
[task-sequence-incomplete] … role reuse names unknown activity id xx.act.a2.nope
[task-sequence-unrunnable] … role transfer activity xx.act.a2.match (match/reading) has no engine runner in activity_runner
[task-sequence-no-scaffold] … got independent support_level '1'
```

and `--write-review` emits each as a reviewable checkbox row; the per-band
absence finding is emitted once per band, never once per unit, so the ~1,600
units that declare no sequence do not flood the worklist. `tools/test_audit_content_templates.py`
grew to 27 tests (`Ran 27 tests … OK`) covering block-style parsing, the
string-valued (flow-mapping) case, each finding family, per-band dedup and the
rendered sections.

## Acceptance item 3 — authored content stays pending qualified human review, with no claim of a graded speaking stage

No review status, maturity, source or licence field was touched. The new pack
content carries the pack's honest provenance convention:
`languages/ja-JP/curriculum/units/826-admin-bill-payment-revision.yaml` opens
with `# ai-assisted draft unit (UPPERBAND-TASK-JOURNEYS-001 delayed reuse for A2
admin-bill-payment); content refs are pack data; qualified review pending.`, and
the retargeted stages sit in files that already declare `qualified review
pending`. `tools/audit_learner_copy.py` reports `40 source files scanned …
findings: 0`. The band review cards `JA-A2-002`, `JA-B1-002`, `JA-B2-002` stay
`blocked` and the Russian queue is unchanged (5 open items,
`BLK-REVIEW-CAPACITY`), so nothing here reads as certification.

Speaking stays formative: the changed-context and independent speaking stages use
the engine's `guided-speaking` runner only, no verdict and no mastery write, as
ADR-0017 requires; the journey asserts the absence of submit/score/verdict and
the existing engine test `a_speaking_attempt_is_refused_before_any_mastery_write`
still passes unchanged.

## Pack content that had to change, and why

Three RU families needed **no** content change — only the declaration was
missing, which is the evidence that the shape already existed. ja-JP needed the
sequence stages made true rather than decorative:

- `ja.activity.b1-work-notice-call-scenario`,
  `ja.activity.b2-film-friends-scenario` and
  `ja.activity.admin-bill-payment-scenario` moved from the runnerless
  `scenario`/`interaction` pair to `retrieval`/`speaking` (the engine's
  `guided-speaking`), keeping `support_level`, `scenario_id` and refs; the
  bill-payment one gained the four content refs its scenario's three nodes are
  about, so the speaking card has material.
- `ja.unit.admin-bill-payment` gained `ja.activity.admin-bill-payment-write`
  (`recall`/`writing`, `support_level: 0`) — the independent response the unit
  never declared.
- New gated unit `ja.unit.admin-bill-payment-revision` (826) holds the delayed
  reuse stage, reusing only unit 812's refs with `new_item_budget: 0`.

Those three retargets change what the app will do with those activities
(guided speaking instead of an unimplemented interaction), so they are
review-pending content changes, not silent repairs.

## Coverage re-measured, not hand-edited

`python tools/measure_language_coverage.py --pack languages/ru-RU --pack languages/ja-JP`
(2026-10-18): ru-RU unchanged — 818 units / 3,248 declared activities across six
`(type, modality)` pairs, 3,248 runnable, 3,248 servable, 1,630
scored-capable / 1,618 formative-only. The ja-JP control moved because of the
retargets and new content: **793 units, 3,034 of 4,591 runnable, 1,557 declared
without a runner, 118 blocked on missing media rows** (was 3,027 / 4,587 /
1,560). `docs/assessment/RELEASE_COVERAGE_RU.yaml`'s `control_pack` sentence was
rewritten from that run, and every number in the document was re-checked against
the fresh tool output: `checked 35 claims; MISSING: none`
(`coverage-crosscheck-2026-10-18.txt`). The five layers stay separate counts;
declared / runnable / servable / evidence / review posture were not summed, and
the new sequence summary is reported beside them, never merged.

## Gates run on this working tree (GamingPC)

- `cargo test -p lts-desktop` → **160 passed; 0 failed; 1 ignored** (489.87 s)
  on the final tree, one more than the `f4b9336` baseline of 159; the new test
  is `tests::a_declared_task_sequence_loads_and_names_a_runner_for_every_stage`.
- `cargo fmt --all --check` ok; `cargo clippy --workspace --all-targets -- -D
  warnings` → exit 0. Clippy caught one real thing in the new test
  (`needless_borrows_for_generic_args` on `serde_json::to_value(&plan(…))`),
  fixed locally before commit. Both runs are in `cargo-test-2026-10-18.txt`.
- `npx vitest run` → **33 files / 266 tests passed**; `npx tsc --noEmit` clean;
  `npx eslint .` clean; `npx vite build` ok (`web-gates-2026-10-18.txt`).
- `npx prettier --check .` → still red on exactly the six pre-existing files
  (`App.tsx`, `home.tsx`, `hub.tsx`, `journeys/harness.tsx`,
  `journeys/kanji-decomp.journey.tsx`, `kanji-decomposition.ts`). Verified the
  only violation prettier wants in `harness.tsx` is the pre-existing
  `pack.drills.filter(…)` hunk at line 1044; the new journey file is prettier
  clean.
- `cargo run -p lts-langpack-cli -- validate|lint|test` for both packs → `0 error(s), 0 warning(s)` each; `tools/audit_learner_copy.py` → `findings: 0` (`pack-gates-2026-10-18.txt`).
- `tools/validate_handoff.py --require-explicit-ledger-records` and `python -m unittest discover -s tools` → `handoff-gates-2026-10-18.txt`.

## Where the work ran

Audit rule and its tests: `lab_task` on **Omarchy** (inference GamingPC).
Rust fixture test: `lab_task` on **Omarchy**. Pack content: `lab_task` on
**Hermes worker**. Frontend harness extension and journey: `lab_task` on
**Hermes worker**. Design, ADR, docs, schema, integration of every returned
patch, the ledger record and all verification above: **GamingPC**, by the main
agent. Remote patches were never auto-applied; each was reviewed, applied with
`git apply`, and re-verified locally — including two local corrections the
remote patches needed: unit 811's two unmirrored lexicon refs (`byla`,
`работать`) added to the journey fixture so its refs resolve, and a clippy
`needless_borrows_for_generic_args` fix inside the new Rust test.

## Posture and owner items (unchanged, not fixed here)

- 5 open items in `languages/ru-RU/review/WORKLIST-2026-10-12.md`, 0 closed;
  `BLK-REVIEW-CAPACITY` still blocks band review, and a qualified human decision
  cannot be self-certified by an agent.
- `zalizniak-2010` is CC-BY-NC-4.0: accepted by `audit-licenses`, unusable for
  commercial distribution without an owner decision.
- `cargo run -p lts-langpack-cli -- test tools/pack-templates/example-pack` still
  fails with `error[media_manifest_absent]`; untouched (out of this card's scope).
- The six prettier-red files above are red at `HEAD` too; reformatting them is a
  separate owner-visible change, not smuggled into this commit.
- This card makes upper-band tasks exist and run. It does not enact depth: the
  audit still reports 400 ru-RU B2 units sharing one 2-element grammar set and
  the `это _` skeleton repeated 400 times.
