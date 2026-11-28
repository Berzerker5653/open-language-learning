# FIX-LETTER-DRILLS-001 — RCA (2026-11-28)

## Verdict: REAL product bug (pack data), exposed by a latent test date-dependence

The card's bisect candidate (04bdd7c8) is ruled out: `git diff 576ccccc HEAD --
languages/ru-RU/orthography/` is EMPTY — the RU orthography rows are unchanged
across the whole bisect window. The green/red flip is purely the calendar:

- The drill direction rotates per letter per UTC day: `orth_drill_recognize`
  = fnv1a(content_id#day) % 2.
- The suite was green on a PRODUCE day (answer = symbol `а` — found in the
  choices) and red on a RECOGNIZE day (2026-11-27 17:00 MST onward, day 20785;
  answer = `sound`).

## Failing choice set (captured)

Reproduced at clean HEAD bbc4457d (detached worktree, media hardlinked, no
writers): `test tests::letter_drills_span_two_prompt_families_and_reach_independent ... FAILED`
panic "the drill offers the letter's symbol or sound" (ld-red.log).

For a form->sound day, the choices the learner would have seen for
`ru.orth.cyrillic.a`:

```
['sound o — name о', 'sound m — name эм', 'sound t — name тэ', 'sound a — name а']
```

None is the letter's symbol (`а`) or its sound (`a`).

## Root cause

`schemas/v0.2/orthography-unit.schema.json` declares `sound`
(LETTER-UNIT-MODEL-001: "the sound this letter maps to… The letter→sound /
sound→letter drill dimensions key on this; default derived from `reading` when
absent"). **No RU cyrillic row ever declared `sound`** (0/34), so on
form->sound days `orth_task_build` fell back to the prose `reading`
("sound m — name эм") and served letter-NAME metadata as drill choices —
exactly the surface the letter model forbids ("the drill dimensions key on
sound↔symbol, never on letter-property metadata"). The data-smuggling guard
`case_vocabulary_leak` missed it because it checks the phrase `"letter name"`,
not `"… — name …"`. Learners on recognize days are served a drill whose
"sound" options are prose letter-name copy.

Secondary: the test derived the drill day from `now_secs()/86_400`, so it
rotated green/red with the calendar and masked the product bug on half the
days.

## Fix (honest layer = data + test determinism)

1. `languages/ru-RU/orthography/cyrillic.jsonl`: explicit `sound` on all 34
   rows, extracted VERBATIM from each row's own reading copy (`sound X — name Y`
   → X; soft/hard sign & stress mark → "no sound of its own", their own
   wording). No invented content; schema-legal (`sound` is declared).
2. `apps/desktop/src-tauri/src/lib.rs`: new `drill_day()` seam — production
   reads the wall clock; tests install simulated days via thread-local
   `DrillDayGuard` (RAII, per-thread, restored on drop). Used by both the task
   build and the submit-family stamp (the only two drill-day reads).
3. The test now runs both rotation directions on TWO simulated fixed days
   (recognize + produce, chosen from the fortnight the rotation property pins),
   asserts the choices contain EXACTLY the letter's sound ("a") / symbol ("а")
   — prose would fail the pin — and derives `independent` from two REAL runner
   submits (the old manual `append_evidence` stand-in is gone).

## Not touched (deliberate, recorded)

- `case_vocabulary_leak`'s missing `"name "` pattern: tightening it would turn
  future data regressions into drills-refused-outright (fail-closed = no drill
  at all for learners). The exact-match test pin now guards the surface
  objectively. Candidate follow-up if other packs show the same prose shape
  (check JA kana rows) — with a fallback derivation, not a refusal.
- The richer data split (`reading` → clean `reading` + `name` + `sound`) is
  the fuller design shape (schema's `name` property); this card ships the
  minimal sound declaration only — no other surface reads it differently.
- Published RU 0.5.0 archive still predates this data fix — rides the next
  owner-gated republish.
