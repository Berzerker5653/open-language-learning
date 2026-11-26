# APP-SPLIT-002 — budgeted per-surface extraction (one subtree)

Source: APP-SPLIT-001 honest partial (2026-11-25): pure module-scope helpers shipped to apps/desktop/src/app/primitives.ts + placement-coverage.tsx (App.tsx 5336 -> 5158 lines); the frozen card goal (<= ~1500) is unmet — the residual is one ~5000-line stateful App() component with ~90 hooks. Resume recipe: state/notes/APP-SPLIT-001.md. This card carries the FIRST bounded extraction; it is sized to FINISH in one 45-min card (or block honestly with a numbered resume block).

Scope: extract ONE surface subtree out of App() into a focused module — the journey/walkthrough smoke handshake (the ~450-line smoke effect + the progressStages/walkthrough state slice). Zero behavior change: pure moves, App.tsx keeps owning the hooks, no behavior re-pin, no gate edits, no feature changes. Keep App.tsx's module-scope exports identical (sibling tests import helpers from "./App" — the re-export shim stays).

Acceptance:
- One subtree extracted into apps/desktop/src/app/<slice>.tsx (or .ts); App.tsx visually shrinks accordingly (before/after LOC in gates.log).
- `npx tsc --noEmit` clean; full `npx vitest run` green; `python3 tools/validate_handoff.py` green.
- Test tree re-pinned if any test asserted the OLD module location (grep `from "./App"` for the moved symbols).
- Evidence: state/evidence/APP-SPLIT-002/gates.log (before/after LOC + gates).
- If the subtree cannot land green in one session: commit the partial with a numbered resume block in this notes file (append), flip task-state to blocked, block the board card — do not claim done.

Not in scope: settings.tsx / home.tsx / any surface other than the one extracted here; no pack changes.
