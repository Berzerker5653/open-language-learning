# ADR-0034: Band review gates, the SPEECH-007 release edges, and attribution promotion

- Status: Proposed (agent-authored, 2026-10-17; records a board/graph change the
  owner ruled on 2026-10-17. The owner signs the `Status:` line; see ADR-0033.)
- Date: 2026-09-29 (board surgery landed 2026-10-17)
- Affects: tasks (task-state.json)

## Context

`state/task-state.json` had accumulated dependency edges that contradicted the
documents that outrank it, and one class of release obligation that was nowhere
in the ledger:

1. **SPEECH-007 on the release chain.** Five tasks carried `SPEECH-007` among
   their `dependencies`, and because the release validator requires every
   `required_for_desktop_1_0` task to be transitively reachable from `REL-001`,
   `SPEECH-007` — which is `blocked` on ASR/Wav2Vec alignment work — was a hard
   predecessor of shipping 1.0. `docs/00_MASTER_SPEC.md` non-negotiables say the
   opposite: automatic speech feedback "is not part of the 1.0 desktop release
   path". ADR-0017 (Speech feedback deferred beyond 1.0) is `Accepted` since
   2026-10-17. The graph was the outlier, not the spec.
2. **Review cards as hard gates.** `JA-A1-003`, `JA-A2-002`, `JA-B1-002` and
   `JA-B2-002` — the qualified-human band review cards — sat on the release
   chain. Since ADR-0017 keeps CEFR B1+ out of 1.0, only the A1/A2 review cards
   are load-bearing for this release; the B1/B2 gates blocked nothing that
   1.0 ships, while continuing to imply that B1+ content was release-bound.
3. **The validator's reachability invariant.** `tools/validate_handoff.py:301`
   fails any `required_for_desktop_1_0` task that is not reachable from
   `REL-001` through `dependencies`. Removing an edge therefore strands the
   subtree behind it: cutting the SPEECH-007 edges would have made ADR-0033's
   own reachability check fail, and cutting the B1/B2 review gates would have
   stranded `JA-B2-001` (whose only predecessor was `JA-B2-002`).
4. **Attribution was unowned.** The ja pack ships EDRDG/JMdict data under
   CC BY-SA. `apps/desktop/src` had no surface that renders pack attribution,
   and no task owned one — the obligation existed only in pack metadata
   (`languages/ja-JP/sources.jsonl`, `licenses.jsonl`).

The owner ruled on all four points on 2026-10-17: the SPEECH-007 release edges
come out, band review cards stay live claim gates but are not release gates,
and kanji attribution is promoted onto the release path. The ledger cannot carry
a decision of this size, so it is recorded here per the repo rule that a
significant architectural decision gets an ADR.

## Decision

Applied to `state/task-state.json` on 2026-10-17, edge by edge:

1. **Removed the five `SPEECH-007` dependency edges** that sat on the release
   chain. `SPEECH-007` remains `blocked` and unchanged as a task; it is simply
   no longer a predecessor of 1.0. Its own dependencies and the speech cards
   that depend on it keep their structure.
2. **Kept `required_for_desktop_1_0 = false` on the four band review cards**
   (`JA-A1-003`, `JA-A2-002`, `JA-B1-002`, `JA-B2-002`) and cut the release
   edges that hung off them. They remain `review` status cards, and the review
   obligations are unchanged: `docs/00_MASTER_SPEC.md` still says
   "unreviewed `ready` packs are pilot-only", `docs/15_AUTONOMOUS_DEVELOPMENT.md`
   still says a qualified human review cannot be self-certified by an AI, and
   `languages/ja-JP/review/REVIEW_POLICY.yaml` still lists
   `BLK-REVIEW-CAPACITY` and `BLK-WAVE-B`. A pack whose review is open stays
   explicitly labelled draft wherever it is shown.
3. **Compensated the reachability invariant** by adding direct edges from
   `REL-001` to the four band *authoring* cards (`JA-A1-002`, `JA-A2-001`,
   `JA-B1-001`, `JA-B2-001`), so every required task is still reachable from
   `REL-001` without routing through a review card. This preserves the check
   rather than weakening it: `tools/validate_handoff.py --require-explicit-
   ledger-records` passes and reports `ungated required: []`.
4. **Promoted `JA-KANJI-ATTRIBUTION-001` to `required_for_desktop_1_0: true`**
   (the only promotion in this change). Shipping CC BY-SA-derived kanji data
   with no acknowledgement on the application surface is a licence duty, not a
   nicety.
5. **Left the remaining optional cards optional.** `A11Y-FLOW-001`,
   `RU-MODALITY-PRACTICE-001` and `UPPERBAND-TASK-JOURNEYS-001` stay in
   `execution_scope.optional_tasks`, which is also what the validator's
   set-equality check between that list and `required_for_desktop_1_0: false`
   requires.

## Consequences

- The required set went **66 → 67** tasks. Nine are still open: `ACC-001`,
  `JA-A2-001`, `JA-B1-001`, `JA-B2-001`, `JA-KANJI-ATTRIBUTION-001`, `PERF-002`,
  `PLAT-001`, `REL-001`, `SEC-001`.
- `JA-KANJI-ATTRIBUTION-001` is a **new release blocker** that did not exist
  before, and it is real work: an app surface that reads the installed pack's
  `sources.jsonl`/`licenses.jsonl` and renders attribution, with an explicit
  "unattributed" state rather than invented text.
- `REL-001` now blocks directly on the band authoring cards. `JA-B2-001` has
  become dependency-free, so it reads as `ready` while its review gate
  (`JA-B2-002`) is open; the review obligation is enforced by the pack review
  policy and the ADR-0006 human-sign-off rule, not by a graph edge. That is a
  deliberate weakening of mechanical enforcement in exchange for a graph that
  matches the spec, and it is the main risk of this change.
- The board's band-coverage claims in `issue://1` are **still not closable**:
  the A2/B1/B2 authoring cards are `ready`, not `done`, and the review cards are
  open. Cutting review edges does not create review evidence.
- Validator output is otherwise unchanged: 6 warnings, the same set as before
  (two optional-task records, four scope warnings).
- ADR-0034 itself stays `Proposed` until the owner signs it; the graph change is
  already on disk, so the ledger currently encodes a decision this document
  describes as awaiting signature.

## Alternatives considered

- **Mark the band review cards `done` on the strength of their recorded
  evidence.** Rejected: it would manufacture human review that has not
  happened, which `docs/15_AUTONOMOUS_DEVELOPMENT.md:104-110` explicitly
  forbids an agent from self-certifying, and `review` is the only status that
  keeps the obligation visible.
- **Keep the SPEECH-007 release edges.** Rejected: they contradict a
  non-negotiable in `docs/00_MASTER_SPEC.md` and an `Accepted` ADR-0017.
  Keeping them would make every future release derivation lie about the
  critical path.
- **Descend the whole band layer from the release path** (drop the authoring
  cards too). Rejected: A1 and A2 content is exactly what 1.0 ships, and
  `REL-001` would then have no content gate at all.
- **Promote every `issue://1` card to required.** Rejected: the owner controls
  that ledger's semantics, and the 2026-10-17 ruling named only attribution.
- **Leave attribution optional** and rely on pack metadata. Rejected: a CC
  BY-SA attribution duty that no user-visible surface satisfies is unmet,
  whatever the files say.
