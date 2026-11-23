# WARM-MOMENTS-001 — calm-but-warm: ADR-0002 amendment + unit-finish moment + gentle facts

Owner decision 2026-11-22 (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md,
option 2 "calm but warm"). Celebrate unit completions and show gentle
progress facts, keep every manipulation mechanic banned.

## Frozen decisions

1. **ADR-0002 is amended, not replaced.** New section
   "Amendment (2026-11-23): the calm-but-warm carve-out". Allowed:
   unit-completion celebration moment (quiet, honest), gentle facts
   (days active, units completed, time learned) framed as memory not
   debt, optional soft sound cue. Still banned: XP/points, hearts/lives,
   leagues/leaderboards, streak counters, streak-freeze/repair,
   urgency/scarcity copy.
2. **Sound cue: NOT shipped by this card.** The amendment permits it;
   audio feedback on the path is a separate concern (pack audio, mute
   posture). Recorded here so "optional" is auditable.
3. **Days active is a COUNT, never a run.** No consecutive-day logic
   anywhere in the wire, the copy, or the tests. The UI never shows a
   gap, a reset, or a "keep it going" nudge.

## Engine wire (new)

`learning_facts(profile_id) -> LearningFactsView { days_active, units_done }`

- `days_active` = COUNT(DISTINCT substr(occurred_at,1,10)) over the
  profile's evidence_events — days that hold real graded practice.
  UTC date part of the canonical RFC 3339 second shape (storage write
  boundary). Deliberately NOT sessions-based: the `sessions` table is
  dead schema (no writer anywhere in the tree) — do not build on it.
- `units_done` = done non-capstone `unit_path_at` nodes for the profile
  (the capstone checkpoint is a checkpoint, never a unit — same honesty
  rule as the section counter's label).
- `time learned` from the amendment is NOT wired yet: per-session wall
  time lives only in the frontend and is never persisted; showing an
  estimate would invent a number. Deferred until a real session-close
  recorder exists (FV note, honest abstention).
- Registered in `lts_command_table!` (single source: tauri + serve +
  harness) and mocked in `journeys/harness.tsx`.

## Unit-finish moment (frontend, PathView)

When `capstoneResult.passed` is true the calm fact line becomes a quiet
completion card (`data-testid="unit-finish-moment"`, role=status):

- Heading: "Section complete — {friendly}".
- Warm, honest one-liner ("Well done — {friendly} is finished." + the
  engine's recall counts). No congrats/celebration/XP/badge tokens,
  no confetti-theater language.
- What you learned: the section's units (non-capstone node count) and
  the recall pool from the capstone node (`refs_done`/`refs_total`).
- What unlocks next: the next ladder section by friendly name, with its
  live lock state ("open on the path" vs "still ahead"). Last section →
  names the pack honestly.
- `CapstoneResult` grows a `band` field so the card finds its section in
  `pathSections` (never string-matches `friendly`).

## Gentle facts (Progress tab)

`GentleFacts` component (home.tsx) above CanDoSummary:
"{n} days with learning so far · {m} units completed" + explicit
memory-not-debt note ("nothing here resets, expires, or counts
against you"). Abstains entirely when the facts are unavailable
(UI-HYGIENE: never fake the number). CanDoSummary's "not an activity
diary" sentence is re-worded — the app now keeps gentle memory facts
ALONGSIDE capability state, capability stays the authority.

## Banned-token re-scope (re-scoped, not deleted)

- home.test.tsx banned loop: ["streak","day","attendance","xp","points",
  "heart","league","freeze"] (adds xp/league/freeze; "day" stays banned
  on Home — gentle facts live on Progress, never on Today).
- session-chrome.test.tsx: SessionChrome + session summary keep
  /xp|streak|points|reward|badge|celebrat/i — a SESSION end is not a
  unit moment; the celebration lives only on the path card.
- lib.rs plan-json asserts keep streak/heart and gain xp/points/league/
  freeze coverage.
- path-view.test.tsx keeps its "no Congrats / no XP / no badge" asserts
  AND gains the finish-moment presence test (the red-first test).
