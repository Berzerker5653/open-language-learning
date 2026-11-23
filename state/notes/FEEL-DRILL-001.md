# FEEL-DRILL-001 — session/drill feel (player polish on top of the motion foundation)

## Contract (frozen at card open)

FEEL-GLOBAL-001 shipped the tokens, keyframes, and pressed states app-wide.
This card applies that language to the DRILL surfaces named by the owner's
audit — every claim below carries a legend from the committed target mockup
`state/evidence/FEEL-TARGETS-2026-11-22/drill.png` (the card attachment
`drill.png` is the same image):

1. **Session bar eases its width** — `.session-bar-fill` gets
   `transition: width var(--dur-slow) var(--ease-out)`. The inline width in
   session-chrome.tsx keeps changing per-card; today it snaps. Measured
   MID-GLIDE (a rect width strictly between old and new ~100ms after the
   step lands) by `scripts/drill-feel-capture.mjs`.
2. **Reveal on the graded pick (practice.tsx choices)** —
   - correct reveal: `choice === correctChoice` while graded gets
     `choice--correct` (was only on a miss — now also on a correct pick):
     ring scales in + soft `--ok-soft` fill fade at `--dur-fast`, via a
     `choice-reveal` keyframe, plus a round check badge (`::after`) —
     state is ring + check, not color alone;
   - the tapped choice is tracked inside PracticeRunner (local state reset
     on task change) and gets `choice--tapped` while graded; a wrong tap
     adds one `shake-x` (once, `--dur`);
   - all other choices get `choice--dim` (opacity + transition) as the
     answers lock.
3. **`.session-summary` / `.session-panel` get real rules** — they render
   today with ZERO CSS (home.tsx). Calm warm card: `--surface` fill, quiet
   1px `--line` outline, `--radius`, generous padding, entrance `card-in`
   keyframe (fade + 0.98→1 scale over `--dur`). Single quiet outline per the
   mock — no accent border, no confetti, no badges, no reward words
   (ADR-0002 scan stays green).
4. **Bridge fade (regression)** — the inter-activity bridge entrance
   animation (`fade-up`, shipped by FEEL-GLOBAL-001) must still compute
   after this lane; the capture re-proves it instead of trusting it.
5. **Step dots in embedded runners** — a small `StepDots` component lives
   next to SessionChrome in session-chrome.tsx (progress semantics family,
   same honesty rules, no reward language). Rendered:
   - placement runner: one dot per question (`placementIdx` /
     `placementItems.length`), current marked, done marked;
   - kanji drill: two dots (meaning → reading), current stage marked.
   Asserted in the mounted journeys (ru-placement + kanji).

## Guardrails (must stay green unedited)

- `apps/desktop/src/button-affordance.test.ts` rule-body pins;
  `apps/desktop/src/a11y.test.tsx` contrast scan (add NO new color tokens —
  `--ok-soft`/`--warn` already exist);
- ADR-0002 banned-token scans (home/session-chrome/path-view tests) — dots
  and motion are progress/motion semantics only;
- `practice.test.tsx` existing pins (miss points at the right choice, never
  states it; `choice--correct` still marks the right choice after a miss);
- global `prefers-reduced-motion` block flattens every duration added here;
- motion budget: only token durations (120/250/300ms ease-out family).

## Verification

- Red-at-base commit first: `apps/desktop/src/drill-feel.test.ts` (static
  contract over styles.css + App wiring) plus new `practice.test.tsx` cases
  (correct pick carries the reveal; others dim) plus step-dot assertions in
  `ru-placement.journey.tsx` and `kanji-decomp.journey.tsx`.
- Real-engine capture `scripts/drill-feel-capture.mjs` (plumbing cloned from
  feel-global-capture.mjs: lts-serve + isolated data dir + headless Chrome
  at 390x844 + raw CDP): start a session, measure the bar fill MID-GLIDE,
  grade a choice and measure reveal (animation name, ring box-shadow, check
  badge content, dimmed siblings), catch the bridge animation, stop the
  session and measure `.session-summary` computed rules (background,
  border, padding, card-in). Red at base / green after, both result.json
  files committed; screenshots banked.
- Lane gates: `npx tsc --noEmit` + full vitest in apps/desktop, prettier +
  eslint on touched files, `python3 tools/audit_learner_copy.py` (frontend
  copy untouched but run anyway), no Rust touched.

## Oracle

- TARGET mock: `state/evidence/FEEL-TARGETS-2026-11-22/drill.png` —
  legend: bar eases 300ms ease-out; correct choice ring scales in + soft
  fill fades 150ms (use `--dur-fast` — token family), wrong taps shake once;
  verdict slides up 8px + fades 200ms (shipped by FEEL-GLOBAL-001);
  end card fades + scales 0.98→1 over 250ms, calm close.
- MARKET sheet (card attachment `sheet-babbel.png`, local-only): real
  drill players put the progress line at top, ring/check on the picked
  answer, and a quiet summary card — match the feel, keep our tokens.
