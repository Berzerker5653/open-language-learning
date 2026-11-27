# G4-EXPLAIN-001 — instant explanation, first step (AI-001 slice)

Source: 2026-11-23 scope decision (tasks/KANBAN.md): G4 and G1 prioritized; "G4 — instant grammar
explanation ... lands before G1 ... Smallest first-step." Owner-locked posture: explain is
information only — never a grade, never mastery or scheduler evidence. Local model by default;
cloud only by explicit user-configured endpoint with an acknowledged privacy notice.

Parent ROADMAP card: `AI-001` (Optional constrained AI conversation/explanation provider,
required_for_desktop_1_0: false). This card is the first agent-doable slice: provider interface +
explain control on ONE surface (activity/exercise cards). No measurement exists yet — there is no
AI/provider plumbing in `apps/desktop/src-tauri/src` (verified 2026-11-26 by grep).

## Scope (this card, frozen)

1. **Provider interface (Rust, lts-desktop):** an OpenAI-compatible chat-completions client behind
   a feature-off-by-default setting: `ai_enabled` (bool, default false), `ai_base_url` (string,
   default empty — no lab ports baked in; the user pastes their endpoint), `ai_model` (string).
   No cloud vendor name, key handling, or upload path beyond the raw base_url the user typed.
2. **Consent gate:** the first explain attempt opens an in-app notice stating exactly what is sent
   (the current card's text + the L1/L2 direction). Consent is stored in settings and revocable
   there. No transcript or explanation is persisted to any ledger/scheduler store.
3. **UI:** an Explain affordance on the activity/exercise card that calls the provider and renders
   an L1-only explanation panel framed as information. When `ai_enabled` is false, the base URL is
   empty, or the request fails: an honest "explanation unavailable" state — the app behaves exactly
   as today (AI-001 acceptance: core works with provider disabled).
4. **Hard invariant:** no explanation output may reach the scheduler, mastery, or any
   scored-advancement path. Pin this with a test (the explain command does not write
   progress/practice/scheduler tables or call any plan-affecting function).

## Out of scope (later slices)

Reader/lesson/path surfaces; G1 conversation loop; voice input; polish of cloud-provider setup
beyond the raw base_url field; any scoring or correction semantics.

## Acceptance (agent-measurable)

- Core app unchanged with provider disabled: existing vitest suite green; explain affordance shows
  the honest unavailable state (red-first vitest pin).
- First explain requires consent; consent stored + revocable (vitest pin against the settings
  store; a mock HTTP server answers the provider call — no external network in tests).
- No-mastery-path test: the explain request path performs zero writes to scheduler/progress
  stores (contract test).
- `npx tsc --noEmit` and `npx vitest run` green; `cargo fmt --all --check`,
  `cargo test -p lts-desktop`, `cargo clippy -p lts-desktop --all-targets -- -D warnings` green.
- Ledger commit: task-state + KANBAN.md row + `state/evidence/G4-EXPLAIN-001/gates.log`.

## Worker notes

- New files expected: a provider module under `apps/desktop/src-tauri/src` (e.g. `explain.rs`) +
  its settings keys + the UI affordance. Grep the settings store pattern
  (`markSettingsSaved`-style helper) before wiring — a shared save helper exists per
  lts-concurrent-lane-commits history; route through it.
- If live local-model verification against a real endpoint is impossible in this environment,
  record it as `deferred` in gates.log and rely on the mock-server tests — never claim a live
  model round-trip that did not run.
