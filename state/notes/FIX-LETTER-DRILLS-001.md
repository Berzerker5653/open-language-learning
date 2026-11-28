# FIX-LETTER-DRILLS-001 — contract + record

## Card
`letter_drills_span_two_prompt_families_and_reach_independent` was red on main
and was the last blocker keeping the `lts-desktop` lib suite from full green.
Board card t_703f4b81.

## Shipped (2026-11-28)

- **Product/data fix**: `languages/ru-RU/orthography/cyrillic.jsonl` — all 34
  cyrillic rows now declare the schema's `sound` field (previously 0/34, so
  form->sound drill days served the prose `reading` — "sound m — name эм" —
  as drill choices: letter-name metadata smuggled in through data, a drill the
  letter-model design forbids and a learner can only answer by accident).
  Values extracted verbatim from each row's own reading copy.
- **Determinism seam**: `drill_day()` in lib.rs — the single drill-day read
  (task build + submit family stamp); production = wall clock, tests =
  thread-local RAII `DrillDayGuard`.
- **Test rewrite**: both rotation directions exercised on two simulated fixed
  days; choices asserted as EXACT matches on the letter's sound ("a") / symbol
  ("а") so any prose leak fails objectively; `independent` now derives from
  two real runner submits (one per simulated day), replacing the manual
  `append_evidence` second-day stand-in.

## RCA
See `state/evidence/FIX-LETTER-DRILLS-001/rca.md` (failing choice set captured;
04bdd7c8 bisect candidate ruled out — orthography diff empty across the window;
the flip was the recognize/produce day rotation).

## Deferred / follow-up candidates (not blockers)
- Tighten `case_vocabulary_leak` for the `"… — name …"` shape ONLY together
  with a fallback derivation (refusal alone would strand learners with no
  drill); check whether JA kana rows carry the same prose reading shape.
- Fuller data split `reading` → `reading` + `name` (+ clean sound); the schema
  already declares `name`.
- Published ru-RU 0.5.0 archive predates the data fix — rides the next
  owner-gated republish.
