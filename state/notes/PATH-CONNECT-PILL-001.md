# PATH-CONNECT-PILL-001 — the winding track must actually connect

Owner dogfood 2026-11-23 (phone 390x844, live serve, image state/evidence/UI-VERIFY-2026-11-23/today_pill.png):
"none of the lines connect and you're starting in the middle — not technically correct."
Owner delegated the HOW to the agent ("you are the expert").

## Root causes (measured, not vibes)
1. **Pill inflates a node row.** The start pill renders INSIDE the pinned node's label area
   (home.tsx ~1713-1735, `.path-node-start`). Its 3-line wrapped label inflates that row:
   measured ring-center pitch N1→N2 = 194px vs every other row = 88px.
2. **Connectors assume a fixed pitch.** Stub angles are computed against `PATH_ROW_PITCH_PX = 76`
   (home.tsx:1225-1232) and attached as `--path-conn-up/down` pseudo-elements. When real row
   height ≠ pitch, stubs hang off the rings but never bridge the gap → orphaned dashes,
   misrouted segments (vision QA: N1→N2 split into two stubs pointing into the pill, N3→N4
   no continuous link + stray stub, N4→N5 offset).
3. **"Starts in the middle."** The pinned/first visible node has no track-head cap, its label
   is displaced ABOVE the node (pill occupies the right side), and the unit card floats between
   the heading and the track — so the track reads as a mid-stream slice with no head.
4. Suspect node icons show the same letter on every node (verify typed glyphs per unit/kind;
   PATH-NODE-TYPES-001 shipped icons — audit that they differ per unit at 390px).

## Fix rules (binding)
- R1 Row pitch is INVIOLABLE: every node row's height = PATH_ROW_PITCH_PX (±0); enforce via CSS
  (fixed row height/`min-height`, content overflow visible). No in-flow element may grow a row.
- R2 The start pill becomes an OVERLAY: absolutely positioned, vertically centered on the pinned
  row, right of the connector channel, ONE line max (shorten label to "Start · 6 activities · ~5 min"
  style; keep data-testid="path-start-pill" and both modes).
- R3 Connector stubs must bridge: with R1 holding, the existing nominal-pitch math becomes correct;
  keep the math, do NOT redesign connectors.
- R4 Track head: the first visible node of the open band gets a drawn head cap (small flag/cap +
  data-testid="path-head-cap") so the visible track reads as a start, and every node's label sits
  RIGHT of its ring (never above).
- R5 Node icon audit at 390px: typed glyph must differ per unit/kind; if all render "A", fix the
  icon source in the same lane.

## Acceptance (capture script, red-at-HEAD first — same script reds then greens)
- A1 consecutive ring-center dy = PATH_ROW_PITCH_PX ±2 for every visible pair in the open band.
- A2 for every consecutive pair, the midpoint of the straight segment between rings lies on drawn
  dash pixels (sample connector pseudo-element geometry) — no orphan stubs.
- A3 start pill is one line (height ≤ 56px) and its rect does not intersect the connector channel
  (x < next ring center x - sway margin).
- A4 first visible node has path-head-cap present; its label rect.x > ring rect.x.
- A5 ≥2 distinct icon glyphs across visible nodes.
- All existing path gates stay green (PATH-VISUAL, FIX-PATH-VISUAL-001-1, PATH-LOCK-ORDER-001,
  PATH-PIN-CONSISTENCY-001 vitest contracts).

## Evidence oracle
Before: state/evidence/UI-VERIFY-2026-11-23/today_pill.png (broken). After: same capture script
green at 390x844, committed to this card's evidence dir.

## Related follow-ups (same defect family, separate cards later)
- Phone nav wrap ("Settings" orphan row) — biggest chrome defect, next card.
- Drill session-control hierarchy (Pause/Stop styled like answers).
- Copy fixes: "Meet something newа" spacing, lowercase labels, Settings run-on stats.
