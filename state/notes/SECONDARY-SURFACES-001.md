# SECONDARY-SURFACES-001 — dashed info boxes + default My Words inputs on the secondary surfaces

Evidence: state/evidence/SECONDARY-SURFACES-001/ (red 9841db99, green this close).

## Root cause

Two independent wireframe leftovers on the Practice/Progress/My Words surfaces:

1. The shared `.empty` rule and the FEEL-PROGRESS-001 `.progress-zero` rule used
   dashed borders (1px / 2px respectively, 8px radius) — they read as wireframe
   placeholders instead of designed cards, on every screen that renders them.
2. The My Words form used plain `<input>` elements with no `type`, so they fell
   back to the UA default style (narrow, 21px, no radius), and the disabled
   Add button sat at opacity 0.45 on the sunk fill — near-invisible and
   unreadable.

## Root cause (measured, not guessed)

`packages/ui/src/styles.css` — `.empty` (line ~723) and `.progress-zero`
(line ~1997) both declared dashed borders. `apps/desktop/src/words.tsx` renders
four `<input>` elements with no `type`. `.btn:disabled` at 0.45 opacity with
the same sunk fill and line border as the rest of the button family.

## The fix (design tokens only; semantics unchanged)

- `.empty` → `1px solid var(--line-strong)`, same radius/surface fill, plus
  `box-shadow: var(--shadow)`. `.progress-zero` → `1px solid var(--line)`,
  surface fill + shadow (was 2px dashed, transparent fill). The onboarding
  warm empty state still animates and carries its accent border-color — the
  style change only kills the dashed hairline.
- `.field > label` gets 0.85rem top spacing between label+input pairs (the
  first label stays flush). `input[type="text"]` focus gains the same
  3px accent-soft halo the select rule carries, flush outline.
- `.btn:disabled` → opacity 1, `var(--ink-faint)` text, `var(--line-strong)`
  border, sunk fill, not-allowed cursor — clearly distinct from the enabled
  solid-accent button.
- The four My Words inputs get `type="text"` (id before type — the RTL contract
  pins attribute order). They are full-width of `.field` and >= 44px tall
  through the existing `input[type="text"]` rule.
- Progress-feel contract updated: the dashed pin is flipped to a solid-card
  pin (the visual contract this card IS). No other vitest assertions touched.

## Evidence gates

- `scripts/secondary-surfaces-capture.mjs` at 390x844 mobile:true on the live
  serve: RED at HEAD 6 FAIL (diagnostic S1/S2/S3/S4/S5/S6) vs GREEN 7/7
  (S7 tap-targets passed both times).
- Gates: `npx tsc --noEmit` clean; `npx vitest run` on the five touched
  contracts (progress-feel, mywords-feel, settings-feel, mobile-audit,
  rtl-direction) = 60/60 green.
- No Rust/pack changes: the existing debug serve binary (`target/debug/lts-serve`)
  serves the rebuilt dist for both the red and green captures.

## Honest residual

The "learner inspection" step could not be performed as a vision pass in this
session: the vision-analysis server does not accept image input. The committed
learner-inspection.md records the objective DOM/geometry evidence in place of
the vision re-read, with the caveat spelled out. The committed green PNGs are
present for a cheap re-read by anyone with image tooling.
