# Learner inspection — PHONE-NAV-WRAP-001 (green, final bytes)

Viewed the finished whole as a learner at 390x844 (vision passes over
nav-fold0-green.png and nav-midscroll-green.png), not just the harness.

## What a learner sees now
- The screen opens on the path (frontier node + one teal Start pill +
  "You are here") — the chrome no longer competes with it.
- Bottom edge: one clean row — Today · Practice · My Words · Progress ·
  Settings — evenly spread, none truncated or wrapped; "Today" active in
  teal with a short teal underline centered under the word, sitting a
  few px above the screen edge on a clean sill. Vision verdict:
  "reads app-like and polished... the underline fix reads correctly."
- Scrolled mid-page, the bar stays one row; content scrolls under it
  cleanly; nothing pokes through, labels never obscured.
- Tap feel: five ~73-78px slots x 56px tall — comfortably thumb-sized
  (measured >= 44px in the harness, well above).

## Iterations the inspection drove (before final bytes)
1. First green pass flagged the underline flush against the very bottom
   pixel ("reads clipped") -> added the 0.375rem inner sill.
2. Second pass flagged the rule spanning the whole slot, left-anchored,
   while labels are centered ("doesn't read as belonging to Today") ->
   inset the indicator to 60% of the slot, centered (N3 tightened to
   centered-on-tab, inside-slot, bottom-edge-on-tab).

## Out-of-scope notes recorded for other lanes (not defects of this card)
- Text-only bar (no icons) and serif-first typography remain editorial;
  icon work lives in the FEEL-* component lanes, not this chrome card.
- Active label ink vs underline teal read slightly mismatched — token
  polish, not chrome geometry.
- "Дом" renders in a fallback face inside the new-material card (font
  coverage question for the pack/rendering lane).

## Verdict
The chrome at 390px now reads app-like, not editorial: defect 1 of
UI-VERIFY-2026-11-23 is closed in the finished whole, not just green in
the harness.
