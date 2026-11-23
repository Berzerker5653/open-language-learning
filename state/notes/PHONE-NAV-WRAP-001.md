# PHONE-NAV-WRAP-001 — phone tab bar: one app-like row (bottom tab bar)

## Defect (UI-VERIFY-2026-11-23 audit, defect 1)
At 390px the top route strip wrapped: Settings orphaned on a 2nd row
(DOM y=82, w=358) and the FEEL-GLOBAL-001 gliding underline, anchored to
the nav box, detached 48px below the active tab. Called the biggest
market-authenticity break in the audit.

## Frozen contract (card body)
CDP 390x844 mobile:true on the live serve, red-at-HEAD DOM/geometry:
1. exactly ONE row with every tab, labels legible (no wrap/orphan/clip);
2. active-tab indicator geometrically aligned with the active label rect;
3. every tap target >= 44px. Screenshots red+green + learner inspection.

## Decision (HOW was delegated to the agent)
Market-standard **bottom tab bar** at phone width (`max-width: 44rem`),
not a same-row top fit: the old comment in the phone tier already records
that five labels' intrinsic text (~360px) overflowed a nowrap 390px top
row, and market phone apps put global tabs at the bottom. The nav
detaches from the header (brand line remains the slim top app bar) and
rides the bottom edge as a fixed, opaque one-row bar.

Shape shipped in `packages/ui/src/styles.css`:
- `.routes` (phone tier): `position: fixed; bottom: 0`, `flex-wrap: nowrap`,
  `background: var(--surface)`, top hairline, 0.375rem inner sill +
  `env(safe-area-inset-bottom)`;
- `.tab`: five equal `flex: 1 1 0` slots, `min-height: 3.5rem` (56px,
  above the 44px WCAG floor), `font-size: 0.8125rem` (labels measured
  unclipped at 390px: "My Words" fits ~73px slots);
- `.routes::after` (phone tier): sill + safe area `bottom`, and the
  indicator insets to 60% of the slot, centered (`* 0.6` width,
  `+ 0.2 * w` offset) — a full-slot left-anchored rule read detached from
  the centered word in the learner pass;
- `.page` reserves `calc(4.5rem + safe-area)` under the fixed bar;
- the floating chrome (`.input-mode-bubble`, `.path-jump-to-pin`) lifts
  to `calc(4.75rem + safe-area)` in a block deliberately declared AFTER
  its base rules (equal specificity — source order decides the cascade);
- the word-card bottom sheet keeps covering the bar while open (higher
  z, sheet-modal) — accepted.

Desktop chrome untouched; PATH-WHATSNEXT pin semantics untouched
(nav markup and route buttons unchanged — CSS-only repositioning).

## Pins
`apps/desktop/src/phone-nav.test.ts` (new): phone-tier-scoped ruleBody
pins for the fixed bottom bar, the 56px/13px floors, the inset+safe-area
indicator, the page clearance, and the cascade-order chrome lift.
motion-contract's FEEL-GLOBAL-001 pins pass unedited (base rules intact).
MOBILE-UX-001 audits untouched: the dev-only mobile-screens harness
renders no Routes nav, so its gates measure unrelated layout.

## Evidence
`scripts/phone-nav-wrap-capture.mjs` (real lts-serve + fresh profile +
fresh dist): red at HEAD = 3 FAIL (rowCount 2, indicator dyBottom 48,
position relative at y=130); green at final bytes = 7/7 (rowCount 1,
indicator centered dCenter 0 / w 44 in a 73px slot / dyBottom 0, fixed
flush at 844, opaque, hit-through). PNGs + learner-inspection.md in
state/evidence/PHONE-NAV-WRAP-001/.
