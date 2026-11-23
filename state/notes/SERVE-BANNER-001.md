# SERVE-BANNER-001 — serve-mode status notes leave the first screen; Settings > About holds them

Live violation (owner phone, `state/evidence/DOGFOOD-2026-11-23/live-phone-fold0.png`,
attached to board card t_1e1edeca): the Today page opens with five lines of
infra meta ABOVE all learner content — "Browser mode: install progress streams
live, the same stages the desktop shows." + the microphone secure-context
sentence + "Privacy settings: unchanged — serve mode never rewrites…"
(Market rule, docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md § MARKET
NAVIGATION RULES: meta never occupies the first screen.)

## Root cause (measured, not guessed)

`App.tsx` (WEB-SERVE-001 scope 4) renders the whole capability report as a
`role="status"` `.notice` block in the AppShell children — ABOVE the route
content, so it lands on every screen including the Today fold-0. The lines
themselves are honest (they come from the server's `/api/capabilities`
report, never a local guess); the dishonest part is the PLACEMENT.

## The fix (placement only; the report and its lines are unchanged)

- All capability lines move to the Settings **About this build** card
  (`#settings-build`, where the version/commit lines already live): the App
  passes its `serveNotice` lines down as a new `Settings` prop and the card
  renders them as quiet `.meta` rows under `data-testid="serve-notice"`.
- Today keeps AT MOST a one-line unobtrusive badge (`data-testid="serve-badge"`,
  `.meta` styling), rendered only when a capability is ACTUALLY degraded:
  `serveDegradedBadge(caps)` returns one line iff the server's report says
  this origin cannot reach the microphone (`microphone_names_available ===
  false`, the secure-context rule); healthy localhost serve and unreachable
  bridges render NO badge. The text still derives from the server truth, not
  a local invention.
- Nothing else changes: `fetchCapabilities`, the SSE install-progress stream,
  the Settings mic-button graying (SETTINGS-SCOPE-001), and every engine call
  keep their exact behavior. Desktop mode is untouched (no serveNotice there).

## Evidence gates

- Vitest contract (red at base): settings pins — every capability note line
  renders inside the `#settings-build` card and no serve-notice block appears
  without notes; App pin — `serveDegradedBadge` is one microphone-naming line
  exactly when the report degrades the mic, null when healthy or unreachable.
- `scripts/serve-banner-capture.mjs` — real engine (lts-serve) at 390x844,
  fresh profile: TODAY FIRST FOLD contains zero infra strings
  ("Browser mode" / "serve bridge" / "install progress" / "Privacy settings"
  / "secure context") — red-at-base measures the violation present — no badge
  on a healthy localhost report, and every capability line renders exactly
  once, inside the About card (Settings screen, scrolled). fold-0 +
  settings-about screenshots; navigation errors ride into result.json.
- firstscreen + path-lock-order captures stay green unedited (the banner is
  gone from fold-0, so their meta/fold checks only get easier).
- No Rust/pack changes: the serve binary from the existing debug build serves
  both the red-at-base and green dists.
