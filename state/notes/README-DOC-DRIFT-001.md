# README-DOC-DRIFT-001 — README + task-state current_release_candidate drift (doc reconciliation)

Source: 2026-11-25 repo hygiene audit. README.md and state/task-state.json drift behind catalog/packs.json:
- README says ja-JP 0.4.3 (published 2026-11-09) + ru-RU 0.4.5 (published 2026-11-20); catalog pins ja-JP 0.4.4 (2026-11-20) and ru-RU 0.4.9 (2026-11-22).
- README says coverage measured 2026-11-20 (ja 77 goals/801 units/4641 activities, ru 60 goals/818 units/3248 activities); tree at 2026-11-25 shows ja 814 units.
- task-state.json current_release_candidate carries the same stale 0.4.3/0.4.5 line.
- Release artifact section references 0.4.0-alpha.1 as the published app — keep that honest (it IS the published artifact) but the note must not imply the app has moved.

Scope:
- Sweep README + task-state current_release_candidate (the README's stale claims + the field), with measured values read from catalog/packs.json, the current tree, and catalog/preview-entries.json — never from prose.
- Update "What is downloadable" paragraph, coverage date/numbers, and the current_release_candidate field accordingly.
- Do NOT touch immutable-history docs (docs/13 published-archive rows, docs/21 sample output), release runbooks, or the design notes.

Acceptance:
- Every pack version/date/count claim in README.md and current_release_candidate is measured from an artifact on this tree; README says what was measured + the date.
- Lint spot check: README + task-state must agree with catalog/packs.json exactly (script compare in gates.log).
- Evidence: state/evidence/README-DOC-DRIFT-001/gates.log.

Not in scope: release artifacts, packs, no re-publish, release claims.
