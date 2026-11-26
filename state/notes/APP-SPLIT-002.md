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

## Landed 2026-11-26 (done)

The walkthrough smoke-handshake slice landed green in one session:

- Extraction: apps/desktop/src/app/walkthrough.tsx (new, 471 lines) — the
  module-scope progressStages witness, the walkthroughRan once-per-process
  guard, and the ~450-line smoke effect, moved verbatim. App() keeps owning
  every hook and the non-smoke boot path; runSmokeHandshake(inv, hooks) is
  the only new call shape, and it returns `true` (skip the non-smoke branch)
  or `false` (boot normally) inside the mount effect. No other file changed;
  module-scope exports unchanged; zero behavior change.
- LOC: App.tsx 5158 -> 4758 (-400 net); walkthrough.tsx 471 (incl. ~70 lines
  of module wrapper: doc header, type imports, WalkthroughHooks interface).
- Gates (all green): tsc --noEmit clean; full desktop vitest 77 files / 694
  tests; validate_handoff PASSED (2288 data files). Full log:
  state/evidence/APP-SPLIT-002/gates.log.
- Test re-pin: grep of the test tree for progressStages/walkthroughRan shows
  no pins of the moved module location; the helpers re-exported from "./App"
  are unchanged. No re-pin required.

APP-SPLIT-001 residual (the remaining ~4700-line App() with ~90 hooks) is
NOT met by this card by design — the next bounded extraction is a separate
card.
