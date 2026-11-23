# FEEL-PROGRESS-001 — Progress tab fill-in motion, calendar tooltips, zero-state, placement band

## Contract (frozen at card open)

Audit section-5 cluster on the Progress tab. Oracles: the TARGET mockup
`state/evidence/FEEL-TARGETS-2026-11-22/progress.html|png` (also the card's
kanban attachment `progress.png`) plus the market contact sheet attached to
the board card (`sheet-babbel.png` — third-party, local only, never in the
repo). Match the market's feel; keep our tokens and the calm-but-warm posture
(ADR-0002). No celebration copy on placement results (that rides WARM-MOMENTS
only where it already landed).

1. **Dim-progress bars glide their fill in** — both `.dim-progress` sites
   (goal-dimension bars in home.tsx, band-retention bars in memory-stats.tsx)
   animate the fill rect's width from the value LAST SHOWN for that bar
   (0 on first visit) to the current value over the new `--dur-glide: 400ms`
   token, `var(--ease-out)` — the mock's "bars grow from their previous
   value over 400ms ease-out". Implementation: one shared component
   `apps/desktop/src/dim-progress.tsx` (`DimProgress({ pct, keyId, ariaLabel })`)
   with a module-level last-shown map keyed by `keyId`; the rect carries
   `style={{ "--fill-from": "<px>" }}` and CSS `@keyframes dim-glide { from
   { width: var(--fill-from, 0px); } }` on `.dim-progress-fill` (CSS geometry
   width — Chromium/Firefox support it; browsers without it keep the
   attribute width, honest data, just no motion). Class names, the
   `data-progress-pct` attribute, and the exact role=progressbar aria
   semantics of both sites stay byte-identical.
   Motion-budget note: the token literal lives only in `:root`
   (`--dur-glide: 400ms`); every animation/transition declaration references
   it via `var()`, so the motion-contract seconds scan is untouched and
   motion-contract.test.ts is NOT edited. The global reduced-motion block
   flattens it.
   Mock deviation (recorded): the mock's "% label counting up" is NOT
   implemented — the bars carry no visible % label today and inventing one
   would add a number the honesty posture prices as false precision; the
   fill-in motion is the contract, labels stay as they are.

2. **Calendar cells get hover/focus/tap tooltips** — the 12-week grid's 84
   anonymous rects become legible: each in-window cell gains `tabIndex={0}`,
   `role="img"`, and an aria-label `"<Mon D> · N exercises"` (or
   `"· no practice"`), the svg drops `role=img aria-hidden`; the existing
   group summary label stays. Hover/focus scales the cell 1.15x over
   `--dur-fast` (`transform-box: fill-box; transform-origin: center`),
   `:focus-visible` rides a teal ring (`stroke: var(--accent-ink)` + width,
   per the mock's ring cell), and a `.memory-cal-tip` (dark rounded chip,
   `var(--ink)` bg, `var(--surface)` text, upward pointer via ::after,
   `tip-in` fade over `--dur-fast`) fades in under the cell showing the
   same date + summary text — density becomes shape + text + color, never
   color alone (the mock's a11y rule). Tap on touch fires pointerenter, so
   the same path serves taps.

3. **Calendar + bars fill in on arrival** — `.memory-cal-cell` enters via
   `cal-in` (opacity) on `--dur` with a 6ms-per-cell stagger capped at 40
   (`--cell-i` inline var), so the grid draws in like the mock rather than
   snapping. Cells' fill levels unchanged.

4. **Designed zero-state for fresh learners** — when the progress read lands
   and the engine's OWN lifetime facts say nothing has happened yet
   (`learning_facts.days_active === 0 && units_done === 0`), the Progress
   tab renders `ProgressZeroState` (exported from memory-stats.tsx) in
   place of the memory stats strip: dashed-border card, empty-circle ring,
   "Nothing studied yet", "your first session is on **Today**" — honest
   copy, no invented streak/history, fades via `fade-up` on `--dur` (the
   mock's 250ms == `--dur` exactly). If the facts read failed
   (`learningFacts === null`), the strip renders as before — the zero-state
   never claims more than the engine supports.

5. **Placement results get a calm 'what you know' band** — the bare prose
   `<p>Placement complete: X of Y correct...` (the mock-quoted
   App.tsx:4447 site) is replaced by `PlacementResultBand` (exported from
   home.tsx): a `.know-band` card — uppercase eyebrow "what you know",
   count line "X of Y quick checks matched what you already know" (zero-hit
   honest variant: "No foundations were confirmed this time — everything
   stays on the path."), meta footer "Known foundations unlock in Practice
   automatically." (zero-hit variant: "Nothing was taken away — the path
   keeps everything."). Enters via `fade-up`. NO celebration copy: no
   congrats, no emoji, no confetti — calm instrument voice only. The Run
   again button stays as it is.

## Guardrails (must stay green unedited)

- `motion-contract.test.ts` (budget scan sees only `var(--dur-glide)`
  references; token literal in `:root` is not an animation decl),
  `button-affordance.test.ts`, `a11y.test` (no new color tokens — the tip
  inverts existing `--ink`/`--surface`), `loading-feel.test.tsx` (the
  progress skeleton reservations ride untouched), session-chrome,
  rtl-direction, ADR-0002 scans, `progress.test.ts`.
- No Rust/engine changes: `memory_stats`, `learning_facts`, placement
  commands and their Rust pins stay exactly as they are; every change is
  presentation-layer (apps/desktop/src + packages/ui/src/styles.css).
- The honesty contract in memory-stats.tsx (abstain, never fake zeros)
  extends to the zero-state: it renders ONLY on the engine's lifetime facts.

## Verification

- Red-at-base contract test `apps/desktop/src/progress-feel.test.tsx`:
  CSS rule-body pins (dim-glide on the fill, cal-in/hover-scale/tip rules,
  zero-state card, know-band), `DimProgress` fill-from math across two
  mounts (first visit from 0, second from the last shown px),
  ActivityCalendar SSR (per-cell aria-label + tabIndex, svg not aria-hidden,
  tip text source), ProgressZeroState + PlacementResultBand copy.
- Real-engine capture `scripts/feel-progress-capture.mjs` (same plumbing as
  feel-mywords-capture: lts-serve + headless Chrome + raw CDP; the harness
  fakes ONLY the `memory_stats` leg with a canned activity store — its
  engine semantics are Rust-pinned — everything else rides the real
  engine). Measures: zero-state present with correct copy on a truly fresh
  profile (real `learning_facts` = zero); bar computed `animation-name:
  dim-glide` with measured width mid-glide < final < capture settles at
  final; a data-events cell hovered via real CDP mouse events → computed
  scale ≈1.15 + `.memory-cal-tip` text "· 2 exercises"; stagger var present
  on cells. Red at base, green after; screenshots (zero-state, mid-glide
  bars, mid-hover tooltip) in `state/evidence/FEEL-PROGRESS-001/`.
- Lane gates: `npx tsc --noEmit` + full vitest in apps/desktop, prettier on
  touched files (no Rust touched).
