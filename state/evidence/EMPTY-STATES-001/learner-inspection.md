# EMPTY-STATES-001 — learner inspection note (390px)

Evidence: `hub-empty.png`, `mywords-empty.png`, `progress-zero.png`, `today-no-plan.png`,
`path-empty.png` + `*.audit.json`. Capture harness (`scripts/empty-states-capture.mjs`,
dev-only) mounted the real surface components with zero learner data at a 390x844
viewport, headless Chrome over CDP — no mocked DOM, no styled stubs.

## Learned as a learner (per-shot)
- **hub-empty**: "Practice" heading, one card with a teal line-art compass glyph,
  title "No language pack is active, so there is nothing to practice yet.", copy
  "Choose a language pack first — every practice mode builds from one.", one button
  "Choose a pack" (44px tap target). No mode cards rendered — nothing that cannot
  run is offered. No horizontal overflow (390 == 390).
- **mywords-empty**: the add-word inputs still render (they are the point of the
  surface), then the designed card: book glyph, "Nothing mined yet.", copy
  "Add a word above or from a story lookup.", affordance "Add a word" rendered as a
  real link to `#mine-surface` (the add form — one real control, not a dead button).
  44px tap target. No overflow.
- **progress-zero**: "Progress" heading, the designed ring glyph (replacing the bare
  CSS circle), "Nothing studied yet" + "your first session is on **Today**", and the
  one honest affordance "Start your first session" (routes to Practice in the shell).
  44px tap target. Honesty guard: still no streak/score vocabulary — the copy names
  Today, the place a session starts, nothing more.
- **today-no-plan**: the Today screen with an empty plan renders the sprout-glyph card
  "Nothing is due right now." + "Come back when reviews are due, or explore new
  material." + "Open practice modes" affordance (routes to the practice hub). No
  activity list, no budget-empty ghost. No overflow.
- **path-empty**: the Today screen with the pack declaring no learning path renders
  the path-glyph card "This pack declares no learning path yet." + "Choose a language
  pack under Settings → Language packs." + "Choose a pack" affordance. (The no-due
  card also renders alongside it — both are honest today-empty signals, per the
  Home surface's contract.) No overflow.

## Honest-state spot check
- Nothing in the five surfaces claims a capability the engine did not report: no
  streaks, no counts, no badges; the hub no longer offers modes that cannot run; the
  My Words affordance points at the add form (a real control), never at a dead "Add";
  Progress's affordance points at Today, the tab that starts a session.
- Glyphs are light line-art (1.5px strokes, currentColor, 32px viewBox), never
  emoji/stock icons; all paint goes through existing tokens (--font-display,
  --ink, --ink-faint, --accent, --surface, --line) — no inline hex in the layer.
- Tests: `src/empty-states.test.tsx` (10 pins, one per surface + the shared contract)
  plus the two journey files updated for the new hub contract (see gates.log).

## Gates
- `npx tsc --noEmit` (apps/desktop) — clean
- `npx vitest run` (apps/desktop) — 77 files, 690/690 passed
- Capture: 5/5 screens show the designed contract at 390px (empty=true, glyph=true,
  title present, affordance present, tap >= 44px, no horizontal overflow)
