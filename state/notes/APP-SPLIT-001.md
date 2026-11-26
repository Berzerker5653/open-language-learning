# APP-SPLIT-001 — split the 5305-line App.tsx (code quality)

Source: 2026-11-25 repo hygiene audit: apps/desktop/src/App.tsx is ~5305 lines (orchestrator + JSX hotspot), the largest file in the web app. Its responsibilities mix: serve-mode probe wiring, onboarding/AppShell wiring, pack state, Today header, navigate/history, settings integration, journey harness wiring, and inline surface-wire decisions.

Scope (code quality, zero behavior change):
- Extract cohesive per-surface helpers/components into focused modules under apps/desktop/src/ (e.g. app/home-wiring, app/serve-probe, app/navigation-wiring, ...), keeping tsc + vitest green and behavioral output identical.
- No feature change, no re-pin of behavior, no gate edits; do not touch a file owned by an in-flight lane (git status before staging).

Acceptance:
- App.tsx is materially smaller (target ≤ ~1500 lines; goal stated against measured line counts before commit).
- tsc clean; full desktop suite green; validate_handoff green.
- Evidence: state/evidence/APP-SPLIT-001/gates.log with before/after LOC + lane gates.

Not in scope: settings.tsx / home.tsx (adjacent, separate candidates if the owner wants another split), any pack changes.

## RUN 1 — HANDOFF / resume recipe (2026-11-25, honest partial)

**What shipped:** the pure module-scope helpers extracted to
`apps/desktop/src/app/primitives.ts` (Invoke, after, detectInvoke,
NO_ACTIVE_PACK, explainPackAbsence, loadSessionPack, activePackNote,
serveDegradedBadge, packRequest, packAttemptRequest, SESSION_BRIDGE_MS,
EMPTY_PLAN, toWav16, toB64, SessionPack type) + `app/placement-coverage.tsx`
(PlacementCoverageNote). App.tsx re-exports the sibling imports tests use.
Gates green: `npx tsc --noEmit` PASS, `npx vitest run` 77 files / 694 tests PASS.
Evidence: state/evidence/APP-SPLIT-001/gates.log.

**What is NOT done (goal unmet):** App.tsx is 5158 lines, NOT <= ~1500.
The residual is a single stateful `App()` component (~5000 lines: ~90 hooks,
~300 closures, ~450 lines of smoke-walkthrough useEffect, large JSX return).
Splitting it safely needs the following recipe (one card, not this one):

1. Budgeted extraction of one surface subtree at a time (e.g. journey/walkthrough
   smoke handshake, then per-surface panels already stubbed in App.tsx):
   pass the slice's state + setters as a props object into a focused component;
   keep App.tsx owning the hooks. Zero behavior change: pure moves.
2. Keep `progressStages`/`walkthroughRan` in App.tsx module scope (the
   headless smoke handshake imports nothing from outside — verified).
3. Re-run `npx tsc --noEmit` + `npx vitest run` after EACH extraction; do not
   stack extractions before a green checkpoint.
4. After each extraction the "app/" module must expose the same named exports
   + types; do not change call-site signatures.
5. Re-pin any test that asserted the OLD module location (grep the test tree
   for `from "./App"` before each move — sibling tests import helpers from
   "./App", hence the re-export shim).

**If the goal can't be met in one 45-min card:** split the work into one card
per surface (walkthrough-handshake, settings wiring, Today header/home wiring,
session/history wiring) rather than expanding this card.

## RUN 2 — serve-probe slice (2026-11-26)

Pure move of the serve-mode probe slice into `apps/desktop/src/app/serve-probe.ts`
as `useServeProbe(inv)` (pairing probe, engine-progress listener,
/api/capabilities report → serveNotice/serveBadge/serveMicNamesAvailable).
App.tsx 4758 -> 4650 lines (5336 -> 4650 total). Gates: tsc clean; vitest 77
files / 694 tests; validate_handoff PASSED. Code 75ba816c.
**Goal (<= ~1500) still NOT met** — residual is one ~4650-line stateful App()
(~90 hooks). Remaining budgeted slices (candidates): session/history wiring,
settings/import wiring, pack/session/claims refresh wiring, home header/Today
wiring. Each: one slice, one green checkpoint (tsc + vitest), commit per slice.
Do NOT stack slices before a green checkpoint; keep App.tsx owning every hook.
