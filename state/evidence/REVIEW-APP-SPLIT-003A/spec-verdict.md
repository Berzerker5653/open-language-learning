# REVIEW-APP-SPLIT-003A — SPEC verdict

Target: APP-SPLIT-003A (code 88ce090e, ledger 0e66c227). Reviewer: default. Date: 2026-11-26.

## Verdict: PASS-WITH-NOTES

The diff does exactly the session/history wiring slice (WEB-HISTORY-001) move the
card asked for, with one tiny out-of-scope hunk and one evidence-accuracy defect
(wrong LOC numbers; see D1 in standards-verdict.md — it affects both artifacts).

## What the card required vs. what shipped

| Requirement | Result |
| --- | --- |
| Pure move of the session/history wiring slice into `apps/desktop/src/app/history-wiring.tsx` | YES — `handleHistoryPop` body, `confirmHistoryExit` body, and the leave-session alertdialog JSX moved verbatim apart from mechanical deps/props injection. All comment prose traveled with the code. |
| App.tsx keeps every hook | YES — verified by grep at 88ce090e: `appLocation` derivation (3626), `currentLocationRef.current = appLocation` (3633), `historyExitAsk` useState, `historyPopRef` useRef (3635), the `installHistoryNav` shim effect (3660), and the location-sync effect all stay in App. |
| Refs by ref (pop-time timing exact) | YES — `sessionQueueRef` / `historyNavRef` passed as `{ current }` refs; `handleHistoryPop` reads `deps.historyNavRef.current` at call time, exactly as the old inline body did. The dep bundle is rebuilt per render by the `historyPopRef.current = (t, g) => handleHistoryPop({...}, t, g)` line, same capture timing as the old closure. |
| One green checkpoint, not stacked | YES — code commit contains only this slice; siblings 003B–D are separate later commits. |
| tsc + vitest green | YES, independently re-verified by the reviewer in a clean worktree at 88ce090e (main-tree node_modules; packages/ and lockfile untouched since): `npx tsc --noEmit` exit 0; `npx vitest run` 694/694 tests PASS. `src/journeys/history-nav.journey.tsx` (drives history-exit-ask/confirm/keep through the live DOM) is in the green suite. |
| Ledger commit names the slice sha | YES — 0e66c227 subject ends "code 88ce090e". |
| LOC line in state/notes/APP-SPLIT-001.md | PRESENT but numerically wrong (D1). |

## Fidelity of the move (line-level)

- Pop handler: every branch, guard, and comment maps 1:1 (`nav.sync(appLocation)` →
  `nav.sync(deps.appLocation)`, etc.). `setRoute(wantRoute as typeof route)` →
  `deps.setRoute(wantRoute as KnownTab)` — same cast semantics (KnownTab is the
  route union the old `typeof route` was). Truthiness-only deps typed `unknown`
  (`practiceTarget`, `sessionQueueRef`) — sound for how they are used.
- confirmHistoryExit: identical statements; the explanatory comment moved to the
  function doc comment.
- Dialog JSX: `role="alertdialog"`, `aria-label`, all three `data-testid`s, and
  classNames byte-identical; the outer `{ask ? ... : null}` ternary became a
  null-guard inside the component — same render semantics.
- No test-tree edits; grep confirms no test/journey imports the moved symbols
  from "./App" (the "no re-pins needed" claim holds).

## Notes (out-of-scope additions)

- N1 — one 6-line formatting hunk is outside the slice: the `useServeProbe`
  destructuring in App.tsx (single long line → multi-line). It is a prettier
  printWidth-100 parity fix, not a behavior change: the PARENT tree was
  `prettier --check` RED on App.tsx (the 131-char line predates this lane, from
  the APP-SPLIT-002 serve-probe extraction), and the lane ran
  `prettier --write` on its touched files. Harmless; no FIX card needed, but it
  is an extra beyond "pure move" and is flagged per the standards checklist.
