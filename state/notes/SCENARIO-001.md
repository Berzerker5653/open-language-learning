# SCENARIO-001 — data-driven scenario/dialogue runtime

Date: 2026-10-03. Evidence: `state/evidence/SCENARIO-001/{cargo-test,ci}-2026-10-03.txt`.

## What was built

- Schema: `schemas/v0.2/scenario.schema.json` nodes gain an optional
  `recovery` array (`{id, prompt, expected_actions, to?}`) — additive,
  optional, documented in `docs/adr/0006-scenario-recovery-branches.md`
  (docs/04 is provenance-locked; ADR is the required schema-change doc).
- `crates/activity/src/scenario.rs` — `ScenarioSession` executes the
  pack graph: `begin` at first node; `attempt(intent)` matches against
  pack-declared `expected_actions` (empty = free navigation); success
  follows `next` edges (`Advanced`/`Completed`); a failed intent returns
  `NotSatisfied { recovery: [...] }` naming the node's pack-declared
  recovery branches; `enter_recovery` + resolving intent follows the
  branch's `to` edge; `use_support(level)` accepts only levels declared
  in the scenario's `support_ladder`; `complete_transfer` accepts only
  pack-declared transfer variants and enforces
  `transfer_variants_required`; `finish` yields per-node records
  (support level, attempt count) and `evidence_events` emits one
  interaction-modality scored `EvidenceEvent` per node with attempt
  groups.
- Fixtures: `valid-full` scenario extended to 2 nodes + recovery branch;
  new `ja-curriculum-draft/activities/scenarios/service.yaml` (B1
  service encounter, ladder 0/2/4, station transfer variant).

## Acceptance mapping

1. **Intents, support ladder, recovery branches, transfer variants** —
   `scenario.rs::graph_supports_intents_ladder_recovery_and_transfers`:
   wrong intent → NotSatisfied naming the pack recovery id; recovery
   branch has its own prompt/intents and returns via its `to` edge;
   ladder rejects undeclared levels (3 ok, 5 rejected); undeclared
   transfer rejected, declared one satisfies the requirement.
   `evidence_events_record_support_per_node` shows per-node support in
   evidence.
2. **No Japanese-specific branch logic** —
   `runtime_is_language_agnostic`: the identical code path drives the
   Spanish (valid-full) and Japanese (ja-curriculum-draft) scenarios —
   same step shapes, same recovery mechanics, all decisions from pack
   data. No language literals exist in `scenario.rs`.

## Verification

- `cargo test -p lts-activity`: 13 tests green (3 new scenario).
- `cargo test --workspace`: 142 passed; langpack validators still clean
  with the extended scenario schema and new fixture scenario.
- `./scripts/ci.sh` exit 0 (fmt, clippy -D warnings, tests, web fmt,
  tauri smoke, python validator, 44 mutation tests OK).
- `--release-readiness` unchanged: expected owner blockers.

## Known limits

- Node advancement follows the first `next` edge (single success path);
  multi-outcome branching per intent can be layered later without
  schema change.
- Session persistence/resume ("Continue adventure") is M4-E2E/UX-002
  scope; the session is serializable-ready via `ScenarioOutcome`.
