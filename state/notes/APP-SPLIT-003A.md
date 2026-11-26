# APP-SPLIT-003A — session/history wiring slice (slice of APP-SPLIT-001)

Contract: extract exactly ONE budgeted slice of App() — the session/history
wiring slice (WEB-HISTORY-001) — into `apps/desktop/src/app/history-wiring.tsx`
as a pure move, zero behavior change. App.tsx keeps owning every hook.

Shipped shape:
- `handleHistoryPop(deps, target, guarded)` — the `historyPopRef.current`
  handler body, moved verbatim. Deps carry App-owned state (step, appLocation,
  practiceTarget, route), refs (sessionQueueRef, historyNavRef — passed as
  refs so pop-time reads stay pop-time), setters, and the session closures
  (pauseSession/resumeSession/leaveSoloStage).
- `confirmHistoryExit(deps)` — the confirm-exit body, moved verbatim.
- `HistoryExitAsk` — the leave-session alertdialog JSX, moved verbatim
  (role/aria-label/data-testid/className unchanged; null-guard moved into the
  component, same render semantics as the old `{ask ? ... : null}`).
- Stays in App.tsx (hooks): appLocation derivation, historyNavRef,
  currentLocationRef, historyExitAsk state, historyPopRef, the install effect,
  the location-sync effect.

Gates (one checkpoint, no stacked slices):
- `npx tsc --noEmit` PASS
- `npx vitest run` 694 tests PASS (incl. src/journeys/history-nav.journey.tsx
  which drives history-exit-ask/confirm/keep through the live DOM)
- App.tsx 4650 -> 4591 lines (net -59)
- No test-tree re-pins needed: nothing imports this slice from "./App".

Evidence: state/evidence/APP-SPLIT-003A/gates.log. Code: see ledger commit
record in state/task-state.json.

Next slices (siblings 003B-D, NOT this card): settings/import wiring,
pack/session/claims refresh wiring, home header/Today wiring.
