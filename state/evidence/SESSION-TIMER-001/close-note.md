# SESSION-TIMER-001 — close note (worker t_949aca0f, 2026-11-21)

## Card premise re-verified against its own evidence — it does not reproduce

The card claims the session header showed "0 min left" from the first
question, citing the two dogfood screenshots. Pixel-level re-verification
of BOTH committed screenshots (tesseract at psm 7/8/13, a digit-whitelist
pass, and a glyph-level 8x vision pass) reads the chrome row as:

    1 of 9 · ~9 min left

in complaint-01-session-screen.png AND complaint-04-case-quiz.png. There
is no "0" anywhere in that row on either screenshot; the digits are 1, 9,
~9. The literal complaint string exists nowhere in the renderer, and the
`remainingTimeLabel` guard (`seconds <= 0 → hide`, `Math.max(1, round)`
floor) has been in place since the component shipped (567c799, before the
dogfood session). The card was seeded from a misread of the screenshots
by the chat session that created it.

## What is real and was fixed (the card's acceptance intent)

1. **Derivation was untested.** The remaining-time sum lived inline in
   `App.tsx publishSession` (`q.items.slice(q.index).reduce(...)`).
   Extracted to an exported, unit-tested `remainingPlanSeconds(items,
   index)` in session-chrome.tsx; App now calls the helper. New tests
   pin: full queue priced at session start (header opens with a real
   estimate), completed items dropped mid-session, unpriced queue → 0 →
   label hidden (never "0 min left"), short positive remainder floors
   at "~1 min left".
2. **"about 0 minutes" WAS producible** in two learner-facing strings in
   home.tsx (plan summary line and the "Start today's plan" CTA):
   `Math.round(total_seconds / 60)` prints 0 for any plan priced under
   30s (a single 20s review does exactly that) and the empty-plan
   loading state showed "0 activities · about 0 minutes". Added the
   exported `planMinutesLabel(totalSeconds)`: unpriced (0) → no time
   figure at all; priced under 30s → "under a minute"; otherwise whole
   minutes, with "about 1 minute" singular fix (the old formatting also
   printed "about 1 minutes" for 30–89s plans).

## Acceptance mapping

- header shows a real estimate at start: derivation tested end-to-end
  (remainingPlanSeconds + SessionChrome render asserts "~2 min left",
  never "0 min left"); screenshots confirm live behavior was already
  correct on main.
- unit test for derivation: 4 new tests (session-chrome.test.tsx) +
  4 new tests (home.test.tsx planMinutesLabel + Home render).
- LANE gates green: see gates.log (tsc 0, full frontend vitest 52 files
  / 420 tests passed; no Rust touched; prettier baseline-diff shows 0
  new deltas introduced by this lane).

## Not touched

- The dues-budget line ("N due · about ~M min") already floored at 1
  (existing `Math.max(1, ...)` from SESSION-CHROME-001).
- "1 activities" plural grammar adjacent to the CTA — out of this
  card's scope, left alone deliberately.
