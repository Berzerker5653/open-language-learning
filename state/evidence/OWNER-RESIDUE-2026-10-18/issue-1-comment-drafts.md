# issue #1 — evidence comments, ready to post (owner authorization required)

Nothing below is posted. AGENTS.md requires direct owner authorization for
external publication, and posting should follow the push: `main` is ahead 19, so
the SHAs these comments name do not exist on GitHub yet.

Checkbox advice: **R12 and R13 can be checked** by the owner against the evidence
below. **I04, I05 and I08 must stay unchecked** — each still has a human or
owner-gated half, and the drafts say so in their own words.

---

## R12 — Make higher-band tasks enact their stated goals

Closes the machine-checkable half. ADR-0037 adds an optional v0.2 unit field
`task_sequence` with five roles — `input`, `scaffolded`, `independent`,
`transfer`, `reuse` — each naming one activity id, and `tools/audit_content_templates.py`
now checks that claim against the engine's own `activity_runner` table
(ADR-0036; the table is imported, never restated).

Six representative goals now declare a complete, runnable sequence, one per upper
band per pack:

| band | ru-RU | ja-JP |
| --- | --- | --- |
| A2 | `ru.goal.a2.past-events` (unit 810 → 811 changed context → 812 gated reuse) | `ja.goal.a2.daily-admin` (812 → 812 → 812 → 812 scenario → new unit 826) |
| B1 | `ru.goal.b1.practical-problems` (813 → 814 → 815) | `ja.goal.b1.work-professional` (820 → 821 → 822) |
| B2 | `ru.goal.b2.style-register` (816 → 817 → 818) | `ja.goal.b2.film-analysis` (823 → 824 → 825) |

Measured, same tool both times (`--require-band a2 --require-band b1 --require-band b2`):
against the packs before the change the rule adds exactly three findings per pack
(`task-sequence-missing-band`); with the declarations those six rows close and
every other finding is unchanged — ru-RU 35, ja-JP 92, exit 0. `Task sequences:
declared 3, complete 3` per pack. Delayed reuse is not an invented interval: the
reuse unit `requires_unit`-gates on the introducing unit at `state: supported`
(ADR-0022), and a Rust fixture test asserts the engine ignores the field (plans
byte-identically with and without it) while naming a runner for every stage
(`encounter`, `cloze`, `typed`, `guided-speaking`). A mounted journey
(`apps/desktop/src/journeys/upperband-sequence.journey.tsx`) drives the real app
through the scaffolded cloze, the independent typed writing card and a speaking
card with no submit control and zero `practice_submit` calls, and shows the gated
unit is never planned early. Speaking stays guided and unscored (ADR-0017).

What this does **not** claim: depth. The audit still reports 400 ru-RU B2 units
sharing one 2-element grammar-concept set and the `это _` skeleton repeated 400×,
and all of the above content is `ai-assisted draft … qualified review pending`.
Expansion beyond these six representatives is human-review work (O-02), and
`JA-A2-002`/`JA-B1-002`/`JA-B2-002` stay `blocked`.

Evidence: `state/evidence/UPPERBAND-TASK-JOURNEYS-001/` (ACCEPTANCE.md, audit,
coverage cross-check, pack/web/cargo/handoff gate logs), commits `9ca19fd`,
`f4b9336`, `docs/adr/0037-pack-declared-task-sequences.md`.

---

## R13 — Separate assessment definitions from runnable valid assessments

The modality half closes. `fn activity_runner` in `apps/desktop/src-tauri/src/lib.rs`
is now the single table deciding whether a declared `(type, modality)` pair runs
and which runner serves it, and every pair the Russian pack declares has a route:
`encounter-read` → encounter, `cloze/writing` → cloze, `recall`/`retrieval` +
`writing` → typed, `recall/reading` → recall-meaning, `retrieval/speaking` →
guided speaking (records nothing, scores nothing), `listen-and-choose` →
`comprehension-listening`, so its evidence can be recorded at all. Measured:
ru-RU **818 units / 3,248 declared activities, 3,248 runnable, 0 refused**.
Dictation ASR language now comes from the pack manifest; a locale-less pack
abstains `pack-locale-unknown` instead of comparing Russian speech against
standard Japanese.

The counting claim was re-derived by a tool, not edited:
`tools/measure_language_coverage.py` reports declared / runnable / servable /
valid-evidence / review-posture as five separate numbers,
`docs/assessment/RELEASE_COVERAGE_RU.yaml` is generated from it, and a cross-check
of that document's prose against fresh tool output prints
`checked 35 claims; MISSING: none`. ADR-0036 makes the runner table the
denominator, and the content audit imports it rather than restating it.
`apps/desktop/src/journeys/ru-modality.journey.tsx` is the offline journey per
claimed modality, and each lesson stage now states the runner serving it.

Honest residue, still counted not smoothed: the ja-JP control pack has **3,034 of
4,591** activities runnable and **1,557** declared with no route, plus 118
blocked on missing media rows. Rubric rows remain rubric rows — ADR-0025 keeps
counts out of the depth claim, and the review queue stays open.

