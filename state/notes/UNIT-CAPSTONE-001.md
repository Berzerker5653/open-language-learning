# UNIT-CAPSTONE-001 — section capstone review node (frozen contract)

Market pattern: Busuu Checkpoint / Rosetta Milestone / HelloChinese Pit Stop
(PROGRESSION-UX-AUDIT-2026-11-22 §B8, the "ship now" B8-lite row). Every
section of the journey ends with ONE review node that mixed-recalls what the
section taught. It unlocks only after the section's units are done, and
passing it completes the section (the header counter's last slot flips).

Pedagogy, not gamification (ADR-0002 posture, owner stance pending ADR
amendment): no XP, no celebration copy, no badges. The node's ring, the
header counter, and plain honest words carry the signal.

## Section definition (frozen)

A section is exactly what the frontend `pathSections` renders: the band
ladder, keyed `band.trim().toLowerCase()`, unlabeled units under `other`.
The engine's capstone synthesizer uses the same key so a capstone node
always lands in the section its band names, as the LAST node of that
section.

## Capstone node (engine-synthesized, NOT pack data)

`unit_path_at` appends per pack, per band that has at least one rendered
unit AND a non-empty recall pool:

- `unit_id`: `capstone.<pack_id>.<band-key>` — reserved prefix; real unit
  ids are pack ids and can never collide (they start with the pack's own
  namespace like `ru.unit.*`).
- `kind`: `capstone` (a NEW kind alongside letters|listening|speaking|words;
  `unit_kind` itself is unchanged).
- `title`: `Section review`; `summary`:
  `Mixed recall of the letters and words of this section.`
- recall pool: the section's units' content refs split by namespace —
  segment[1] == `orth` = letters, segment[1] == `lex` = words. Sentences,
  grammar and journey refs are not directly recallable by the existing
  runners, so they are not in the pool (the capstone recalls LETTERS and
  WORDS, per the card). Pool empty → no capstone node for that section.
- `refs_total` = pool size (deduped); `refs_done` = pool refs holding
  evidence at >= Introduced. The ring fill = honest section-wide recall
  coverage.
- `locked`: true while ANY other rendered unit of the section is not done.
  `unlock_hint`: `finish this section's units first`.
- `done`: a passed capstone attempt exists in storage (see below).
- `in_progress`: at least one failed attempt exists and none passed.
- `current` false, `review_due` false, `due_count` 0 (a passed section
  review is durable; it does not re-open).

## The session (engine-built, reuses the existing runner)

`capstone_plan(profile_id, pack_id, band) -> PlanView`:
- pool selection is deterministic: letters and words each sorted by id,
  interleaved LETTERS-FIRST (L,W,L,W,…), short side exhausted → long side
  continues; cap 16 items.
- every item: letters -> `orthography-recognition` runner, words ->
  `recall-meaning` runner (the two runners that grade without audio or
  ASR — the review must run anywhere). `reason`: `capstone`, `kind`:
  `review`, `est_seconds` 30.
- frontend runs it through the existing session queue (session id rides
  `practice_submit`'s `session_id`, so attempts group as
  `<session>:<content_id>` exactly like plan sessions).

## Pass rule (frozen)

`capstone_complete(profile_id, pack_id, band, session_id)` recomputes the
same selection engine-side (the UI never claims scores) and counts an item
as recalled when an evidence event carries
`attempt_group_id == "<session>:<content_id>"` with score Correct.

- `items`: selection size. `correct`: recalled items.
- `passed`: pool >= 4 → `correct * 5 >= items * 4` (80%, the Busuu-style
  checkpoint bar); pool < 4 → every item recalled (tiny sections need a
  clean sweep).
- stopping a session mid-way records NOTHING (only completing the review
  is an attempt).

## Storage (migration v11)

`capstone_attempts(profile_id, pack_id, band, session_id, items, correct,
passed, at)` — PK (profile_id, pack_id, band, session_id). Every attempt
is recorded honestly; `done` reads only passed rows.

## Frontend posture (calm-but-warm, ADR-0002)

- header counter counts ALL nodes including the capstone; copy becomes
  `{done}/{total} done` (the capstone is not a unit, so "units done"
  would lie on the last slot); passing the capstone flips the last slot.
- unlocked + not done: a real 44px+ control "Start section review" on the
  node; done: caption "Section review recorded"; locked: the engine's
  unlock hint.
- after the session: one plain fact line (aria-live): "Section review
  recorded — {correct} of {items} recalled." plus either "{friendly}
  complete." or "Not passed yet — keep practicing this section, then run
  the review again." NO congrats/XP/celebration tokens.
- the pin can land on an unlocked capstone (it is then the learner's
  live spot), per PATH-PIN-CONSISTENCY-001's single-pin rule.

## Honest RU numbers (dev pack)

Sections: on-ramp 20 units / A1 90 / A2 102 / B1 203 / B2 403. On-ramp
pool: 34 orth letters + the section's lex words; every section's capstone
runs at most 16 items (~8 minutes by the engine's own 30s price).

## Gate tier (LANE)

`cargo fmt --all --check`; `cargo test -p lts-storage`, `cargo test -p
lts-desktop --lib capstone` + the unit_path suites; `cargo clippy -p
lts-storage -p lts-desktop --all-targets -- -D warnings`; `npx tsc
--noEmit`; `npx vitest run`; red-first capture: the live path shows the
locked capstone node at the section end with the unlock hint (same
serve-mode harness as the PATH-FEEL lanes).
