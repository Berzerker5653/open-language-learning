# O-06 hands-on pass — what was run, and what it proved

Date: 2026-10-08. Findings under review: `owner-report.md` (same directory).
Every number and marker below came from a command run on the Gaming PC
(`ref-dev` tier: AMD Ryzen 9 5950X, RTX 5090, DDR4-3200, NVMe) in this
session; nothing here is inferred from reading code.

## Commands and results

| Check | Result |
| --- | --- |
| `cargo test -p lts-desktop --lib` | **94 passed, 0 failed** (81 at the start of this tranche; the additions: 3 pack-install stage sequences, 1 model-install stage/percent sequence, 2 progress wire-shape, 1 pack-cache version-key invariant, 1 claim-report trust-change, 1 lexicon version-key invariant, 1 warm-on-install, 1 failed-prime-caches-nothing, 1 unit/assessment version-key invariant, 1 writing-target version-key invariant) |
| `cargo test -p lts-storage` | green (repeat-mine `was_new` behaviour) |
| `cargo test -q -p lts-langpack -p lts-storage` | green — 4/8/7/2/3/4/4/3/6/13/3/37/8/2/4/8 passed, 0 failed |
| `cargo run -p lts-langpack-cli -- validate languages/ja-JP` and `languages/ru-RU` | `0 error(s), 0 warning(s)` each; the 8 `media_item_without_reading` infos remain (contrast items with no declared reading — human linguistic work, K-65) |
| `cargo fmt --all --check` | clean |
| `apps/desktop: ./node_modules/.bin/tsc --noEmit` | clean |
| `apps/desktop: ./node_modules/.bin/vitest run` | 15 files, 147 tests passed (added `progress.test.ts`, plus progress-line assertions in `onboarding.test.tsx` and `language.test.tsx`, plus the `#mic-detect` assertion in `settings.test.tsx`) |
| `./scripts/smoke-desktop.sh` | `SMOKE OK (13 routes walked)` — includes the K-60 scenario click, the K-64 `mic-picker:present` check, the K-62 `progress:prepare|install|record:heard` checks, the K-63 timing report and the K-63b leave-and-return probe |

The last run's full report (every route in one pass, the warm commands in the
order a learner makes them, and the leave-and-return probe):

```
route timings: Practice 80 Progress 93 Pronunciation 88 Speaking 62 Writing 46
               Languages 46 Scenarios 45 Shadowing 47 Reading 46 My Words 63
               Placement 46 Kanji 78 Settings 93
warm command costs: installed_packs 1 pack_claims 1 catalog_packs 1 available_models 0
                    tts_status 1 aligner_status 0 scenario_list 12 home_state 60
                    active_pack 1 placement_plan 1 kanji_list 4 goal_map 12
                    practice_plan 60 writing_task 1
return-visit cost: Languages 80
```

The smoke run walks the real window under Xvfb: onboarding → profile →
install of the 77 MB `org.openlanguage.ja-jp.reference` pack → all 13 tabs →
a scenario row click → Start. Markers are written by the renderer over real
IPC, so a green run means the frontend received the native payloads, not that
a unit test liked them.

## K-62 — progress events, proven live

The walkthrough records every `engine-progress` payload the renderer actually
received and reports each expected stage by name; the script fails the run if
one is missing. Last run:

```
smoke-ok progress:prepare:heard
smoke-ok progress:install:heard
smoke-ok progress:record:heard
```

What that does **not** prove: the model-install progress path was not exercised
live (no network in this environment, and the two TTS payloads are
deliberately unpublished). It is pinned instead by
`a_model_install_reports_completed_bytes_and_nothing_invented`, which asserts
the emitted sequence is `fetch 0% → fetch 50% → record` — percentages that come
from whole pinned files already on disk, never from a file still in flight.

## K-63 — measured before and after

`call-ms:` markers are warm calls made in the order a learner would make them.
Before any caching (first instrumented run):

```
installed_packs 2   pack_claims 431  catalog_packs 1   available_models 0
tts_status 1        aligner_status 1 scenario_list 550 home_state 256
```

After `packcache` (parsed pack + activity runtime per immutable version
directory) and the per-pack-root claim memo:

```
installed_packs 1   pack_claims 1    catalog_packs 1   available_models 1
tts_status 1        aligner_status 1 scenario_list 11  home_state 250
```