Evidence: `state/evidence/RU-MODALITY-PRACTICE-001/` (ACCEPTANCE.md,
`coverage-2026-10-18.txt`, cargo log), commit `f4b9336`,
`docs/adr/0036-engine-runner-table-as-the-runnable-practice-denominator.md`.

---

## I04 — Shorten user copy and complete state and accessibility feedback

Status comment; the checkbox stays open.

Engineering half landed and is pinned: the route-change effect now moves focus to
the destination route's own `h1` after scrolling, a no-pack Today withholds the
`Time budget` group, the `plan-summary` line (`0 activities · about 0 minutes`)
and the zero-count empty paragraph, and a mounted keyboard journey walks
Tab/Enter from the resume picker through a no-pack Today into Settings, Language
packs and Practice asserting the focus target at every stop. Stashing the two
source files makes that journey plus the extended `home.test.tsx` case fail
(**2 failed**), so the test exercises the behaviour rather than the fixture. The
automated matrix (`a11y.test.tsx`: naming, landmarks, live regions, AA contrast
math, reduced-motion/focus-visible) stays green and extended, never relaxed.

What keeps this open is not code: the screen-reader and IME-composition rows are
`HUMAN-ONLY` (O-03 / ACC-001). Measured today, no lab host has the assistive
technology installed — GamingPC (the only host with a graphical session, KDE on
Wayland) carries just `at-spi2-core`, Omarchy and the Hermes worker are `tty`-only
— so the single missing step is one owner command:
`sudo pacman -S --needed orca ibus ibus-anthy espeak-ng speech-dispatcher gnome-session`
(`ibus-mozc` is not in the enabled repos; `ibus-anthy` / `fcitx5-mozc` are).
Setup and log-capture detail is in `docs/21_HUMAN_REVIEW_RUNBOOKS.md` A.1–A.3;
the worksheet is `docs/assessment/ACCESSIBILITY_AUDIT.md`.

---

## I05 — Make installation feel bounded and recoverable

Status comment; the checkbox stays open until the numbers come from a released
artifact.

The behaviour half is implemented and measured in-tree: `engine-progress` carries
a fetch percent from the pinned `PackEntry.size_bytes`, while `verify` and unpack
are named as unmeasurable instead of faked; cancel is honoured at chunk, redirect
and phase boundaries and now reaches **inside unpacking**
(`install_with_cancel` consults the hook per archive entry and once more before
the store is touched), and because extraction is staging-then-rename an abort
leaves no version directory and never moves the `current` pointer. Interrupted
transfers resume: bytes stay in `partial-<key>.part` with a sidecar naming
url/sha256/size, the retry sends `Range: bytes=<n>-` and appends only on a `206`;
a `200` answer, a foreign or corrupt sidecar, or an oversized part restarts from
zero. The completed file is still checked against the pinned size and SHA-256
before the pack gate sees a byte, and an `InstallReceipt`
(pack/version/source host/sha256/size/capabilities) reaches the UI with Cancel and
Retry.

What stays open is exactly what the acceptance asked for and only a released
artifact plus a modest machine can give: install timing separated from compile and
resume on a published artifact, and the `low`-tier device budgets. That is
PERF-002, still `blocked`: `docs/performance/BUDGETS.yaml` is
`status: provisional`, `frozen: false`, only the `typical` tier is measured, and
the `high` tier cannot be measured against the **pinned CPU-only** aligner build
(`apps/desktop/sidecar/linux-x64/SIDECAR.yaml`: no `-DGGML_CUDA=ON`, ships
`libggml-cpu.so.0`) even though the lab now has a CUDA-capable GPU.

---

## I08 — Finish the existing release evidence against actual artifacts

Status comment; the checkbox stays open, and nothing in it can be closed by an
agent.

Machine-side, on record: clean-clone `scripts/ci.sh` returns `CI OK`; CI green on
the **pushed** `main` at `fd76786` (run 38757754128 — the 19 unpushed commits
have not been through CI); the 0.4.1 candidate archives carry member-level accounting against the
published 0.4.0 archives (`state/evidence/RC-0.4.1-2026-10-15/`); `cargo audit
--deny warnings` fails closed against `.cargo/audit.toml` (measured rc 1 with six
denied warnings, rc 0 with the allow-list in place); `validate_handoff.py
--require-explicit-ledger-records` passes over 1,961 data files; the pack gates
(`validate`/`lint`/`test`) report `0 error(s), 0 warning(s)` for both packs.

Blocked on owner action, each with the reason measured rather than assumed:
**platform runtime reports** — win/mac CI is compile-only, `platform-bundles` is
manual, unsigned and artifact-named `-UNTESTED-`, and
`docs/platform/PLATFORM_REPORTS.yaml` holds no Windows or macOS record, which
needs devices or runner spend plus a human report bound to the exact
`app_commit` and `pack_sha256`; **AT pass** — see the I04 comment, one package
install away and still `HUMAN-ONLY`; **the 0.4.1 republish question** (O-01/O-05);
**security disposition** (SEC-001); **performance tiers** (PERF-002 above);
**review capacity** — 5 open ru worklist items, 0 closed, all 120 rubrics draft.

One hygiene note for whoever reads this later: `main` is currently **ahead 19** of
`origin/main`, so any evidence posted before a push names commits that do not yet
exist publicly.
