# PATH-PIN-CONSISTENCY-001 — one pin on the track = the in-progress unit

## Verdict

The journey track now carries exactly ONE "You are here" pin, and it always
marks WHERE THE LEARNER IS: the first in-progress unit in rendered (band
ladder) order, else the first not-done unlocked unit. The plan's
recommendation ("what to do next") can never claim the pin; when it names a
unit other than the pinned one it renders as a separate "Next up:" chip in
the path header strip. Auto-scroll on load lands a little BEFORE the pin
(pin centered in the viewport, never glued to the top edge) so the context
above the pin stays visible.

## The complaint (owner dogfood 2026-11-22, complaint 10)

`state/evidence/DOGFOOD-2026-11-22/complaint-10-path-branch-order.jpg`:
node 1 (А а О о М м Т т) honestly rendered "In progress (3/4 learned)"
while the "You are here" pin sat three nodes later on Б б П п Д д Г г —
the plan's next-NEW-material suggestion. Two different questions answered
with one marker ("where I am" from unit state vs "what to do next" from
the recommendation) read as "the course starts mid-branch".

## Design rules (binding for future path work)

1. **Pin = position, chip = action.** The pin is derived from unit state
   (in_progress first, then first not-done unlocked node in ladder order) —
   never from the plan/offer pool. The engine's `current` flag stays visible
   as the node's current ring (engine truth is never hidden — the
   FIX-PATH-VISUAL-001-1 precedent stands), but `current` alone can never
   produce a pin caption.
2. **One affordance per question.** A next-up offer for a DIFFERENT unit
   rides a `.path-next-up` chip between the "Your path" header and the
   track (market pattern: position pin on the trail, action chip in the
   header strip — see the card's market contact sheet). Tapping the chip
   jumps the journey to the offered unit (opens its band if collapsed).
   When the offer names the pinned unit itself, the chip is absent — no
   duplicate affordance.
3. **Arrival shows history.** Auto-scroll on load centers the pin, so the
   viewport top lands a little before it; completed/started rows above the
   pin stay visible. The after-session jump (`scrollToUnit`) takes over the
   scroll when set.
4. The band section that opens by default follows the pin (was: the section
   holding a current node) — same single answer.

## Engine side

No Rust changes. `unit_path`'s `current` and `current_offer` were already
honest; the contradiction was purely a rendering-ownership mistake — the
UI let the recommendation wear the position marker.

## Red tests first (vitest, src/path-view.test.tsx)

- pins the in-progress unit even when the plan offers a later unit (RED:
  pin was on the offered node);
- nothing in progress → pin on the FIRST not-done unit, not a later offered
  one (RED);
- offer on another unit → header chip exists above the track, still exactly
  one pin, offered node keeps no pin (RED);
- offer names the pinned unit → no chip, no duplicate (guard).

## Real-engine acceptance capture (10/10 PASS at 390x844)

`scripts/path-pin-consistency-capture.mjs` — seeded the owner's shape on
lts-serve (two fully drilled units DONE + the cumulative stress-review unit
IN PROGRESS 8/36; the engine marked THREE units current, reproducing the
owner's mismatch spontaneously):

- exactly one `.path-node-pin`, riding the rule's unit
  (`cyrillic-stress-review`), while `current_offer` named
  `cyrillic-r-v-u-kh` (another unit);
- `Next up: Printed Cyrillic: Р р, В в, У у, Х х · ~3 min` chip measured
  ABOVE the track, never a pin;
- load scroll (the script scrolls NOTHING — the app's own behavior):
  pin top at y=384 inside the viewport, 5 rows of context above it;
- before/after: owner's complaint shot vs
  `state/evidence/PATH-PIN-CONSISTENCY-001/path-pin-region.png` +
  `path-pin-full.png`.

## Gates

vitest 494/494 (incl. 4 new), tsc + eslint + prettier clean on touched
files, cargo lts-desktop lib 230/230 (one dictation ASR test flaked
"engine-error" under parallel load on the first full run; green standalone
twice AND on the full re-run — pre-existing flake, lane touched no Rust),
lts-storage green, clippy -D warnings clean, cargo fmt clean,
audit_learner_copy 0 findings, validate_handoff PASSED.
