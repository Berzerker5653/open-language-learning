# PATH-WHATSNEXT-001 — the never-lost loop (phase 2)

Design authority: state/notes/PROGRESS-PATH-DESIGN-001.md (owner-approved;
"so we're never lost on where to go next"). Board card t_8ec1ddb8.
Trigger 2026-11-22: the owner finished a 5-minute session and had no idea
how to proceed. Depends on PATH-VIEW-001 (64489e8) — reuses its node
components, never forks node states.

## Shipped on main

Engine (apps/desktop/src-tauri/src/lib.rs):
- `current_offer_at` / `current_offer` IPC (shared command table -> serve
  mode gets it too). The Codemm rule: EXACTLY ONE answer — the first
  review-due node in curriculum order if any exists (path order is the
  tie-break, no second priority system), otherwise today's plan's first
  `introduction` item mapped to the unit that activity belongs to. The
  estimate rides the session shape's own price (review 5-min default plan,
  introduction = one lesson step ~3 min), never an invented number.
  `total_due` sums the path's due counts for the Today chip.
- Red-first engine test `current_offer_flips_to_review_first_when_a_review_is_due`:
  fresh learner answers introduction; light ONE due scheduler row in
  greetings-01 and the single answer flips to review naming that unit.

Frontend:
- home.tsx: `NextOffer` + `offerLabel` ("Next: <what, roughly how long>"),
  Today top strip `[data-testid=next-offer]` + earned
  `[data-testid=review-due-chip]` (only when total_due > 0), after-session
  card line `[data-testid=next-offer-card]` inside the Session summary.
  `PathView` gains `scrollToUnit`: two-phase (open the offered node's
  collapsed section first, THEN scrollIntoView once it renders — the
  dead-run's single-phase effect scrolled a node that wasn't in the DOM
  yet) + `data-unit` attributes on nodes. Scroll fires only at the
  after-session moment (`sessionOutcome && nextOffer`) — one answer, never
  two: the strip, the card and the pin all render the same engine offer.
- App.tsx loads `current_offer` on every home refresh alongside `unit_path`.
- journeys/harness.tsx mirror: fixture profiles carry no due rows, so the
  fake world honestly answers "introduction"; the owner unit is derived from
  the SAME schedule-row mapping `unit_path` renders (no invented nodes —
  the dead-run's substring guess fell back to a bogus `.unit.unknown`).
- Journey test `src/journeys/whatsnext.journey.tsx`: strip names the one
  offer, no chip while nothing is due, offered node present, walk a full
  session (finish), after-session card text === strip text, pin node still
  in the path DOM.
- Acceptance capture `scripts/whatsnext-capture.mjs` (real engine via
  lts-serve, 390x844, raw CDP — same plumbing as path-view-capture):
  seeds real practice traffic, asserts introduction-first offer, back-dates
  ONE scheduler row, asserts the FLIP to review-first + chip, walks the UI
  session to its summary, measures the offered node's rect inside the
  viewport. Machine gates + screenshots in state/evidence/PATH-WHATSNEXT-001/.

Gate battery: state/evidence/PATH-WHATSNEXT-001/gates.log.

## REMAINING RECIPE (acceptance close — next worker/takeover)

Code is ON MAIN at ebd96c8. Do NOT re-run the gate battery (gates.log).
Only the mobile capture is open:

1. Probe API-only seeding feasibility: node ~/.hermes/cache/scratch/wsn/probe2.mjs
   with SERVE_BIN=$PWD/target/debug/lts-serve SERVE_DIST=$PWD/apps/desktop/dist
   PORT=17915 (rebuild bin only if lib.rs moved). Goal: >=1 DONE unit and
   scheduler rows. CAUTION: `pkill -f "lts-[s]erve"` must run in a command
   whose OTHER args never contain the string lts-serve (SERVE_BIN=.../lts-serve
   in the same command self-SIGTERMs the wrapper — hit twice on 2026-11-22).
2. KEY FACT: review_due = done && due>0 (unit_path_at). The capture's
   back-date must hit a scheduler row whose CONTENT belongs to a DONE unit.
   Strengthen scripts/whatsnext-capture.mjs: after seeding, iterate —
   back-date ONE earliest row, restart serve, call current_offer; if kind
   is not "review", stop serve and try the next row (bounded ~6 attempts).
   Log every attempt into result.json (flipAttempts).
3. If API-only seeding cannot make any unit done (encounter gating),
   reorder: walk the browser session FIRST (its lesson encounters +
   correct answers write evidence + rows), then back-date a row of a done
   unit, reload the page, and measure the flip on the Today strip + chip
   (acceptance clause 2); clause 1 (after-session card names offer + path
   pin) is measured pre-flip against the introduction offer — the card
   text === strip text check already covers "names the offer", and the
   offered node's viewport rect covers "scrolls the path to it".
4. Run SERVE_BIN=... SERVE_DIST=$PWD/apps/desktop/dist node scripts/whatsnext-capture.mjs
   -> state/evidence/PATH-WHATSNEXT-001/ (result.json + whatsnext-*.png).
   Vision-check 2 representative screenshots.
5. Flip task-state PATH-WHATSNEXT-001 retryable->done (evidence paths
   already legal: notes + gates.log; add result.json), commit ledger, close
   board card t_8ec1ddb8 (unblock + complete --result "code ebd96c8,
   capture <sha>").


## Notes for the next lane

- lib.rs + home.tsx remain collision hotspots (PATH-VIEW + ENCOUNTER +
  WHATSNEXT all touched them).
- PATH-VIEW-001's own screenshot acceptance is still open on ITS card
  (recipe items 1-3 in state/notes/PATH-VIEW-001.md) — not this card's.
- Stray c1.png/c4.png at repo root are Nov-21 junk from another lane —
  do NOT commit.

## CLOSED (takeover t_6cfe22be, 2026-11-22)

Mobile capture acceptance shipped. Harness runs green 12/12 (see gates.log
CONTROLLER CLOSE for the strengthened-harness inventory and the two
reproduced 11/11 runs). Evidence: state/evidence/PATH-WHATSNEXT-001/
(result.json + whatsnext-strip-review-first.png, whatsnext-after-session-
card.png, whatsnext-full-page.png).

Lessons banked for every future serve-capture lane:
- The home pack line FLICKERS to "No language is set" for ~1s after entering
  a profile (offer/path paint before pack claims resolve). Wait for a STABLE
  healthy home (3 consecutive polls) before measuring or screenshotting;
  re-validate after each shot or the png can show a bogus empty-pack home.
- The next-offer strip sits mid-page; a viewport-only screenshot of its
  measurement needs scrollIntoView first.
- UI walks cannot brute-force Correct answers: grading is server-side and an
  activity locks after one graded pick (practice.tsx). Measure answered-
  graded activities in captures; correctness lives in vitest journeys.
