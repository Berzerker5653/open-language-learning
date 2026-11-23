# PATH-CONNECT-PILL-001 — learner inspection (visual-inspection gate)

Viewed the finished whole at 390x844 (fresh profile, harness-spawned lts-serve
on 127.0.0.1:17635, final dist built from the committed sources) as a learner,
not as a harness: `connect-fold0-green.png` (what a learner sees at load),
`connect-band-head-green.png` (top of the open band), `connect-fullpath-green.png`
(beyond-viewport expansion).

## Before vs after, in the owner's words

Before (state/evidence/UI-VERIFY-2026-11-23/today_pill.png): "none of the lines
connect and you're starting in the middle" — orphaned diagonal dashes, a stray
stub pointing into empty space, a 3-line pill inflating one row to 194px, every
ring wearing the same "A" pictogram, no head on the track.

After: the track opens AT a flag-topped head node, every dashed segment visibly
joins one ring to the next at an even rhythm, each letter node carries its own
letter (А, К, Р, Б, Л, Ы, Я, Ц, Щ — verified in the audit's distinctOpen set),
and the single-line Start capsule sits on the current node, one tap from
practice. The learner can trace the whole road with a finger without lifting it.

## Read-as-a-learner checklist

- **What is at the very top:** the section card "Getting started / Pre-A1 /
  0/21 done", then the flag-capped head ring — the path visibly STARTS there
  (the A4 flag is small but reads; grew it to 1.15rem after the first
  inspection flagged it as easy to miss).
- **Where am I:** the current ring carries a teal halo, the capsule, and the
  "You are here" caption under the capsule. Title, capsule and caption are all
  fully legible with clean gaps (8-10px / 5-7px per the crop review) — the
  capsule no longer covers the lesson title, which the FIRST green attempt did.
- **What can I tap:** the capsule is the only start affordance on the first
  screen; one tap reaches the practice surface (BAKEOFF-LIVECAPTURE-001's
  A3 gate shape, unchanged).
- **Does anything locked sit above the current position:** no (pin is row 0 of
  the open band; locked-below posture is preserved from PATH-LOCK-ORDER-001).
- **Does the road connect:** the harness hit-tests every consecutive pair's
  midpoint onto drawn dash pixels (20/20); the viewport screenshots read the
  same way — vertical where the column is straight, diagonal on the sway.
- **Do rows read evenly:** yes — ring-center pitch measured 76.0px on all 20
  pairs; the old ragged 88/106.7/141px rhythm is gone.

## Honest caveats (not fixed in this lane)

- The "Settings" orphan row under the tab strip and the sticky-header chrome
  that the fold0 reviewer flagged are the phone nav-wrap defect family —
  already scoped as the next card per the frozen notes ("Phone nav wrap —
  biggest chrome defect, next card").
- Multiple current rings glow teal at a fresh start (К/Б pool nodes): engine
  truth kept visible per FIX-PATH-VISUAL-001-1 policy; only one pin caption.
- The beyond-viewport fullpath capture's vision pass reported "solid vs dashed"
  segments and letters on locked rings — the harness contradicts both (all
  stubs are the same dashed style; locked markers are 11 identical lock glyphs
  in the audit). Treated as capture-scaling/vision artifact, per the repo's
  "discarded vision hallucinations" discipline; viewport shots + measurements
  are the authority.
- Long unlock hints (a 110px block on greetings-01) now spill symmetrically
  inside the text column instead of growing the row; the row pitch never moves.
  The spill grazes but never overlaps a neighbour's text (verified in the
  band-head shot: no inter-row collisions).
