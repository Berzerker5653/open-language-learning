# PATH-FEEL-MOTION-001 — motion pass on the journey road

## Verdict

SHIPPED 2026-11-23. The winding journey path now carries the market's motion
feel (Duolingo-parity for the ROAD): ring fills ease, node taps spring, band
expand/collapse animates in and out, the current node breathes a halo. All
claims are machine-gated as COMPUTED styles in the live app
(`scripts/path-motion-capture.mjs`, 17/17), and `prefers-reduced-motion:
reduce` collapses every duration and stops the infinite pulse.

ADR-0002 check: motion is not gamification. No reward mechanic exists or is
measured — transitions and keyframes only, within the calm-but-warm posture
(docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md): 120–300ms ease-out, 8–12px
rises, one accent, no confetti.

## What shipped

- **RING FILL** (`packages/ui/src/styles.css`): `.path-node-arc` transitions
  `stroke-dasharray 300ms ease-out` (+ stroke 200ms), so when the engine's
  honest proven-ref fraction changes the ring eases to the new value.
- **NODE TAP**: `.path-node-ring` wears a 160ms
  `cubic-bezier(0.34, 1.56, 0.64, 1)` transform transition (spring back);
  the press itself lives on BOTH a JS pointer class (`.path-node--pressed`,
  set by onPointer* handlers in `home.tsx` PathView — touch browsers only
  honor `:active` on elements with handlers, and serve mode runs on phones)
  and plain `:active`. Press scales the ring to 0.9.
- **SECTION EXPAND/COLLAPSE**: opening a band cascades its nodes with the
  `path-node-in` rise+fade keyframe, staggered by `--path-i` (the row index
  the component sets), capped at 10 rows so a huge band finishes under ~0.6s.
  Collapsing keeps the list mounted for one `path-nodes-close` exit
  (180ms, `closingBand` state + 200ms timer in PathView) before unmounting —
  the collapse is seen, not just done.
- **CURRENT-NODE PULSE**: `.path-node--current .path-node-ring::after` is a
  static accent halo that breathes `path-current-pulse` 2.4s infinite;
  killing the animation (reduced motion) leaves the static halo, so "this
  one is now" still reads.
- **DONE CHECK**: `.path-node-marker` pops in (`path-marker-pop`, one
  overshoot, staggered with the row).
- **REDUCED MOTION**: no new opt-out needed — the pre-existing global
  `@media (prefers-reduced-motion: reduce)` block flattens every duration
  and iteration count; the capture proves the collapse instead of trusting it.

## Contract the CSS depends on

- `--path-i` on every node row (markup test in `path-view.test.tsx` pins it).
- `.path-nodes--closing` + `data-closing` while an exit plays.
- `.path-node--pressed` while a pointer is down.

## Provenance / how this card actually ran

Board attempts 1–2 died on model no-reply (protocol violations, no kanban
terminal call) but left the FULL lane uncommitted in the main tree; run 4
adopted the WIP per the shared-dir race rule and re-verified every claim
(see `state/evidence/PATH-FEEL-MOTION-001/gates.log`). The red proof is the
same capture script run at HEAD (red-at-head/, 7/17 with the 10 motion checks
failing); the green pngs/result.json are controller re-runs against a fresh
vite build of the committed bytes; `regression-pin/` re-runs the previous
card's pin capture (10/10) over the motion-patched DOM.

## Two oracles honored

Target mockup: `state/evidence/FEEL-TARGETS-2026-11-22/` motion legends
(300ms fills, 120ms press, spring nodes). Market sheet: the attached
`sheet-duolingo-path.png` contact sheet (local-only, never committed) — ring
fill easing, glowing frontier ring, check medallions.
