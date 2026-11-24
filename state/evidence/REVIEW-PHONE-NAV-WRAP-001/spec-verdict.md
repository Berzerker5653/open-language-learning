# SPEC verdict — PHONE-NAV-WRAP-001 (code d9f4b74d, evidence dcfd823f, ledger 4d40d7ed)

Axis (a): does the diff do exactly what the card asked?

## Contract item-by-item (from tasks/ROADMAP.yaml acceptance + state/notes/PHONE-NAV-WRAP-001.md)

1. **One row holding all five legible tabs at 390px, no horizontal document scroll** — MET. `.routes` in the phone tier (packages/ui/src/styles.css, `@media (max-width: 44rem)`) is `position: fixed`, `flex-wrap: nowrap`, `bottom: 0`, `flex-direction` unchanged (row). Green audit-green.json N1 rowCount 1, labels Today/Practice/My Words/Progress/Settings all present; N1b scrollWidth==clientWidth==390.
2. **Active-tab indicator centered on active tab inside its slot, bottom edge on the tab, safe-area sill** — MET. `.routes::after` bottom = `calc(0.375rem + env(safe-area-inset-bottom, 0px))`, width = slot*0.6, translateX = `--tab-x + slot*0.2` (centered under the centered label). Green N3: dCenter 0, indicatorW 44, slotW 73, dyBottom 0. Red capture confirmed the 48px detached-underline defect pre-fix.
3. **Every tab tap target >= 44px at 390px; bar fixed opaque flush with viewport bottom; floating chrome lifts; page clearance** — MET. `.tab` min-height 3.5rem (56px), `.page` padding-bottom `calc(4.5rem + safe-area)`, `.routes` background `var(--surface)` + border-top. Green N4 small:[]; N5 position fixed, bottom 844 == viewportH, opaque, hit-test IsTab. IME bubble and `.path-jump-to-pin` lifted in a dedicated `@media (max-width: 44rem)` block declared AFTER their base rules (cascade pinned by phone-nav.test.ts).
4. **Desktop chrome + FEEL-GLOBAL-001/MOBILE-UX-001/existing tabs tests unchanged** — MET. d9f4b74d diff touches only packages/ui/src/styles.css (phone-tier rules + new lift block), scripts/phone-nav-wrap-capture.mjs (new), apps/desktop/src/phone-nav.test.ts (new). No existing test/gate file edited.
5. **Red/green 390x844 CDP captures + learner-inspection.md committed** — MET. audit-red.json/capture-red.log (3 FAIL at HEAD), audit-green.json/capture-green.log (7/7), nav-fold0/nav-midscroll red+green PNGs, learner-inspection.md with both vision passes recorded.

## Out-of-scope additions/omissions

None material. The capture script + vitest pin file are in-scope (the card names them in acceptance). The `.routes::after` and lift-block design choices are the contract's own asks. The learner-inspection's out-of-scope notes (text-only bar, token polish, font coverage) are correctly recorded as deferred to other lanes, not fixed here.

## Verdict
**PASS** — no defects on axis (a).
