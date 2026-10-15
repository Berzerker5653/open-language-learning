# 07 — Technical Architecture

## Recommended baseline

Use a local-first monorepo with a shared web UI and native application shell.

Recommended starting stack:

- UI: React + TypeScript (or equivalent strongly typed web UI; record ADR if changed);
- build tooling: Vite-class frontend tooling;
- native shell: Tauri 2;
- native/domain services: Rust;
- local DB: SQLite with migrations;
- schemas: JSON Schema 2020-12 + generated TS/Rust types where practical;
- package manager: pnpm-class workspace tooling;
- testing: unit + component + Rust tests + end-to-end desktop tests;
- CI: GitHub Actions.

Choose current stable versions at bootstrap and record them; do not blindly pin versions from this specification months/years later.

Tauri 2 currently supports a shared application approach across Linux, macOS, Windows, Android and iOS with web frontend technology and Rust/native integrations. Desktop is the first release target; mobile follows after core stability.

## Proposed monorepo

```text
apps/
  desktop/              # Tauri shell + shared UI host
  web/                  # optional reduced-capability PWA later
packages/
  ui/                   # reusable UI components
  learner-ui/           # learning/session screens
  scenario-ui/          # scenario renderer
  schemas/              # generated TS schema bindings
  shared/               # platform-neutral TS utilities
crates/
  domain/               # IDs, events, mastery domain types
  learner-model/        # evidence -> mastery derivation
  scheduler/            # session planning + memory scheduling
  langpack/             # load/validate/query pack model
  langpack-cli/         # authoring/build CLI
  storage/              # SQLite repositories/migrations
  speech-api/           # provider contracts
  speech-runtime/       # selected local provider adapters
  audio/                # capture/processing abstractions
  security/             # pack sandbox/signature/hash validation
languages/
  ja-JP/
schemas/
tools/
tests/
```

Actual code directories may evolve through ADRs, but separation of domain, language packs, speech providers, persistence, and UI is mandatory.

## Dependency rule

Core domain must not import Japanese pack code.

Desired dependency direction:

```text
UI -> application services -> domain interfaces
                         -> storage adapters
                         -> speech adapters
                         -> langpack loader

language packs -> schemas/data only
```

Avoid circular dependency between UI and domain.

## Domain boundaries

### Learner/Profile

Preferences, goals, accessibility, selected packs/models.

### Curriculum

Read-only logical graph from language pack.

### Evidence

Append-oriented learner interaction records.

### Mastery

Derived state/confidence.

### Scheduler

Computes due work and session plan.

### Activity Runtime

Executes deterministic activity templates and emits evidence.

### Scenario Runtime

Executes dialogue/world graphs with support levels.

### Speech

Provider abstractions and normalized results.

### Pack Management

Install, validate, activate, upgrade, rollback.

## Data/event approach

Do not make mastery percentage the only stored truth. Persist evidence events and algorithm/version metadata. Derived caches may be recalculated.

## Determinism

Given the same pack version, learner evidence, scheduler version, and random seed, core planning should be reproducible enough for tests/debugging.

## Randomness

Inject seeded RNG for activity variation. Never rely on global nondeterministic randomness in tests.

## Pack loading

1. verify archive integrity/path safety;
2. parse manifest;
3. check engine/schema compatibility;
4. validate schemas;
5. validate referential integrity;
6. validate content hashes;
7. store/install in isolated pack directory;
8. build/query indexes;
9. activate atomically;
10. preserve rollback to previous compatible version.

## Offline models

Model manager stores model metadata separately from packs. A pack requests capabilities, not a hardcoded binary. Provider resolver selects an installed compatible implementation/model.

## Optional server/sync

Do not build a server into the MVP core. First deliver local export/import. If sync is later added:

- encrypted transport;
- explicit account opt-in;
- conflict-safe event synchronization;
- end-to-end/private design evaluated before implementation;
- local use remains fully functional.

## AI runtime

The core product must work without an LLM. Optional AI provider interfaces may support:

- conversation partner;
- adaptive explanation;
- safe exercise generation;
- content-author tooling.

All AI generation used for scored activities needs a validation strategy. Never send microphone audio/transcripts to an AI provider without explicit provider/privacy configuration.

## Update strategy

Application, language packs, and model bundles are independently versioned. A new Japanese curriculum must not require an app release unless it needs new engine capabilities.

## Performance

- UI must not block on model inference;
- use background worker/native task execution;
- lazy-load large language/model indexes;
- cache derived pack indexes with version/hash keys;
- keep base install small by downloading optional model bundles;
- benchmark low/medium/high desktop tiers before release.

## Platform support order

1. Linux development reference environment;
2. Windows and macOS desktop release parity;
3. Android/iOS spike and model-performance evaluation;
4. mobile release;
5. web/PWA capability subset if useful.

