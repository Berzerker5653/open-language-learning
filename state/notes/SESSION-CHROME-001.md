# SESSION-CHROME-001 — worker notes (market audit U3/U6)

**CLOSED 2026-11-20** — lane shipped on main. No STATUS BLOCK active.

## What shipped
- `apps/desktop/src/session-chrome.tsx` — thin in-session chrome (progressbar
  `role="progressbar"` + n-of-N step + `~X min left` from the engine's own
  summed `est_seconds`; no estimate -> no time figure, never fabricated;
  paused state labeled; counter parks at N of N). Mounted app-wide in
  `App.tsx` while a bounded session runs.
- End-of-session summary (`home.tsx` + `App.tsx` `sessionOutcomeFrom`):
  activities done, **measured** wall-clock minutes (never re-estimated),
  and `Forms you saw:` list capped at 12 with an honest "(N in all)".
- Dues-as-minutes (`home.tsx` review group header): "N due · about ~M min"
  from the same per-item `est_seconds` the planner prices.
- Grade-button interval preview (`words.tsx` + `lib.rs`
  `srs_interval_preview` Tauri command): the prediction comes from the same
  `FsrsSpike` the grade itself applies, read-only; `previewIntervalLabel`
  picks min/h/days, "soon" for sub-second, and the buttons render plain when
  no preview fetched. cargo test `srs_interval_preview_matches_the_grade_it_prices`
  pins preview == grade decision and read-only-ness.
- Graded/formative badges (`hub.tsx`): `gradeKind` on every mode card with
  `data-grade-kind`; Reading copy de-jargoned ("Graded stories" was
  misleading prose). No scoring language on formative cards except explicit
  disclaimers (test enforces per-sentence negation).

## Test-fix note (not a gate weakening)
Attempt-3's own new test `no formative card promises a score...` had two
extraction bugs: the blurb slice ran past `</li>` into the next card
(the badge class name contains "grade"), and its lookahead rejected honest
negations ("nothing is scored or saved"). Fixed at controller pass:
slice bounded at `</li>`; score vocabulary allowed only inside a sentence
that explicitly negates it. Copy itself unchanged.

## Follow-ups (not blocking)
- The preview prices only Again/Good (the ratings `mine_grade` implements);
  if Hard/Easy ratings ever ship, extend `SrsIntervalPreview`.
- `sessionStartedAtRef` is deliberately unpersisted — a stopped-and-abandoned
  sitting reports `minutes: null`, honest rather than guessing.
