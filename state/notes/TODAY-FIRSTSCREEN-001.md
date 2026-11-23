# TODAY-FIRSTSCREEN-001 — the first screen IS the path, opened at the frontier

Owner dogfood 2026-11-23 (verbatim): "not starting the user at the first bubble...
click start for 5 minutes or scroll down to see what's learning new or scroll down
even further to see the linear path".

Market rules (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md § MARKET NAVIGATION
RULES): open AT the frontier; the start pill is anchored to the frontier node;
one tap from app-open to first question; meta never on the first screen.

## Contract (binding for this lane)

1. **Start pill on the pin.** `PathView` renders exactly ONE prominent pill
   (`data-testid="path-start-pill"`, class `path-node-start`) INSIDE the pinned
   node's body — the same row as the "You are here" marker. No second pill.
   - Primary action: start today's plan (`onStartPlan`, the moved whatsnext
     CTA = App's `startSession`). Label: "Start today's plan".
   - Fallback (no startable plan today): if the pin's section has an unlocked,
     not-yet-passed capstone node, the pill runs that section review
     (label "Start section review"). No plan AND no runnable section capstone
     = no pill (honest empty-plan copy stays).
   - A pinned capstone node never gets the pill — it already carries its own
     "Start section review" button (UNIT-CAPSTONE-001), the pill would
     duplicate it.
2. **The CTA moves, it is not copied.** When the path renders on Today, the
   old mid-page `session-begin` block is NOT rendered — the pill on the pin
   IS the whatsnext CTA. Without path nodes (packs with no declared path)
   `session-begin` stays as today. Journey clicks on "Start today's plan"
   keep working: the pill carries the identical label.
3. **Frontier in the first viewport.** The existing load-time auto-scroll
   (PATH-PIN-CONSISTENCY-001, `scrollIntoView block:center`) already centres
   the pin; this lane PINS that behaviour at 390x844 with a real-engine
   capture instead of trusting it: after the fresh-learner home settles,
   before any manual scroll, the pinned node's rect must sit fully inside
   the first viewport. Meta (greeting, budget, plan summary) may exist in
   the document but must not intersect fold-0 at that moment.
4. **One tap to the first question.** Tapping the pill lands on the practice
   surface (lesson card or Choices) — measured in the capture.

## Out of scope (other live cards)

- Locked nodes rendering ABOVE the pin (PATH-LOCK-ORDER-001) — do not touch
  lock rendering or node order.
- The serve-mode status banner (SERVE-BANNER-001).
- WSN semantics stay: the one-offer sentence strip and the header
  "next up" chip (PATH-PIN-CONSISTENCY-001) stay where they are — the pill
  is the ACTION, moved from the mid-page block to the pin.

## Gate plan

- Red-first vitest: new `path-view.test.tsx` + `home.test.tsx` pins fail at
  base (no pill, session-begin still duplicated).
- Red-first capture: `scripts/firstscreen-capture.mjs` (real lts-serve, fresh
  profile, CDP 390x844). At the base tree: no pill → FAIL. After: PASS.
  Same harness plumbing as scripts/whatsnext-capture.mjs; red dist built in a
  worktree per the FEEL-DRILL-001 node_modules-farm recipe.
- Lane gates: tsc, vitest (desktop package), eslint/prettier on touched
  files, audit_learner_copy, validate_handoff. No Rust changes.
