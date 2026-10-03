# JA-RES-004 Acceptance Notes — Japanese communicative goal graph

Date: 2026-10-02

## Deliverable

`docs/curriculum/JA_GOAL_GRAPH.yaml`: 15 v0.2 goal documents —
3 on-ramp, 3 A1, 3 A2, 3 B1, 3 B2 (release band for REL-001 is
B2-like). Contract tests in `crates/langpack/tests/ja_goal_graph.rs`.

## Acceptance 1: original goal IDs/descriptions with framework references, on-ramp through release band

- IDs follow the pack content-id convention (`ja.goal.<band>.<slug>`);
  descriptions are project-authored (AI-assisted, `generation` block
  records method/tool/model/date per docs/10 §AI provenance).
- `framework_refs` cite the JF Standard as framework reference only
  (`jf-standard:<band>`); the JF Standard is `reference-only` in
  `docs/provenance/JA_SOURCE_MATRIX.yaml` and no descriptor text is
  reproduced.
- Test `bands_cover_onramp_through_release_band` asserts all five
  bands present; `every_goal_validates_against_v02_goal_schema`
  enforces the schema (incl. `sources` provenance per goal).

## Acceptance 2: goals have prerequisites/modalities/assessment plans

- Prerequisites are versioned `prerequisiteRecord`s scoped by
  dimension + required_state + strength (bare ids invalid in 0.2);
  `prerequisites_resolve_and_are_acyclic` proves every target
  resolves inside the graph and the graph is a DAG.
- Every goal declares modalities and ≥1 assessment id
  (`goals_have_modalities_assessments_and_framework_refs`);
  transfer-required flags set per goal (literacy goal exempt).

## Acceptance 3: no copied restricted assessment prompts

All goal text and assessment ids are original project artifacts
(AI-drafted today, `review_status: draft`); ACTFL/JF restricted
descriptor text is never reproduced (matrix classifications
enforce reference-only handling). Assessment *prompts* themselves
are authored content in later units, subject to the same rule; the
graph carries only ids/plans.

## Boundaries

Every goal is `review_status: draft` — qualified review (REVIEW-001)
cannot be self-certified; the test asserts no goal claims validated/
verified status. Pedagogical band placement is a hypothesis for
human review.

## Evidence

- `state/evidence/JA-RES-004/cargo-test-2026-10-02.txt` — 4 contract
  tests green.
- `state/evidence/JA-RES-004/ci-2026-10-02.txt` — full `./scripts/ci.sh`
  exit 0 ("CI OK") + handoff validator PASS (48 data files).
