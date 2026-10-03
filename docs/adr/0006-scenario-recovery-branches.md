# ADR-0006: Scenario graph recovery branches

## Status

Accepted (2026-10-03). Implements SCENARIO-001 acceptance criterion 1.

## Context

The 0.2 scenario schema (`schemas/v0.2/scenario.schema.json`) models
scenario nodes with `prompt`, `expected_actions` (learner intents),
`next` success edges, a scenario-level `support_ladder`, and
`transfer_variants`. SCENARIO-001 requires the pack-defined graph to
also support **recovery branches** — what happens when the learner's
attempt does not satisfy a node (miscommunication, repair, clarification)
— without the runtime inventing language-specific fallback logic
(acceptance criterion 2: "Scenario runtime contains no Japanese-specific
branch logic").

`docs/04_LANGUAGE_PACK_SPEC.md` is provenance-locked and cannot be
edited; this ADR is the schema-change documentation required by
AGENTS.md for public pack schema changes.

## Decision

Add an optional `recovery` array to scenario nodes:

```yaml
nodes:
  - id: "es.activity.intro.meeting.open"
    prompt: "Greet your new colleague"
    expected_actions: ["greeting"]
    next: ["es.activity.intro.meeting.ask-name"]
    recovery:
      - id: "es.activity.intro.meeting.repair-repeat"
        prompt: "You were not understood; ask them to repeat"
        expected_actions: ["request-repetition"]
        to: "es.activity.intro.meeting.open"   # optional return edge
```

- Fully optional: existing 0.2 packs validate unchanged.
- A recovery branch is data: its own prompt, accepted intents, and an
  optional `to` edge (defaults to the current node). The runtime
  (`crates/activity/src/scenario.rs`) only follows pack-declared edges;
  a failed intent surfaces the node's declared recovery ids and the
  session never branches on any language literal.
- Node ids inside `recovery` are scenario-internal (not content
  instances), consistent with existing `nodes[].id`/`next` semantics.

## Consequences

- Packs can author repair/clarification dialogue explicitly; UIs get a
  uniform `NotSatisfied { recovery: [...] }` step result.
- Schema version stays 0.2 (additive, optional fields; no migration).
- Recovery completion does not re-record the node as a fresh success;
  attempts per node are counted in `NodeRecord.attempts` so evidence
  honesty (coached retries stay formative) is preserved upstream.

## Alternatives

- Runtime-synthesized generic fallback ("please repeat"): rejected —
  hidden pedagogy, not pack-reviewable content (docs/16 treats content
  as code).
- Separate `activities/recovery/*.yaml` files: rejected — recovery is
  node-local dialogue; a second graph would duplicate edges and
  complicate the validator.
