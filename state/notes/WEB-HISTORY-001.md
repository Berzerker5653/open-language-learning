# WEB-HISTORY-001 — browser back/forward wired into app navigation

## What shipped
- `apps/desktop/src/history-nav.ts` — the router shim over the existing
  state machine (NO router library, NO second source of truth). Query-
  encoded destinations (`/?d=session/stage`) because serve.rs has no SPA
  fallback — only "/" is guaranteed to answer. Location grammar:
  tab / session / stage; the root tab encodes WITHOUT a segment.
  Every destination sync pushes at most one entry per level (the
  pushPath ladder), traversals route back through App's own nav
  functions (setRoute, pauseSession, resumeSession, closeSession).
- `App.tsx` — derived `appLocation`, install/teardown effect, popstate
  handler, the leave-active-session confirm (data-testid=history-exit-ask),
  forward-destination reconstruction (never double-advances). Shim
  installs only under `window.__LTS_SERVE` or `__LTS_HISTORY` — desktop
  (Tauri, file://) behavior is byte-identical, verified by the journey
  "without the flag nothing touches history".
- Guardrails: back from stage -> paused session (Resume owns re-entry);
  back from active session -> the shim restores the history position
  BEFORE asking, "Keep working" strands nothing; confirm runs the app's
  own Stop session (summary shows, same as pressing Stop session), then
  walks the pointer back to the arrival entry; back from the root tab is
  a real exit (the arrival entry is never duplicated).

## Controller fixes over run 121 (the dead run was ONE bug from done)
1. `pushPath` sameTab bug: the root tab has no segment, so `toSegs[0]`
   of "session/stage" was read as a tab and the ladder never fired —
   starting a plan pushed ONE entry and Back skipped the session level.
   Fixed with tabOf() (level words are not tabs). Found BY the real-
   browser walk, invisible in the fake-history journey until re-run.
2. Acceptance-harness lesson: the on-screen step banner echoes click
   labels into `body.innerText` and polluted a "root plan visible"
   check (it saw "Start today's plan" in the banner). Assertions now
   query BUTTON elements, never innerText, in the walk script.

## Acceptance mapping note
The card's "Today->unit->session->stage" walk: the app has no unit-detail
screen — Today shows the plan and "Start today's plan" opens the session
whose first activity starts in the same commit. The shim therefore gives
that one action TWO history levels (session, then stage), so browser Back
walks stage -> session -> (guardrail) -> plan. The plan destination IS the
root-tab entry; the guardrail confirm is the card's own
active-session rule, not a deviation.

## Evidence
state/evidence/WEB-HISTORY-001/: history-walk.mjs (real headless Chromium
over CDP, mobile 390x844), walk.json + walk-run.log (18/18 PASS), six
screenshots, gates.log. Rebuild harness first:
`cd apps/desktop && npx vite build --config vite.history-harness.config.ts`
