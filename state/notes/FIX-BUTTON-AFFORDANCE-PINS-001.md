# FIX-BUTTON-AFFORDANCE-PINS-001 — button-affordance pin tracks the shipped contract

Owner/agent: default lane. 2026-11-24.

## Defect

`apps/desktop/src/button-affordance.test.ts` (the BUTTON-AFFORDANCE-001 pin)
expected `.btn:disabled` to carry `opacity: 0.x`, `color: var(--ink-soft)` and
`border-color: var(--line)` — the 2026-10-23 contract. SECONDARY-SURFACES-001
(07600536, 2026-11-23) deliberately re-pinned the disabled-button contract to
`opacity: 1`, `color: var(--ink-faint)`, `border-color: var(--line-strong)`
("disabled Add button moves from 0.45 opacity to opacity 1 with distinct faint
text + line-strong border + sunk fill" — commit message), and documented that
no other assertions were touched. The affordance pin was NOT re-pinned, so the
suite reds on main (1 of 665) with the pin enforcing the retired contract.

## Fix

Re-pin the disabled-state assertions to the SHIPPED contract (07600536) and
document the superseded contract in the test comment. The inventory pin, the
hover pin and the background-difference pins are unchanged. This is not a
weakening: the test still asserts the disabled state reads as disabled via
color/border/background + cursor — it now pins the deliberate design, not the
pre-image.

## Verification

- `npx vitest run` — 665/665 green after the re-pin (was 664/665 with 1 red
  pre-existing failure on clean HEAD f293ef87)
