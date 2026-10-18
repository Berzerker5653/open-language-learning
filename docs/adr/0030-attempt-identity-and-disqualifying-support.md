# ADR 0030: Attempt identity and disqualifying support

Status: Accepted (2026-10-17) — agent-authored; the owner signed the ADR on
2026-10-17. Implemented in `crates/learner-model/src/policy.rs`: attempt-group
collapsing and disqualifying-support filtering in `observations` (`:338`,
attempt key `prompt_family_id.unwrap_or(activity_id)` at `:366`), ladder
selection at `:388`, `derive` at `:487`, `epoch_seconds` at `:279`, and the
`disqualifying_for` vocabulary validation at `:185-197` — the last pinned by
`crates/learner-model/tests/policy.rs:117-126`, which shows a typo'd support
action and a non-canonical dimension key are both rejected.

Date: 2026-10-14

## Context

Review finding R04 measured a concrete anti-goal failure: a policy probe built
from the **real** desktop submission defaults reached `independent` after two
immediate repetitions of one deterministic task — including a repetition made
after the learner had pressed "Show reading". Three defects compounded:

1. `crates/learner-model/src/policy.rs` derived prompt identity as
   `prompt_family_id.unwrap_or(<event id>)`. The desktop submission paths
   (`practice_submit`, `writing_submit`, `placement_submit`) never set
   `prompt_family_id`, and each retry manufactures a fresh event id, so every
   repetition looked like a new prompt. The policy's `min_distinct_prompts: 2`
   gate was satisfied by the primary key.
2. Hinted writing recorded `support_level 1`, which the ladder accepts for
   `independent`. A disclosed answer cue (romaji substitution, a supplied
   reading) could therefore be counted as independent production.
3. Scenario evidence (R03, same identity family) built event ids from
   `scenario + node index` alone. `evidence.event_id` is a global primary key,
   so a second sitting of one profile, or a second profile doing the same
   scenario, appended **zero** rows while the UI reported completion.

Constraints: `docs/00_MASTER_SPEC.md` non-negotiables on anti-memorization
(capability must be demonstrated across varied prompts, and disclosed support
may not buy independence); `docs/03` requires mastery to stay derivable from
the append-only log, so identity must live in the evidence rows, not in
process state; the engine must stay deterministic and language-neutral.

Options on the table: derive session identity from the clock inside the engine;
treat repeated rows within a time window as one sitting; keep the event-id
fallback and raise the numeric thresholds instead; hardcode the disqualifying
support list in Rust.

## Decision

**Identity is an input to the engine, never a guess by it.**

- Prompt identity falls back to **activity/content identity, never the event
  id**: `Policy::observations()` records `prompt = prompt_family_id.or(activity_id)`
  and takes `family = prompt_family_id` only. A missing family no longer
  manufactures variety.
- The app supplies sitting identity. `apps/desktop/src/App.tsx` rotates one
  `crypto.randomUUID()` per presented plan (`planSessionRef`) and passes it to
  `practice_submit`, `writing_submit`, `placement_submit`; the engine builds
  `attempt_group = "{session}:{content_id}"` so retries inside one sitting
  collapse into one observation while a genuinely later sitting is a new one.
  Scenario runs take a `uuid::Uuid::new_v4()` at `scenario_start`;
  `crates/activity/src/scenario.rs` stamps `session_id` on the session and the
  outcome, and emits event ids `{scenario}:{session}:node:{i}` with attempt
  groups `{scenario}:{session}:{node_id}`. `finish_at` turns a `false` from
  `append_evidence` into an error: an unrecorded attempt is never a success.
- **Disqualifying support is declared data.** `docs/assessment/MASTERY_POLICY.yaml`
  is now `policy_version: "0.2.0"` and carries
  `support.disqualifying_for: {dimension: [action, …]}`. Evidence rows gained
  `FixEvent.support_actions` and `Obs.support_actions`; `observations()` drops
  an observation whose recorded actions intersect the list for that dimension
  **before** attempt-group collapse, so "answered it after seeing the romaji"
  cannot be laundered into an independent success.
- **One vocabulary.** The recorded action names are the constants in
  `crates/domain/src/mastery.rs::support_actions` (19 of them, `ALL`);
  `SupportAction::label()` in `crates/activity/src/support.rs` returns those
  constants; `Policy::validate()` rejects any dimension key outside the
  dimension enum and any action name outside `ALL`. A policy file that names a
  support action the runtime never emits fails to load instead of silently
  matching nothing. `romaji-revealed` was renamed to `romaji-substitution` to
  put the runtime and the policy on one spelling.

## Consequences

- Real desktop submissions now record the metadata the anti-memorization
  fixtures always claimed: prompt family, attempt group, actual support level
  and support actions, and assessment kind.
- **Measured consequence, and the reason two follow-ups exist:** with prompt
  identity taken from real activity/content identity, every
  `(content, dimension)` pair the current desktop task generators build has
  exactly **one** prompt. `independent` (≥2 distinct prompts) and `flexible`
  (≥2 prompt families plus transfer/checkpoint evidence) are therefore
  **unreachable through today's desktop tasks** — the number was reachable
  before only because the event-id fallback invented variety. Closing that gap
  is `ACTIVITY-MODEL-001` (per-stage activity and prompt identity) together
  with `RU-GOAL-PREREQ-001`; a diagnostic placement sample now caps at
  `supported`, and K-15's old claim that placement could satisfy
  `independent` prerequisites was false and is corrected in code comments.
- Verification this change shipped with: three new policy fixtures
  (`same-prompt-retry-cannot-reach-independent`,
  `disqualifying-support-blocks-independent`,
  `immediate-retry-counts-as-one-observation`) under
  `tests/fixtures/policy/` plus `docs/assessment/MASTERY_POLICY.yaml`;
  `crates/learner-model/tests/policy.rs` pins the version and rejects typos in
  dimension and action names; `crates/activity/tests/scenario.rs` adds
  `replaying_a_scenario_is_a_separate_sitting`; `cargo test -p lts-desktop
  --lib -- scenario` exercises the app boundary (4 interaction rows, 4 distinct
  attempt groups for one sitting).
- Harder: replay-deduplication now depends on a session id supplied by the
  caller, so any new surface must pass one (the engine will not invent it);
  older evidence rows keep their old support spellings and were not rewritten
  (evidence is append-only).

## Alternatives considered

- **Clock-derived session ids inside the engine.** Unique per call, so nothing
  ever collapses: it reproduces the exact defect it was meant to fix.
- **Time-window heuristics** ("attempts within 5 minutes are one sitting").
  Non-deterministic, unverifiable from the log, and it guesses the learner's
  behaviour; `docs/03` wants derivation, not inference.
- **Keep the event-id fallback and raise thresholds** (`min_distinct_prompts: 3`).
  Leaves the mechanism intact: manufactured variety still counts.
- **Hardcode disqualifying support in Rust.** Hides a pedagogical policy from
  the versioned policy file that owns every other threshold, and removes the
  ability to widen a dimension's protection without a rebuild.
