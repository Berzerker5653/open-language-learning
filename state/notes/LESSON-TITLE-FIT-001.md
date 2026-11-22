# LESSON-TITLE-FIT-001

## Contract
The ENCOUNTER-BEFORE-TEST-001 vision check flagged the lesson encounter card
title "Printed Cyrillic: А а, О о, М м, Т т" as overflowing its card at 390px
(last glyph clipped). Fix so the title FITS the narrow column at mobile
width; regenerate the lane capture as after-evidence.

## What the repro actually showed (HEAD 3b4f332, before change)
- A live DOM probe (serve + headless Chrome, 390px emulation) found the h1
  ALREADY wrapping (white-space: normal, scrollW == clientW == 358, 2 lines):
  no clipping reproduced against the committed png.
- The committed png's real defect: the wrap orphaned a single "т" on line 2
  (line 1 ended at "…М м, Т"). Ugly, and one hair's breadth from the
  one-line overflow the card describes at slightly wider titles/fonts.
- The teal border framing the title in the png is the :focus-visible outline
  (the heading holds focus after navigation), not a clipping card border.

## Fix shipped
- CSS: `.lesson h1 { text-wrap: balance; overflow-wrap: break-word; }` in
  packages/ui/src/styles.css — balanced lines instead of an orphaned glyph,
  break-word as the unbreakable-token safety net.
- Harness: scripts/encounter-capture.mjs gained a machine fit gate measuring
  the h1's own line rects (scrollW<=clientW, widestLineW<=clientW+1,
  docScrollW<=viewportW) — a regression to real clipping now fails the
  capture run programmatically.

## Acceptance evidence
state/evidence/LESSON-TITLE-FIT-001/ (gates.log, capture-rerun.log,
encounter-panel-after.png, title-after-crop.png). Harness 8/8 PASS at
390px; post-fix widest title line 186.8px inside a 358px column; vision
verdict: no glyph touches the card border or page edge, both letter-pair
lines intact.
