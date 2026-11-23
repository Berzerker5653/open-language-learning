# REVIEW-FIX-PATH-VISUAL-001-1 — SPEC axis verdict

Contract under review: `state/notes/FIX-PATH-VISUAL-001-1.md` (caption
policy + gutter math) against the ROADMAP acceptance bullets.
Diff: `e1ee8231` (code: home.tsx view, styles.css, path-view.test.tsx,
scripts/path-visual-capture.mjs). Ledger close `12b920bc` reviewed on the
standards axis only. Parent lane PATH-VISUAL-001 was already reviewed
(REVIEW-PATH-VISUAL-001) — this verdict covers only the defect-fix delta.

## Outcome: approved-with-notes

### Spec items verified

- **Gutter widened exactly as asked.** `.path-node` grid column
  `4rem -> 6.75rem` with the measured rationale as a CSS comment
  (ring right edge 115px vs body start 118.4px at the current node's
  +29px sway peak). No other geometry values changed.
- **Zero ring/label intersections, measured not eyeballed.** The
  harness now walks every `.path-node-ring` rect vs every label-class
  rect (title/pin/progress/review/hint) with `getBoundingClientRect`
  pairwise intersection. `result.json`: ringCount 20, labelCount 31,
  overlapCount 0, minClearancePx 3 recorded. This satisfies the
  acceptance bullet "measured by the capture harness not eyeballed".
- **Exactly one caption per path.** `pinTarget` = first node with
  `pathNodeState(n) === "current"` in rendered section order
  (`sections.flatMap`), caption gated on `n.unit_id === pinTarget`.
  One pin across the whole PathView, not per section. Capture:
  domPins 1 over apiCurrent 3 (r-v-u-kh captioned; b-p-d-g and
  stress-review current-ring without captions).
- **Engine truth not hidden.** Ring styling still keys on
  `pathNodeState(n)` — every current node keeps its teal current ring;
  only the duplicate caption is suppressed. vitest pins this:
  3x `data-state="current"` with 1 caption; `pathNodeState` precedence
  (locked > current > done > in-progress) confirms the fixture's
  current+in_progress node counts as current, so the test semantics are
  what the notes claim. Independent re-run at HEAD:
  `npx vitest run src/path-view.test.tsx -t "You are here"` green
  (file carries one sibling prettier-quote hunk, not this test).
- **Caption policy documented per contract.** Notes state the choice
  (first current node in ladder order, learner reads top-down), the
  rejected alternatives (row sway, amplitude shrink), and that it is a
  caption policy, never a state policy. Code comment cross-references
  the notes file.
- **Engine and sway untouched.** Diff touches only the view component,
  UI CSS, one test file, and the capture script. `pathSway` and
  `pathNodeState` bodies absent from the diff (0 touches); no crates,
  no pack data. `pathNodeState` current-beats-in-progress precedence
  pre-existed (parent lane) — the pinTarget rule rides on it, no
  semantics drift.
- **Asked-but-omitted: none.** All five acceptance bullets hold:
  measured no-intersection, <=1 caption with rings kept + policy notes,
  both screenshots under the card's evidence dir (vision-verified this
  review: one caption on the first teal current ring, two teal current
  rings visible, no ring/text overlap in pin-region or full capture,
  serpentine sway with straight label column), vitest single-caption
  case, LANE-tier gates logged.

### Notes / defects for planner disposal (all capture-harness tooling, none shipped UI)

- **N1 (carries parent D1, still open — re-proven by this lane's own
  result.json):** the seed drills `ru.unit.on-ramp.cyrillic-k-e-n-s`
  11/12 refs aiming for the "three-of-four" scene, but repeated refs
  make the drill a no-op: the API reports k-e-n-s DONE and the check
  measures an incidental stress-review 8/36. The new gates do not
  depend on it, but the harness still cannot stage the scene its check
  name claims. Parent review already named this; no FIX card has
  consumed it yet.
- **N2 (carries parent D2, still open):** the pin-start check stays
  tautological — `pinned.every(n => n.in_progress || n.done ||
  n.current)` where `pinned = nodes.filter(n => n.current)`; always
  true. This lane's diff reformatted these exact lines without
  repairing the tautology.
- **N3 (new, minor):** the intersection gate ignores boxes overlapping
  <=1px on both axes (`w > 1 && h > 1`), and `minClearance` is measured
  only for same-unit labels sitting right of their ring. Documented in
  the script and notes; with measured clearance 3px the real margin is
  honest, but the gate floor is softer than the bullet's literal
  "never intersect".
- **N4 (new, edge):** `minClearance` is `Infinity -> null` in
  result.json when no label lies right of a ring (never occurred:
  measured 3).
- **N5 (scope note):** the 6.75rem gutter is global (no media query) —
  desktop rows get the wide gutter too. Cosmetically harmless (label
  column is `minmax(0,1fr)`), but if the owner ever wants a desktop
  tightening, that is a separate card.
