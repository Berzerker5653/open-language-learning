# REVIEW-SESSION-SEQUENCE-001 — Axis (a) SPEC verdict: PASS

Two-axis review of the SESSION-SEQUENCE-001 lane (board t_4264eb60, reviewer run 2026-11-22).
Review-only: no production code changed by this card.

## Lane under review (main)

| sha | role |
|---|---|
| 2c6f328 | run-120 code: goal-graph band locks on NEW seeding + due reviews + RED-then-green test (+ ROADMAP graft, notes) |
| 6bba940 | docs: partial — resume recipe + acceptance finding (honest mid-lane record) |
| 54151f2 | docs: takeover investigation checkpoint |
| a731028 | takeover code: weak_skills gating, fail-CLOSED goal_id rule, fail-CLOSED unclaimed-lexicon rule, poison-test extension, `lexicon_words_outside_the_goal_ladder_are_not_seeded`, K-70 fixture swap (+ evidence, notes) |
| c431333 | ledger close: task-state done + KANBAN row |

ORPHAN-CONTENT-001 (2b13a7b) — separate lane, out of scope; checked only for honesty of the
deferred-limitation handoff.

## Required-by-card, each verified in the diff

1. **NEW seeding gated** — 2c6f328 extends the `locked` set with `goal_locked_new_content()` at
   both `add_new_item_candidates` sites; on current main the two lane sites are
   `lib.rs:2927` and `lib.rs:2974` (`locked.extend(goal_locked_new_content(&units, &goals, derived));`).
2. **Due reviews gated, rows withheld not deleted** — `lib.rs:3385`
   `due_reviews.retain(|r| r.saved || !band_locked.contains(&r.content_id));` — pure plan-route
   retention; scheduler rows untouched (acceptance audit: BEFORE == AFTER,
   5 scheduler_state / 6 evidence_events, `state/evidence/SESSION-SEQUENCE-001/takeover-acceptance-audit.md`).
3. **weak_skills gated (takeover)** — `lib.rs:3393`
   `weak_skills.retain(|w| !band_locked.contains(&w.content_id));` — same lock set as due reviews;
   derived evidence stays on disk (documented decision 3 in takeover-findings.md: unclaimed/already-
   introduced items deliberately NOT hidden from review).
4. **Fail-CLOSED lexicon seeding** — a731028 adds `claimed_by_units` + the unclaimed-entry skip in
   the lexicon stream (`lib.rs:2984` and the skip at the stream site; still live on main as
   `ladder_locked_streams` after ORPHAN-CONTENT-001's rename/extension — the lane rule survives).
5. **Defensive goal_id-absent rule** — `unit_goal_locked` (main `lib.rs:2219`) returns
   `true` for a non-empty goal_id absent from a non-empty goal map (`return true;` at
   `lib.rs:2229` per the a731028 hunk); empty-goal_id and empty-map fixture escapes kept.
6. **Nothing less** — `build_plan` feeds exactly three content streams into `plan_session`
   (due_reviews, weak_skills, progression; `lib.rs:3402-3404`); progression was already gated by
   the pre-existing `goal_is_locked`; NEW seeding gated at the source. All routes now covered.
7. **Red-then-green is real** — `red-test.log` shows
   `session 0: plan served B2-banded content ru.lex.argue.otricanie (DueReview)` FAILED at HEAD;
   `green-test.log` the same test ok. The takeover's measured RED is the live owner-profile read
   `acceptance-home_state.json` (2 argue rows reason `weak-skill` + `ru.lex.argue.kontrargument`
   reason `progression`) — independently re-read this review, matches. Takeover GREEN:
   `takeover-acceptance-home_state.json` plan = 3 cyrillic weak-skills + 3 voicing contrasts,
   zero argue/kontr ids — independently re-read this review, matches the audit.
8. **Test extension matches the decision** — poison evidence now also feeds the weak-skill route
   (two grade-1 attempts each), plus a WeakSkill-reason assertion and `UNCLAIMED_B2_WORD`
   absence in the six-session walk (a731028 hunk; main test at `lib.rs:20135`).
9. **K-70 fixture swap justified** — `ja.lex.food-drink.sakana` → `ja.lex.greeting.konnichiwa`
   (main `lib.rs:16432`): the old word is orphan lexicon content the new fail-CLOSED rule
   *correctly* withholds (measured zero referencing units, takeover-findings.md); the K-70 kana
   contract under test survives (positive seeds line + the パン exclusion assertion untouched).
   This is not a weakened gate; it is the fixture following a deliberate engine decision, with an
   inline comment citing the evidence.

## Nothing more (out-of-scope additions)

- No production change beyond the five rules above plus the forced K-70 fixture line. The commit
  stats confirm `lib.rs`, notes, ROADMAP graft (2c6f328) and evidence/notes (a731028) only.
- ROADMAP graft inside 2c6f328 is the card's own record, not scope creep.

## Honesty of the known-limitation handoff

- Run-122 record (`state/notes/SESSION-SEQUENCE-001.md` + `takeover-acceptance-audit.md`) states
  plainly: 3 `ru.contrast.voicing.*` plan rows were still unclaimed-contrast leaks at takeover
  close, same class as the 161 unclaimed sentences; frozen contract scoped the orphan gate to the
  lexicon stream. The follow-up ORPHAN-CONTENT-001 (2b13a7b, separate lane) shipped the extension
  to contrast + sentence streams and claimed all 8 RU contrasts. Handoff: honest and closed.
- The refuted run-120 premise (undeclared goal_id for kontrargument) was corrected by measurement
  on the installed 0.4.6 pack and recorded as such — no silent grafting.