Do not call a platform supported until automated build/install and critical-path tests pass on that platform.

## Native privilege and provider isolation

The web UI is outside the native trust boundary. Define least-privilege Tauri capabilities and command scopes; validate every command argument and profile/pack ID in the native service. Do not give rendered pack markup or remote content direct filesystem, network, shell, database, or provider-secret access. Pack markup uses a restrictive content policy, sanitized text, scoped asset URLs, and no automatic remote fetches. Native commands must not accept arbitrary paths from pack content. See the official [Tauri security model](https://v2.tauri.app/security/).

Use bounded asynchronous queues, cancellation/timeouts, and recoverable provider restarts for inference. Model activation must reject unsupported file formats and verify authenticated metadata plus hashes before parsing. Never deserialize a model format that can execute serialized arbitrary code from an untrusted pack. Provider failure or missing hardware produces an explicit unavailable/guided path; it cannot trigger cloud fallback.

## Progress reporting for long operations

A language-pack install or speech-model download runs long enough that a silent window reads as a dead button. The native side therefore reports the phase it is entering on one Tauri event channel, `engine-progress`, carrying `{operation, subject, stage, percent}`:

- `stage` is a phase the engine really enters: `prepare` (build the archive from pack source files), `fetch` (download), `verify` (check it against the hash the catalog pinned), `install` (unpack and validate through the pack gate), `record` (write the install or model record), or the terminal `cancelled` (an operation a cancel stopped). A stage is emitted before the work it names, a stage that never ran is never announced, a failed `verify` ends the sequence there — the learner is never told content is being unpacked after the checksum already rejected it — and a cancel announces `cancelled` instead of pretending a later phase ran.
- `percent` is present only when a fraction of finished work is genuinely known. Model manifests pin every file's size, so the share of bytes already fetched and verified is exact. A pack download's pinned catalog entry pins the archive size, so the fetch percent is bytes actually read over that pin: it advances only on measured bytes, never within one in-flight read beyond what arrived, and never reaches 100 unless the pinned bytes did. `verify`, `install` and `record` are single-pass with no known fraction and report none — naming the phase instead of inventing a number.
- The renderer maps stage names to plain-language copy in an `aria-live="polite"` line, shows a percentage only when the engine sent one, and never advances an indicator on a timer. Losing the event channel is never an operation error: progress is a nicety, the operation still reports its own failure.

The contract is tested on both sides: the desktop crate pins the stage sequence for each path (catalog install, local import, model install with its real percentages), the bytes-measured fetch fraction, the cancel boundaries, the receipt payload and the event field names, because the renderer reads them by name; the desktop smoke walkthrough asserts the renderer actually received the pack-install stages over the live channel.

### Cancel, retry and the install receipt

`cancel_pack_install(pack_id)` sets a per-operation flag the running install consults at every read-chunk boundary of the download and at every phase boundary before it verifies or unpacks; the control is offered in the UI only while the engine can still honor it. A cancelled install leaves the store exactly as it was — unpacking is atomic into `<data>/packs/<pack-id>/<version>/`, so a half-installed version is never visible — and fails with the fixed reason `install cancelled`. The renderer turns that into a distinct state from a failure: nothing was installed, and because partial-byte resume is not implemented, installing again re-downloads from the start; the copy says so. Any failed install (cancel or otherwise) keeps the install button as a retry that re-runs the whole operation, and the failure reason is shown verbatim, never styled over.

A successful catalog install returns an `InstallReceipt` with the installed record: pack id, version, the catalog entry's source URL and host, the SHA-256 computed over the fetched bytes and matched against the pin, the size that actually arrived, and the `capabilities` keys the installed manifest itself declares true — an absent manifest yields nothing, and the receipt can never grant a capability the pack did not declare. The renderer shows it as a receipt under the progress region.

## The plan is one bounded session, and Progress leads with can-do

Decided 2026-10-15 (GUIDED-SESSION-001, CANDO-PROGRESS-001). Both are renderer
contracts; the planner and the mastery policy are untouched.

**Home offers one begin action for the whole plan**, not a launcher per task.
`home.tsx` renders "Start today's plan — N activities, about M minutes" with
the exit named beside it ("You can stop at any point: what you finish is
saved, and the rest stays on your plan"). `App.tsx` (`startSession`,
`advanceSession`, `pauseSession`, `resumeSession`, `closeSession`) walks a
snapshot of the plan taken when the learner begins, so the `practice_plan`
re-plan that follows every activity cannot move the goalposts under "3 of 5".
Pause leaves the runner and the hub states what is left; Resume reopens the
interrupted activity. The end reports plain counts — "Session finished — 2 of
2 activities", or "Session stopped after 0 of 2 activities. The rest is still
on your plan." — and activities this build has no practice screen for are
named as such and never counted as done. The per-activity buttons stay, under
"Or do one activity on its own": the queue is demoted, not removed. No reward
surface appears anywhere in the flow (ADR-0002). A session is for one run of
the app: it is not persisted across restarts, and no copy claims otherwise.

**Progress answers in the learner's order.** `CanDoSummary` (same file) renders
what the learner can do now — the pack's own goal text for the modalities whose
engine state is `supported` or `independent` — then what changed (the
scheduler's own `needs_refresh` flag, not an invented diary), then what to do
next (the pack's next declared goal), each abstaining instead of guessing.
Internal ids, confidence, and mastery labels remain below it in `ProgressView`
under a heading that says they are detail. The goal map and the detail table
lost their `<h1>`s so the page has exactly one heading at the top, which the
accessibility audit asserts.

**The headless walkthrough guard is branch-local.** The boot effect's
once-per-process `walkthroughRan` flag now guards only the smoke branch, so a
StrictMode dev remount still reaches the returning-profile resume instead of
being stranded at the wizard.

## Installed pack versions are immutable, and the app relies on that

Installing writes `<data>/packs/<pack-id>/<version>/` in full and only then moves the `current` pointer; nothing edits a version directory afterwards. That invariant is what lets the desktop process keep one parsed pack and one activity runtime per version directory (`apps/desktop/src-tauri/src/packcache.rs`) instead of re-reading thousands of files on every command — measured on the reference machine at ~550 ms per Scenarios open and ~430 ms per Languages open before any caching existed. The same rule licenses a per-version memo of the content-derived claim tallies. Nothing store-backed is cached: install records, trust state and mastery are re-read on every call, so no cached value can freeze a trust decision, and the claim test asserts that changing an installation's trust state changes what is reported even on a memo hit.

The consequence for future work: never mutate an installed version directory in place. Ship a new version. `packcache`'s test checks that two version directories of the same pack are never served from one parse.

The same invariant also licenses sharing parsed pack content across calls, all of
it added after measurement rather than by intuition. The lexicon parse is shared
per version directory (`LEXICON_CACHE` in `apps/desktop/src-tauri/src/lib.rs`),
because `home_state`
was paying ~250 ms on every Home visit to re-read 3,920 rows for display names
that cannot change under a running app. The same treatment then took out the two
next slowest surfaces: curriculum units and assessments (the reference pack
declares 774 unit YAML files) are parsed once per version root
(`pack_units`/`pack_assessments`), which took `placement_plan` from 421 ms to
1 ms and the Placement tab from 447 ms to 45 ms; and the writing target list is
pack-derived, so it is built once per version root (`WRITING_CACHE`), which took
`writing_task` from 99 ms to 1 ms and the Writing tab from 126 ms to 46 ms.
Installing a pack — or starting the app with packs already installed, on a
background thread while the window comes up — *primes* those caches
(`warm_pack`/`warm_installed`), because the expensive part was never the repeated
work but the first visit: measured at 460 ms cold against 81 ms warm for the same
tab in the same process, and 63 ms once priming existed (`home_state` fell from
249 ms to 62 ms with the lexicon memo). Priming is best-effort and never changes
what a command returns; a pack that cannot load stays uncached so the command
that needs it reports the real error.

One attempt did not pay and was removed rather than kept: a memo of the raw text
of each pack directory, keyed by `(version root, directory)`, moved **no**
measured number — `writing_task` stayed at 99 ms, `practice_plan` at 62 ms, the
Writing tab at 126 ms. That is the evidence that the cost was per-call JSON
parsing of thousands of rows and not file reading, which is why every cache here
holds parsed values and the read path is a plain `fs::read_to_string` again.

The consequence for tests is the same rule: a test that writes new files into an
installed version directory and then expects the app to see them is asserting a
thing the product cannot do. Two tests did that; both now join their content to
the pack before installing it, which is also how the pack builder gets to reject
content the app's tolerant reader would have accepted.

## Performance and native test contract

`PERF-001` defines `docs/performance/BUDGETS.yaml` before release measurement; `PERF-002` verifies it on each supported configuration. Freeze target hardware, test utterance lengths, warm/cold latency percentiles, RAM/disk ceilings, and UI responsiveness before comparing final providers. A task cannot invent a new threshold after seeing a failure.

Bootstrap must prove a packaged native-app test path on each desktop OS. Official [Tauri WebDriver documentation](https://v2.tauri.app/develop/tests/webdriver/) distinguishes the embedded WebdriverIO service from direct `tauri-driver`; backend/platform behavior must be tested without replacing critical services with browser mocks. Debug/test WebDriver plugins and IPC bypass hooks must be disabled or excluded in production artifacts. Record native driver, OS runner, and release-mode build details in platform evidence.
