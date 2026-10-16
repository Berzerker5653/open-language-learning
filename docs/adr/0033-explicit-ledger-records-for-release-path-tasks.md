# ADR 0033: Explicit ledger records for release-path roadmap tasks

Status: **Proposed** — agent-authored 2026-10-15. Acceptance is an owner decision, and the
validator behaviour described here is deliberately **off by default** so that adopting this
policy is a visible act rather than a side effect of a tooling change.

## Context

`docs/15_AUTONOMOUS_DEVELOPMENT.md:90` defines the derivation rule: a roadmap task with
no entry in `state/task-state.json` derives its readiness from its in-scope ROADMAP
dependencies. That rule is what lets a fresh clone pick up work without hand-maintaining a
row for everything. It has a consequence nobody intended for human-gated cards: a card
whose acceptance can only be signed by a qualified human reports as **ready** as soon as
its dependencies are `done`, because nothing in the ledger says otherwise.

Measured on 2026-10-15 at `fd76786`: `tasks/ROADMAP.yaml` carries 122 tasks, 66 with
`required_for_desktop_1_0: true`; **16 had no ledger record**, 8 of them required. Four of
those eight (`ACC-001`, `SEC-001`, `PLAT-001`, `PERF-002`) sit directly on the release
path, and each also depends on `JA-B2-002`, a qualified-review card that was itself
ROADMAP-only. The band-review chain (`JA-A1-003 ← JA-A1-002`) therefore read as ready
while no band review record exists anywhere in the repository. Eight `blocked` records
were added earlier the same day; the remaining four (`JA-A2-001`, `JA-B1-001`,
`JA-B2-001`, `REL-001`) were added with this change, so all 66 required tasks now carry an
explicit record.

## Decision

Make the gap machine-detectable, without making the policy mandatory:

1. `tools/validate_handoff.py --require-explicit-ledger-records` fails for any roadmap task
   with `required_for_desktop_1_0: true` that has no `state/task-state.json` record, and
   warns for optional ones. Default runs are byte-for-byte unchanged
   (`HANDOFF VALIDATION PASSED (1959 data files checked)` with the same two WARNs).
2. Release-path cards that depend on a human act get an explicit record with a named
   `blocker`, even though `blocked` is the more restrictive state. Recording a blocker
   cannot enable work; it only prevents an agent from mistaking silence for permission.
3. The ledger is edited textually and stays insertion-ordered; it is never re-serialized.

## Consequences

- Every release-path card becomes a visible row, so the release gate's state can be read
  without re-deriving it — `REL-001` itself now says `blocked` and names its blockers.
- Ledger upkeep rises: adding a required task to `ROADMAP.yaml` obliges a ledger record,
  which the flag surfaces as a named failure rather than a silent derivation.
- `blocked` becomes the correct home for "an agent cannot finish this", which the existing
  statuses do not otherwise express: `done` requires evidence, and `review` would falsely
  imply an agent handed something over.
- Accepting this ADR does **not** soften any human gate. It restricts what an agent may
  start, and it makes the four human/owner dispositions (AT pass, security disposition,
  real-platform runtime, performance tiers) harder to overlook.

## Alternatives

- **Keep derivation alone.** Cheapest, and it is what the repository does today; the cost
  is that a required card added tomorrow can read `ready` for exactly the reason these
  eight did.
- **Turn the flag on by default now.** Fails the current baseline until every required card
  has a record (true as of this change) but silently makes an agent-authored policy
  binding, which is the thing this ADR exists to avoid.
- **Move gating metadata into `ROADMAP.yaml`** (e.g. a `human_gated: true` field) and
  validate that instead. More precise, but it splits one fact across two files and requires
  annotating 122 tasks; the required flag plus the ledger already expresses it.

## Status

Proposed. If the owner accepts, the flag can be added to `scripts/ci.sh` and
`.github/workflows/ci.yml` in a one-line change per file, and the `note` in
`state/task-state.json` should be amended to say the derivation rule no longer applies to
required tasks. Until then the flag is available for review and the default output is
unchanged.

**Applied 2026-10-16 under decision-queue item D5b** (the owner chose "adopt ADR-0033 and
enable the flag in CI"). The strict invocation is now what CI runs, in both
`scripts/ci.sh:112` and `.github/workflows/ci.yml:253`, and the `note` in
`state/task-state.json` carries the derivation carve-out. Measured in the same change: the
plain and strict runs both print `HANDOFF VALIDATION PASSED (1960 data files checked)`;
strict adds four WARNs for optional tasks with no record (`AI-001`, `PLAT-002`, `ADV-001`,
`WEB-001`) and no failures. Line 3 still reads **Proposed** — that line is the owner's
signature, not a build fact.
