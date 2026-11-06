# BUTTON-AFFORDANCE-001 — note + evidence (closed 2026-11-06)

## Root cause
`packages/ui/src/styles.css` base `.btn` set layout only: `border: 1px solid transparent`,
no background, no colour, no hover state. Every bare-`btn` control (seven files) therefore
rendered as grey text — visually identical to, or weaker than, genuinely disabled siblings.
Owner finding S-4 (S-06 in the 2026-10-21 findings register).

## Fix (smallest coherent slice, design tokens only)
- `.btn` rest: `border: 1px solid var(--line-strong)`, `background: var(--surface)`, `color: var(--ink)`, pointer cursor.
- `.btn:hover:not(:disabled)`: `background: var(--surface-sunk)`, `border-color: var(--ink-faint)`.
- `.btn:disabled`: `opacity: 0.45`, `color: var(--ink-soft)`, `border-color: var(--line)`,
  `background: var(--surface-sunk)`, `cursor: not-allowed` — enabled-vs-disabled is
  distinguishable by shape/border/text weight, not color alone (K-rule: no state by color alone).
- Variants untouched. Specificity check: `.btn--primary:hover:not(:disabled)` (0-4-0) still
  outranks the new base hover (0-3-0); pinned by test.

## Why base-class styling instead of adding variants at 13 call sites
The base treatment fixes all seven files at once, cannot be forgotten by future call sites
(inventory test catches additions), and keeps `btn--quiet` visually consistent (it already
used the same surface/line treatment).

## Verification (all post-change)
- `apps/desktop` vitest: **314/314** across 43 files, including the new
  `apps/desktop/src/button-affordance.test.ts` (5 contract tests: rest, hover, disabled-differs-beyond-opacity,
  primary-hover override, bare-btn file inventory = App/hub/lesson/onboarding/settings/shadowing/words).
- `packages/ui` vitest 10/10; `tsc --noEmit` clean in both packages.
- No new dependencies; no markup changes required by acceptance alt-1.

## Pending
Owner visual acceptance (activity=awaiting-human-acceptance): Shadowing Play/Record/Stop
should read clickable; disabled Previous should read clearly disabled.
