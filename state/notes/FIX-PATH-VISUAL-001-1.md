# FIX-PATH-VISUAL-001-1 — sway/label overlap + single pin caption at 390px

Two cosmetic defects left by PATH-VISUAL-001 (owner dogfood on the phone,
named in the t_fca0bed8 worker_result 2026-11-22 15:31):

1. the winding sway pulled rings on top of the label text;
2. three units shared the introduction pool, so three "You are here"
   captions rendered at once and collided.

## Defect 1 — ring-over-label: geometry, and the chosen fix

The wave is `pathSway(i) = round(34 * sin(i * 2π / 6))` px, so the ring
center sits at 0, ±29 px off its column center (34 never survives
rounding at the peak phases). The row grid was `4rem minmax(0,1fr)`:
column center + ring half (3rem ring → 24px, but the CURRENT node's
dial is 3.5rem → 28px) + 29px sway crossed the body column start by
~15px at sway peaks — the ring visually sat on the label.

Fix (rendering only, engine and sway function untouched): the ring
column widens to `6.75rem`. At the worst case (current node, +29px):
ring right edge = 4(padding) + 54(col center) + 28 + 29 = 115px;
body starts at 4 + 108 + 6.4(gap) = 118.4px → 3.4px clearance at every
node index; at the left extreme the ring reaches x=2px — still inside
the row box, so no horizontal page overflow. The label column stays a
straight readable stack: the road winds, the text does not. The
capture harness now MEASURES it: every ring rect vs every label rect
(title/pin/progress/review/hint) at 390px — zero intersections, and
min ring→label clearance 3px recorded (result.json).

Alternative rejected: swaying the whole row (labels would wobble and
risk right-edge overflow at 390px) and shrinking the amplitude (kills
the winding look the owner explicitly approved — the harness keeps
its x-spread ≥ 20px gate, measured 58px here).

## Defect 2 — caption policy (the documented choice)

The engine marks every unit in the introduction pool `current` (three
in the owner's scene) — that is engine truth and the view must not
hide it: every current node keeps its teal current ring.

Policy chosen: **exactly one "You are here" caption renders — on the
FIRST current node in rendered (canonical-ladder) order.** Rationale:
the learner reads the path top-down, so the topmost current node IS
"here"; the other current nodes stay visibly current via their rings
(state ring + arc fill), they just carry no duplicate caption. This
is a caption policy, not a state policy — nothing engine-derived is
suppressed.

Implementation: `PathView` computes `pinTarget` (first current node in
section order) and gates the caption on `n.unit_id === pinTarget`.
vitest `path-view.test.tsx` pins the rule (three current nodes → one
caption, on the first); the capture harness gates DOM caption count
≤ 1 while the API reports its real current list (this run: 1 DOM pin
over 3 API-current units).

## Verification actually run (see state/evidence/FIX-PATH-VISUAL-001-1/gates.log)

- scripts/path-visual-capture.mjs gained two machine gates:
  ring∩label bounding-box intersection (fails on any real overlap)
  and pin-count ≤ 1; `OUT_DIR` retargets evidence per card.
  17/17 PASS at 390px on the final committed tree (capture-run.log,
  result.json), screenshots path-journey-pin-region.png +
  path-journey-full.png; both vision-checked.
- vitest apps/desktop 490/490 (new single-caption case), pnpm -r
  typecheck green, eslint clean, prettier clean repo-wide,
  cargo fmt --all --check green (Rust untouched → no scoped
  cargo test/clippy for this lane).

## Controller hygiene shipped alongside (separate chore commits)

CI's web job had been red since before this lane: `pnpm fmt:check`
flagged 5 tracked files, and once fmt was fixed, `eslint .` exposed
~30 pre-existing errors in scripts/* (missing `fetch` global for the
Node capture scripts, empty `catch {}` blocks, dead initializers,
unused imports). Fixed mechanically: eslint config declares the Node
globals and ignores build-output/evidence dirs; the scripts get
commented catches and dead-code removal; one unused type import left
App.tsx. All 22 capture scripts pass `node --check`; my own capture
re-run green on the final bytes.
