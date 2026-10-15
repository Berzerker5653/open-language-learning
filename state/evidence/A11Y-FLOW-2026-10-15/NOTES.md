# A11Y-FLOW-001 — the engineering half of issue #1 item I04

Date: 2026-10-15. Tree: `e032e16` + the uncommitted working set this card
describes. Host: Gaming PC (lab-main); all runs offline.

## What was wrong in the tree

- `apps/desktop/src/App.tsx` answered a route change with `window.scrollTo(0, 0)`
  only. Focus and therefore the screen-reader announcement stayed on content that
  had already left the page, so a keyboard or screen-reader learner got no
  confirmation of where the click landed.
- `apps/desktop/src/home.tsx` rendered the `Time budget` group and a
  `plan-summary` line reading `activities · about` with zero counts under
  `noPack`, next to a single "Choose a language" action — the empty state asked
  the learner to set a budget for a plan that cannot exist yet.

## What changed

- `apps/desktop/src/App.tsx`: the route-change effect scrolls, then moves focus
  to the destination route's own `h1` inside `#main`, setting `tabIndex = -1`
  and focusing with `preventScroll: true`. The `done` step returns early (the
  wizard hands focus to its own completion control). The heading element is held
  in a `routeHeading` ref so repeat route changes reuse it rather than
  re-querying.
- `apps/desktop/src/home.tsx`: with `noPack`, the `Time budget` group, the
  `plan-summary` paragraph and the zero-count empty paragraph are withheld; the
  view keeps exactly one action.
- `apps/desktop/src/home.test.tsx`: the no-pack case now asserts those three
  surfaces are absent by their accessible names, not by DOM shape.
- `apps/desktop/src/journeys/keyboard.journey.tsx` (new, mounted journey using
  the existing `journeys/harness.tsx`; no new dev dependency): sequential Tab
  stops and Enter presses model keyboard-only navigation. It asserts the skip
  link is the first stop, that picking a profile leaves focus on the `Hi Lee`
  heading, that a no-pack Today exposes one action, that `Choose a language`
  puts focus on the `Language packs` heading, and that the `Practice` route
  reports its own heading.

## Measured

- Before, proving the tests bite: `git stash push -- apps/desktop/src/App.tsx
  apps/desktop/src/home.tsx` then
  `npx vitest run src/journeys/keyboard.journey.tsx src/home.test.tsx` →
  **2 failed** (`home > states the missing language and offers the way out,
  withholding the plan promise`; the keyboard journey), then `git stash pop`.
- After: `pnpm -r test` → `apps/desktop` **27 files / 240 tests passed**,
  `packages/ui` 10 passed.
- `pnpm fmt:check`, `pnpm lint`, `pnpm -r typecheck`: clean.
- `tools/audit_learner_copy.py`: 34 files scanned, **0 findings** — the new
  copy carries no ticket, ADR or gate id.
- `apps/desktop/src/a11y.test.tsx` (K-33's automated matrix) was not edited:
  its 423 lines of tabindex, accessible-name, label, landmark, single-h1, live
  region, audio-control, contrast, reduced-motion and visible-focus rules are
  extended around this change, never relaxed.

## Not a fix, and why

The I04 checklist bullet names IME behavior. `grep` for `onKeyDown`,
`isComposing`, `compositionstart` and `key === "Enter"` across
`apps/desktop/src` returns **no matches**: every submit in the app is a button
click (`writing.tsx:27,74`), so no composition can trigger a premature
submission today. Adding Enter-to-submit would create the hazard rather than
remove it, and it is not in the requested scope.

## What this card cannot close

Issue #1 item I04 stays unchecked. Its third acceptance bullet requires the
human screen-reader matrix — `docs/assessment/ACCESSIBILITY_AUDIT.md` §2
(Linux/Orca setup), §3 (journeys to audit), §5 (sign-off, human only) — which is
ACC-001 and owner gate O-03. `AGENTS.md` forbids an agent self-certifying
qualified human review, so an agent implementing the engineering half does not
close the finding.
