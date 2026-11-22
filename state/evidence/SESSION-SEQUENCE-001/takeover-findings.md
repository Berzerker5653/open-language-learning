# SESSION-SEQUENCE-001 takeover — kontrargument investigation + decision (2026-11-22)

Parent runs 119/120 shipped goal-graph band locks (2c6f328) but the owner
acceptance read (:17641, installed pack 0.4.6) still served 3 argue rows:
2 via the ungated `weak_skills` route, 1 via `progression`:
`ru.lex.argue.kontrargument`.

## Measured on the INSTALLED 0.4.6 pack (~/.local/share/openlang/packs/
org.openlanguage.ru-ru.reference/0.4.6, 2026-11-22)

- `ru.lex.argue.kontrargument` exists in `lexicon/argue.jsonl` and in
  media rows, and is referenced by ZERO units — not in any activity
  `content_refs`, not anywhere in any unit YAML (`grep -rn` across
  `curriculum/` matches only `ru.lex.soc.kontrargumentaciya`, a DIFFERENT
  id that unit 688-bal-09 claims).
- All 818 units' `goal_id`s ARE declared in the 0.4.6 goals map (0
  undeclared, 0 empty). `ru.goal.b2.argumentation` is declared
  (goals.yaml line 1536) with 3 hard goal prereqs — so 410-argue-01 IS
  goal-locked and its claimed words (utverzhdenie/otricanie) are withheld.
- The RUN-120 board comment conflated `ru.lex.soc.kontrargumentaciya`
  (claimed by 688-bal-09) with `ru.lex.argue.kontrargument`. The takeover
  recipe's "unit referencing it with undeclared goal_id" premise is FALSE.

## The real hole

`add_new_item_candidates` seeds the NEW pool by iterating the RAW lexicon.
The exclusive goal-lock rule (by design, see the run-120 contract) cannot
lock a content id no unit references — "this rule cannot hide content the
goal graph has no view on." A B2 word the pack ships UNATTACHED to any
unit therefore seeded into day-one plans. Scale: 178/4057 unclaimed
lexicon entries in RU 0.4.6 (families: stories202611 42, nature 15,
housing 10, argue 4, …); repo 0.4.7 tree: 192 RU / 119 JA.

Owner profile (prof-e1799551-…, pack 0.4.6): 5 scheduler rows
(2 poisoned argue + 3 cyrillic letters), 6 evidence events (same targets).
NO evidence/scheduler row exists for kontrargument — its only route is
NEW seeding, so gating the seeding stream is sufficient for acceptance.

## Decision (controller-owned plan gap; recipe premise refuted by measurement)

1. Gate `weak_skills` with the same `band_locked` set as due reviews
   (recipe step 1, verbatim). Evidence rows stay on disk; withheld rows
   return when the unit unlocks.
2. Fail-CLOSED in two places, keeping the fixture escape hatches:
   a. `unit_goal_locked`: a unit whose `goal_id` is NON-empty but absent
      from a NON-empty goals map is locked (defensive; zero effect on the
      current reference packs, measured above). Empty `goal_id` and empty
      goal map stay unlocked exactly as before.
   b. The LEXICON seeding stream: when the pack declares a goal map, a
      lexicon entry referenced by no unit's activities is NEW-ineligible.
      The pack must attach the word to a unit to surface it.
3. `band_locked` for due/weak retention deliberately does NOT include the
   unclaimed-lexicon set: withholding already-introduced items from
   review is the harm this card's contract forbids ("phase gates never
   hide already-introduced items"). A poisoned weak row for an unclaimed
   word would persist; measured: none exists in the owner profile.

## Recorded limitation (follow-up, not this card)

The SENTENCE seeding stream keeps unclaimed entries: RU 0.4.6 has 161,
dominated by beginner `ru.sent.a1.*` material — locking them would remove
useful on-ramp content, and banding them is pack-authoring work. Follow-up
card proposed: claim the ~300 orphan lexicon entries into units (RU+JA) so
the ladder covers them again.
