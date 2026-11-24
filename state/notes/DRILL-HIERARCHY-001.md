# DRILL-HIERARCHY-001 — answer tiles dominate, session controls demoted, audio row aligned

Oracle: state/notes/UI-VERIFY-2026-11-23.md defect 2 (live phone audit). The WHAT was
frozen by the card; the HOW (sizes, weights, divider) is agent-decided per the owner's
content-quality delegation.

## Contract (frozen)

- Red-at-HEAD geometry/DOM check at CDP 390x844 mobile:true on the live serve BEFORE
  fixing; the red numbers committed; then the fix; then a green capture with the same
  script.
- Answer tiles = the dominant tappable objects; Pause/Stop = quiet secondary chrome
  (smaller/lighter, visually separated); tiles >= 44px (prefer taller); audio row on
  the same content grid as the tiles.
- FEEL-DRILL state semantics intact: the `.btn.choice--correct` / `.choice--dim`
  re-declaration AFTER the generic `.btn:disabled` rule stays untouched; new rules
  only, no state-property declarations that could re-rank the cascade (run-205 lesson).
- Lane gates green (tsc + vitest, no Rust touched); learner-inspection.md over the
  finished whole; ROADMAP card + task-state record at close (SERVE-BANNER-001 shape),
  validate_handoff green.

## Red-at-HEAD (HEAD 8f7de0c3, scripts/drill-hierarchy-capture.mjs)

1/7 green — G6 tap floor only:
- tiles h=44 (floor, not comfortable), w=176/174 (wrap-row, not the grid);
- Pause/Stop IDENTICAL to tiles: h=44, fontSize 15px, background rgb(255,253,249) fill,
  border 1px — zero hierarchy on every axis;
- controls row borderTop 0px (no separation; gapTop 16);
- Play right edge 329 vs the tiles' 374 grid right (w=313);
- tileBorder 1px == controlBorder 1px (no weight hierarchy).

## Fix (this lane)

- practice.tsx: Choices group hook `drill-choices`; listening audio row hook `audio-row`.
- App.tsx: in-session Pause/Stop row hook `session-exit` (bridge pause untouched).
- styles.css (new block, declared AFTER the FEEL-DRILL state rules):
  - `.drill-choices` stacks (column/stretch/gap 0.6rem);
  - `.drill-choices .btn` min-height 3.5rem (56px), border-width 2px, font-size 1rem,
    left-set type — deliberately NO border-color/background/box-shadow/opacity, so the
    pinned reveal/dim rules keep owning every graded state;
  - `.audio-row .btn { flex: 1 1 100% }` — Play spans the content grid;
  - `.session-exit` hairline divider + right alignment; `.session-exit .btn` 0.8125rem
    soft ink on transparent fill, min-height 2.75rem (the 44px tap floor stays).
- apps/desktop/src/drill-hierarchy.test.ts: rule-body pins, the no-state-property
  guard, cascade-order pins (incl. the FEEL-DRILL post-`:disabled` ordering), wiring.
- scripts/drill-feel-capture.mjs: nav maintenance only — the fresh-profile frontier
  pill label is engine-owned ("Start · N activities"); click its test id first.

## Green (same script, final bytes)

7/7: tiles 56px tall, 358 wide on the 16..374 grid; controls 44px, 13px type,
transparent fill, 1px border, under a 1px divider (gapTop 20); Play right 374 ==
tile right 374; tap floor all >= 44; tileBorder 2 vs controlBorder 1.
FEEL-DRILL live regression (scripts/drill-feel-capture.mjs on the new dist):
10/10 — reveal ring/fill/check badge, dim 0.55, tapped-wrong shake-x, bridge fade-up,
session card, reduced motion all intact.
