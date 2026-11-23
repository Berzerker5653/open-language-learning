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

## RESUME RECIPE (run 204, near cap — code DONE+committed, capture walk only)

> COMPLETED by run 205 takeover — see RUN 205 CLOSEOUT at the end of this file.

State: e34781bd card, 993c8b9d red vitest (log banked), 6db2c26b capstone-wiring chore,
a7d4da1f ALL lane code (543/543 vitest + tsc + eslint + prettier + learner-copy green at
commit). Capture script scripts/drill-feel-capture.mjs exists (uncommitted, tested: BAR
TRANSITION check PASSES live in the real engine; the walk has 2 known bugs left):

1. sampleBarThroughAdvance returned samples:[] — the `.session-bar-fill` probe found no
   element although the same selector worked minutes earlier. Suspect: after Start
   practicing + grading, the walk's Continue click (i===3) had already advanced and the
   runner/bridge swap removed [data-session-chrome] (bridge screen has NO session chrome!
   probe during bridge => null). Fix: sample BEFORE/at the click, keep sampling across
   the bridge gap (nulls tolerated, already coded) — and treat done-increment as
   happening on the CONTINUE click, so sample every ~40ms for the full 1.5s window.
2. The second activity is lesson-gated again: the bridge loop (section 2) must also
   click 'Start practicing' before polling for choices (same one-liner as the walk
   loop). Also poll runnerKind (choices|typed|graded), not only choices.

Remaining steps (takeover):
1. node scripts/drill-feel-capture.mjs (SERVE_BIN=target/debug/lts-serve already built,
   SERVE_DIST=apps/desktop/dist already GREEN) -> all checks green
   -> state/evidence/FEEL-DRILL-001/capture/.
2. RED at base: `git checkout 6db2c26b -- packages/ui/src/styles.css apps/desktop/src/practice.tsx apps/desktop/src/App.tsx apps/desktop/src/session-chrome.tsx` (tree is CLEAN, work is committed), rebuild dist, run capture with OUT_DIR=state/evidence/FEEL-DRILL-001/red-at-head (expect BAR checks FAIL), then `git checkout HEAD -- <same files>` + rebuild dist GREEN.
3. gates.log (vitest 543/543 at a7d4da1f, red-vitest.log banked, capture red/green counts),
   evidence commit (scripts/drill-feel-capture.mjs + state/evidence/FEEL-DRILL-001/**),
   ledger flip (done + evidence paths incl capture result.jsons, active_task null),
   python3 tools/validate_handoff.py, ledger commit, push, kanban_complete.
4. NOTE for ledger/summary: chore 6db2c26b wired the capstone App->Home props
   (dead feature on main since UNIT-CAPSTONE-001; suggest planner REVIEW or a journey-test
   follow-up card — harness has no capstone fixture).

## RUN 205 CLOSEOUT (2026-11-23)

Executed the recipe with two corrections:
1. Base for the red capture is 993c8b9d, NOT 6db2c26b — the chore at
   6db2c26b swept run-204's WIP StepDots call sites into App.tsx and cannot
   build (session-chrome.tsx there lacks the export). Verified by building a
   detached worktree at each; only 993c8b9d builds.
2. The live capture caught a cascade bug: after grading, .btn:disabled
   outranked the choice state classes, killing the reveal fill, the ring
   border and the dim. Fixed at fdfa726b (.btn.choice--correct/.btn.choice--wrong/
   .btn.choice--dim after .btn:disabled). Pin suites untouched and green.

Final: capture red 3/10 at 993c8b9d vs green 10/10 at fdfa726b; all lane
gates green at the fix commit (gates in state/evidence/FEEL-DRILL-001/gates.log).
