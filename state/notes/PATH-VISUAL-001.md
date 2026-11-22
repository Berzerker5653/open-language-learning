# PATH-VISUAL-001 — winding journey render + IN-PROGRESS state + done-threshold audit

Owner dogfood 2026-11-22 (complaint 09b): the Path had honest data but a
flat-list look; the pin sat on unit 2 while the section said "0/20 units
done". Card asked for the Duolingo path grammar (owner verbatim: "I wanted
it to look and feel like the other apps") and an honest reading of started
but unproven work.

## Done-threshold audit — the decision, documented

`done` stays the **evidence floor** exactly as PATH-VIEW-001 pinned it:
every scheduled ref at mastery state >= `Introduced`. Rationale:

- `Introduced` is the policy's proven bar (one valid graded observation
  per ref); a learner who drills the FULL activity set of a letter
  session earns it for every ref, and the unit flips DONE — the card's
  red test. A learner who finished the whole session never sees "0 done".
- An `encounter_complete` row (the authored encounter finished) is
  **exposure, never mastery** (ENCOUNTER-BEFORE-TEST-001 semantics): it
  starts a unit, it can never finish one. Attendance must not flip done
  (PATH-VIEW-001's attendance red test stays true).
- What the audit ADDS is visibility of honest partial progress, never a
  looser bar: `refs_done` counts EVIDENCE-BACKED refs only (state >=
  Introduced), and the section counter counts `done` nodes only.

## IN-PROGRESS state (new, engine-visible)

`in_progress = !locked && !done && (some ref has a derived row at a state
other than Unseen || the unit's authored encounter is completed)`.

- Rendering: partially-filled ring (arc = refs_done/refs_total honest
  fraction, NOT a fake half), label "In progress (n/m learned)".
- The pin ranks above in-progress in `pathNodeState`, but the ring still
  rides the fill fraction — a pinned-and-visited unit shows its arc, so
  "0/20 done alongside a pin beyond it" is structurally impossible: the
  pin's own node is visibly filled to what was proven.
- Section counter = proven-done only, never visits or encounters.

## Winding geometry (rendering only; data layer unchanged)

`pathSway(i) = round(34 * sin(i * 2π / 6))` px — deterministic from node
index (the audit and vitest measure the same geometry every run). Rings
are 48px SVG dials with a dashed connector stub per edge, angled by
atan2 over the nominal 76px row pitch, so variable row heights never
break the track. Section breaks are wide banners (friendly name big, CEFR
gloss small, proven-done count). Locked nodes: dim ring + drawn lock SVG
(never an emoji).

## Evidence gates

1. Engine red/green: `cargo test -p lts-desktop --lib
   letter_unit_goes_in_progress_then_done_as_its_refs_are_proven` —
   untouched=ready; encounter=IN PROGRESS refs_done 0; 3-of-4 drilled =
   refs_done 3 IN PROGRESS not done; all-4 drilled = DONE, never 0/20.
2. UI: `apps/desktop/src/path-view.test.tsx` (fill arc 0.75, label,
   counter counts done only, sway wave in markup).
3. Mobile 390px capture: `SERVE_BIN=$PWD/target/debug/lts-serve
   SERVE_DIST=$PWD/apps/desktop/dist node
   scripts/path-visual-capture.mjs` — seeds unit 1 fully drilled (DONE +
   check), unit 2 all-but-last-ref drilled (pinned, ring 3/4, the owner's
   exact scene), asserts winding x-spread > 0, honest fills, lock glyphs,
   banner name+CEFR, counter == API proven-done. Shots:
   `path-journey-pin-region.png`, `path-journey-full.png`; before =
   `before-390.png` (copy of DOGFOOD complaint-09b).
4. LANE gates logged in `state/evidence/PATH-VISUAL-001/gates.log`
   (cargo fmt/clippy/test lts-desktop + tsc + vitest 485/485).
