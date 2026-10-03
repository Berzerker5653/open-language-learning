# PACK-002 notes — cross-file ID and curriculum graph validator

## What shipped

- `crates/langpack/src/graph.rs`: prerequisite graph built from goal
  prerequisites (0.1 bare ids / 0.2 records), 0.1 concept prerequisites,
  and the optional `grammar/dependencies.yaml` mirror
  (`prerequisite_edges: [{from, to}]`).
  - Cycles: iterative DFS, back-edge extraction; diagnostic
    `prerequisite_cycle` (Error, both modes) carries the full cycle path
    `a -> b -> a`.
  - Mirror consistency: set equality between mirror edges and authoritative
    content prerequisites; `dependency_graph_mismatch` (Warning) for extra
    or missing edges. Seed ja-JP mirror is empty and matches its empty
    content prerequisites.
  - Unreachable/dead audit: BFS closure from delivered goals
    (unit `goal_id`/`goal_ids`, scenario `goal_id`/`target_goal_ids`)
    through prerequisite edges; goals outside the closure get
    `unreachable_goal` (Warning). Skipped when the pack has no delivery
    structure yet (goals-only draft).
- Unknown references and duplicate IDs already fail via PACK-001 checks
  (scaffold: warning; install: error; duplicates always error).
- `grammar/dependencies.yaml` is now part of the 0.2 layout contract
  (structural, no schema of its own; encoding documented here and in the
  layout doc comment).

## Fixtures + tests

- `invalid-prereq-cycle` (cycle path in message), `invalid-dead-goal`
  (island goal flagged, delivered goal not), `invalid-dependency-mismatch`
  (both directions), `valid-full` gains a matching mirror (clean).
- 22 integration + 4 unit tests green; full `./scripts/ci.sh` CI OK;
  handoff checker + 44 mutation tests pass; `--release-readiness` still
  fails with its 11 expected blockers.

## Decisions

- Mirror is optional; comparison runs only when the file exists. The seed
  note ("compare this graph with concept and goal prerequisites and reject
  cycles") is satisfied: cycles are rejected from authoritative content
  edges regardless of the mirror.
- Audit severity is Warning, not Error: dead content is a quality signal,
  not a structural violation; install gates stay license/reference-based.
- Delivery roots are units and scenarios only (docs/04: units are delivery
  groupings; scenarios are activities).

## Limits / follow-ups

- Assessment reachability beyond reference existence (rubric coverage per
  dimension) is LEARN-005 policy work.
- Capability/support-ladder runtime semantics (deferred modality gating)
  land with the engine (LEARN-*), not the pack validator.
