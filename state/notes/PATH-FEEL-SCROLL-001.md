# PATH-FEEL-SCROLL-001 — open the journey centered on my spot; floating jump-back arrow

## Verdict (shipped 2026-11-23)
The journey now behaves like the market's viewport pattern: it OPENS centered
on the pinned ("You are here") unit, and a floating "Jump to my spot" circle
appears bottom-right ONLY once the pin is scrolled out of view, its arrow
pointing toward wherever my-spot lives (up when my-spot is above the view,
down when below). Tapping it glides the pin back to center and the control
hides itself. Red proof: the capture gate scored 4 FAILs at HEAD (the control
did not exist); 11/11 green with this lane.

## What the lane changed
- `apps/desktop/src/home.tsx` (PathView):
  - `pinOffscreen` state + an `IntersectionObserver` watching the pinned node
    against the VIEWPORT (works whether the page or a container scrolls);
    `boundingClientRect.top` decides the arrow direction ("above"/"below").
  - A manually collapsed pinned band unmounts the pin node — the observer then
    reports my-spot gone and the tap re-opens the band instead of scrolling.
  - `jumpToPin`: smooth `scrollIntoView({block:"center"})`; `prefers-reduced-motion`
    flips it to instant (the CSS fade is also flattened by the global reduce block).
  - The control renders inside the path section only when a pin exists
    (`data-testid="path-jump-to-pin"`, `data-visible`, `data-dir`,
    `aria-label="Jump to my spot"`).
- `packages/ui/src/styles.css`: `.path-jump-to-pin` — fixed 52px circle
  (44px+ target rule) bottom-right above the safe-area inset, one accent,
  opacity+visibility transition (never display:none — no layout jump),
  180ms ease-out family; `[data-dir="below"]` rotates the arrow down.
- `apps/desktop/src/path-view.test.tsx`: +2 markup tests (control ships hidden;
  absent when the track has no pin). vitest 497/497.
- `scripts/path-scroll-capture.mjs`: the acceptance gate (dev-only), same
  plumbing as the pin/motion captures (lts-serve + headless Chrome at 390x844,
  raw CDP, no new deps).

## Capture gate — 11 checks, all measured on a real engine
Seeds four fully-drilled (DONE) units + one started unit, then measures the
app's own load scroll (the script never scrolls first):
1. seed honest; 2. home stable (no flicker); 3. pin CENTERED on load
   (|center−422| = 29px ≤ 80); 4. control present but HIDDEN (opacity 0,
   visibility hidden); 5. scroll to bottom → control VISIBLE (opacity 1, in
   viewport); 6. pin truly off-screen above (bottom −589); 7. arrow
   data-dir="above"; 8. tap → pin centered again (411 vs 422); 9. control
   hidden again; 10. scroll to top → pin below viewport (top 4262);
   11. control visible with arrow flipped data-dir="below".
Same script at HEAD: checks 4,5,7 fail and the run aborts at the tap (the
control does not exist) — red-at-head/result.json proves the delta.
Evidence: state/evidence/PATH-FEEL-SCROLL-001/{path-scroll-load,
path-scroll-away,path-scroll-jumped,path-scroll-below}.png + result.json;
red-at-head/ keeps the HEAD capture. A PATH-PIN-CONSISTENCY-001 regression
re-run over the patched DOM lives in pin-regression/.

## Seed nuance (honesty note)
The capture's unitRefs parse counts duplicate refs per activity, so
"all-but-the-last" of the 5th unit still proved its three UNIQUE refs — the
5th unit reads DONE and the pin lands on the next not-done unit. The gate
re-reads the app's live pin for every measurement, so all viewport claims
are about the actual pin; no pin-state claim is made by this card.

## Two-oracle note
Market contact sheet (attached on the board card, third-party, local-only)
shows the pattern: paths open centered on the current node; the floating
white circle with a blue/teal arrow appears at the right edge once scrolled
away, pointing toward the node. Ours matches the pattern with the repo's own
warm-neutral tokens and single teal accent (vision QA of both shots: on-brand,
no FAB at load, FAB up-arrow at bottom-right when away).

## Out-of-scope observation (not touched)
The capture's scroll-end shot shows the sticky app header clipping a node
title mid-scroll (pre-existing chrome behavior, unrelated to this lane's
fixed control). Flagged for the planner to consider a follow-up if the owner
notices it in dogfood.

## ADR-0002 / posture
Motion-not-reward: the control is a navigation affordance (saves scroll
hunting), zero motivation mechanics. Durations stay in the 120–300ms
calm-but-warm family per docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md.
