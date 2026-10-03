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

## Performance and native test contract

`PERF-001` defines `docs/performance/BUDGETS.yaml` before release measurement; `PERF-002` verifies it on each supported configuration. Freeze target hardware, test utterance lengths, warm/cold latency percentiles, RAM/disk ceilings, and UI responsiveness before comparing final providers. A task cannot invent a new threshold after seeing a failure.

Bootstrap must prove a packaged native-app test path on each desktop OS. Official [Tauri WebDriver documentation](https://v2.tauri.app/develop/tests/webdriver/) distinguishes the embedded WebdriverIO service from direct `tauri-driver`; backend/platform behavior must be tested without replacing critical services with browser mocks. Debug/test WebDriver plugins and IPC bypass hooks must be disabled or excluded in production artifacts. Record native driver, OS runner, and release-mode build details in platform evidence.
