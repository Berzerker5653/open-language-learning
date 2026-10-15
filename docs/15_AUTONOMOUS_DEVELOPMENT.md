# 15 — Autonomous Development Workflow for OMP

## Goal

Allow OMP to advance the project for long periods with minimal owner intervention while preventing context exhaustion, repeated repair loops, and false completion.

## Durable state

Use:

- `tasks/ROADMAP.yaml` — task graph and acceptance criteria;
- `state/task-state.json` — machine-readable status/attempts;
- `state/STATUS.md` — human-readable snapshot;
- `state/notes/<task>.md` — research/implementation note;
- `state/evidence/<task>/` — logs/reports as needed;
- git commits — durable implementation history;
- ADRs — architecture decisions.

## Task sizing

A task should normally fit in one focused context: understand, modify, test, review, commit. Split tasks that require unrelated subsystems or massive repository scans.

## Task lifecycle

`blocked | ready | in_progress | review | done | retryable`

Only mark done after acceptance evidence.

## Selection

Choose an in-scope ready/retryable task whose dependencies are done. Order eligible tasks by milestone number, priority, then stable ID. Continue independent work around explicit blockers. The roadmap `execution_scope` defines the default desktop release candidate; optional tasks are not implicitly authorized by their presence.

## Research tasks

Research has an output artifact and decision. "Research X" is not complete because pages were read. A research task must produce:

- options considered;
- criteria;
- evidence;
- recommendation/decision or explicit unresolved blocker;
- follow-up implementation task edits.

## Implementation loop

1. Read task + required docs.
2. Inspect existing code/tests.
3. Write/refresh task note.
4. Implement smallest acceptance-complete change.
5. Add tests.
6. Run narrow tests.
7. Run affected regression suite.
8. Self-review diff against requirements.
9. Fix issues.
10. Record evidence/status.
11. Commit.
12. Continue.

## Context compression rule

Before a long context is likely to end, write a factual checkpoint to the task note containing:

- goal;
- files changed;
- tests/results;
- discoveries;
- remaining steps;
- failed approaches;
- exact next command/action if useful.

The next session reads this note rather than reconstructing history from chat.

## Avoid repeated failure

Track attempts in `task-state.json`. Similar repeated attempts count as one strategy, not three. After two similar failures, change strategy. After three distinct failures, block with evidence and work elsewhere if possible.

## Owner interruptions

Owner should be needed only for true product/access/legal/spending blockers. Ordinary dependency/library/architecture choices are agent decisions under the specs.

## Scope protection

No opportunistic rewrite of the whole app to solve a local task unless tests/evidence show the architecture itself is blocking progress. Record architecture rewrite as a separate task/ADR.

## Release process

At milestone/release boundaries, run from clean checkout where practical. Generate a release evidence report with versions, test results, known limitations, licensing audit, and supported platforms.

## Effective task state

The roadmap contains immutable requirements and dependency edges; `state/task-state.json` contains observed execution state. An absent task entry inherits `ready` only if it is in scope and all dependencies are `done`; otherwise it is waiting on dependencies. Out-of-scope tasks are deferred. Explicit `blocked` is reserved for a documented blocker, not inferred for every unfinished task.

An explicit `ready` or `retryable` never bypasses incomplete dependencies. Only one task may be `in_progress` in this single-agent workflow, matching `active_task`. `done` requires nonempty acceptance evidence references and completed dependencies. A task in `review` still blocks dependents. A retry requires a recorded error/strategy and increments attempts without discarding previous evidence. State writes must be atomic and recoverable.

A proposed validator check (`tools/validate_handoff.py --require-explicit-ledger-records`,
`docs/adr/0033-explicit-ledger-records-for-release-path-tasks.md`) would additionally
require an explicit ledger record for every task flagged `required_for_desktop_1_0`. It is
**not enabled**: until the owner accepts that ADR, absence keeps deriving readiness exactly
as above, and the check exists for review only.

If requirements or content change after completion, mark affected tasks for re-review and rerun affected acceptance checks before counting them complete. Record the review invalidation; do not leave stale `done` statuses merely because an older test passed.

## Completion and external actions

`REL-001` means a reviewable desktop release candidate with evidence. Public publishing, external messages, spending, final application/original-content license choices, credential creation, and store enrollment require direct owner authorization. Continue documentation and local repairs while an independent owner-only blocker is pending. Do not invent human reviewer approval or reinterpret a specification review as authorization to implement the product.