Tab-switch cost, measured click → painted in the same window (K-63: pack +
activity-runtime caching):

| tab | before | after caching |
| --- | --- | --- |
| Scenarios | 575 ms | 43 ms |
| Languages | 480 ms | 465 ms |
| Placement | 238 ms | 238 ms |
| Writing | 127 ms | 126 ms |
| Settings | 93 ms | 92 ms |
| Reading | 45 ms | 46 ms |

So the pack re-parse was the whole Scenarios cost and none of the Languages
cost. With `pack_claims` at 1 ms, the remaining ~465 ms of the Languages
switch is renderer work, and re-committing the Languages state in one batch
instead of eight sequential IPC round trips moved it 480 → 465 ms, i.e. the
round trips were not the problem either. That finding, not a guess, is what
K-63-follow now names.


**A hypothesis, then a measurement that refuted it.** The leading explanation
was the unconditional `WEBKIT_DISABLE_DMABUF_RENDERER=1` the app now sets for
every process (the K-56 blank-window fix): all painting is software, so the
panel must be slow to paint. Running the same walkthrough with that variable
exported to `0` before launch — the app leaves an operator value alone — measured
the Languages tab at **484 ms instead of 465 ms**. The renderer path is not the
cause, and the fallback stays unconditional.

What the cost actually was: a **cold process paying one parse**. Leaving the tab
and returning to it measured **81 ms against 460 ms**, with every command behind
it at ~1 ms — the difference was priming, not painting. So `lexicon_entries` is
now memoized per immutable version root (`LEXICON_CACHE`), and installing a pack
— or starting the app with packs already installed, on a background thread while
the window comes up — primes the parsed pack, its activity runtime, its lexicon
and its claim tallies (`warm_pack` / `warm_installed`). The same walkthrough
afterwards:

```
route timings:  … Languages 63 …
warm command costs: installed_packs 1 pack_claims 1 catalog_packs 1 available_models 1
                    tts_status 1 aligner_status 1 scenario_list 12 home_state 62 active_pack 1
```

Languages first visit **460 → 63 ms**; `home_state` **249 → 62 ms**. What is
left in `home_state` is store reads and plan assembly, not pack parsing.

The same markers then named the last two parse-per-call costs, and the same
invariant removed them: curriculum units and assessments — ja-JP declares 774
unit YAML files — are parsed once per version root (`pack_units` /
`pack_assessments`, primed by `warm_pack`), and the pack-derived writing target
list is built once per root (`WRITING_CACHE`). `placement_plan` went **421 → 1 ms**
with the Placement tab at **447 → 45 ms**; `writing_task` went **99 → 1 ms** with
the Writing tab at **126 → 46 ms**. The run quoted at the top of this file is the
state after that work.

One attempt paid nothing and was reverted rather than kept: memoizing the raw
text of every pack directory, keyed by `(version root, directory)` and primed at
install, left `writing_task` at 99 ms, `practice_plan` at 62 ms and the Writing
tab at 126 ms. That is the measurement showing the cost was per-call JSON parsing
of thousands of rows rather than file reading, so the read path went back to a
plain `fs::read_to_string` and the caches hold parsed values.

Two other effects of the same instrumentation: StrictMode was running the whole
walkthrough twice per launch (dev builds invoke mount effects twice), which both
doubled the smoke wall time and made the 90 s app timeout marginal — guarded by
a module-level flag, run time 103 s → 44 s; and the 3 s per-route figure in the
script is labelled a **stall guard**, not a performance budget, because the
interactive budgets in `docs/performance/BUDGETS.yaml` are still `provisional:
false` and PERF-001 forbids inventing a threshold after seeing a failure.

## Still unproven or unmeasured

- Settings scroll cost and the record-stop → file-shown gap: the walkthrough
  cannot drive a scroll or a microphone, so both stay numbers-free.
- `home_state` and `practice_plan` keep ~60 ms warm each: store reads and plan
  assembly, named but not worth a change at the navigation floor below.
- Screen-reader announcement of the new progress line (O-03 is a human AT run).
- Any tier other than `ref-dev`: every figure above is the development
  machine; `BUDGETS.yaml` is not frozen, so no gate here is a support target.
- Below ~80 ms nothing is separable with this harness: a leave-and-return that
  makes no engine call measures ~80 ms, so tab figures near that are the
  walkthrough's own floor, not the engine's.
