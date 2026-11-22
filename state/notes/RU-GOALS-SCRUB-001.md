# RU-GOALS-SCRUB-001 — goals layer scrubbed to the letter model

Card: t_094200e2. Authority: `state/notes/LETTER-TEACHING-DESIGN-001.md`
(rule 2: case drills BANNED; rule 6: ratchet in `tools/audit_learner_copy.py`).

## The Next-up string, before/after (verbatim)

`languages/ru-RU/curriculum/goals.yaml`, goal `ru.goal.on-ramp.cyrillic` —
rendered live by `apps/desktop/src/home.tsx` (`Next up: <strong>{nextGoal.description}</strong>`),
owner screenshot: `state/evidence/DOGFOOD-2026-11-22/complaint-09a-duplicate-sections.png` (bottom).

BEFORE:
> Recognize and copy all printed Cyrillic letter case forms and interpret the teaching stress mark.

AFTER:
> Recognize and copy every printed Cyrillic letter, one sound per letter, and interpret the teaching stress mark.

"Stress mark" kept — it is a legitimate taught concept (`ru.orth.cyrillic.stress-mark`).

## All swept rewrites (scripted pass over both packs, all fields)

1. `languages/ru-RU/curriculum/goals.yaml` goal description (above) — "all printed Cyrillic letter case forms" → "every printed Cyrillic letter, one sound per letter".
2. `languages/ru-RU/curriculum/units/019-cyrillic-stress-review.yaml` summary — "Review every printed case form and contrast …" → "Review every taught letter with its sound and contrast …".
3. `languages/ru-RU/assessments/definitions.jsonl` `ru.assess.on-ramp.cyrillic-recognition` criterion — "Recognize all 33 printed uppercase/lowercase pairs …" → "Recognize all 33 printed Cyrillic letters from letter-name or partner-form prompts without a model."
4. `languages/ru-RU/assessments/definitions.jsonl` `ru.assess.on-ramp.cyrillic-writing` criterion — "Copy each of the 66 printed letter forms with the requested case …" (66 = 33×2 — the per-case drill the design bans) → "Copy each of the 33 taught Cyrillic letters legibly, using Cyrillic rather than Latin characters."
5. `languages/ru-RU/curriculum/units/090-time-plans-01.yaml` `prohibited_ambiguity` note — "Russian weekdays are written in lowercase" → "Russian weekdays take no capital initial letter" (rule preserved; wording scrubbed so the violation grep is literally zero).

ja-JP `curriculum/goals.yaml` + units + assessments: zero matches, unchanged.

## Grep-proof (acceptance 2)

`state/evidence/RU-GOALS-SCRUB-001/grep-proof.txt`: the CASE_FRAMING pattern
sweep over `languages/{ru-RU,ja-JP}/{curriculum,assessments}` exits 1 —
**zero matches in source**.

## Ratchet (acceptance 1, rule 6)

`tools/audit_learner_copy.py` v1.5.0 → v1.6.0:
- `CASE_FRAMING_RE` (case form(s) / letter case / letter form(s) / uppercase / lowercase / requested case / upper-lower) now rides unit titles+summaries, NEW scans over `curriculum/goals.yaml` `description:` fields (kind `pack-goal`, the Next-up surface) and `assessments/*.jsonl` rubric criteria (kind `pack-rubric`).
- Bare "case" is deliberately NOT banned (e.g. "Weigh the case aloud", B2 argumentation rubric).
- Hermetic tests in `tools/test_audit_learner_copy.py` (`GoalsScrubTests`): the exact pre-scrub strings are RED; the scrubbed copy + bare-case copy are GREEN. 20/20 pass.

## Gates (LANE tier)

- `python3 tools/audit_learner_copy.py` — 1852 pack files, findings 0 (exit 0).
- `python3 -m unittest discover -s tools -p 'test_audit_learner_copy.py'` — OK 20.
- ru pack gates validate/lint/audit-curriculum/audit-lexicon/audit-licenses/audit-sources — all exit 0 (`state/evidence/RU-GOALS-SCRUB-001/pack-*.log`).
- `cargo fmt --all --check` — clean. No Rust/TS changed; no test or code asserts the old strings (grepped). ja pack data untouched — its zero-match status is carried by the tool run and grep proof.

## Publish train (acceptance 3)

**Ready for 0.4.9.** This card did NOT publish and did NOT bump
`languages/ru-RU/manifest.yaml` (still 0.4.8 = catalog pin). The change is
text-only in goals/assessments — it adds no media rows, so the CI
archive-restore leg is unaffected; the wording rides the NEXT RU publish
(see `lts-pack-audio-qa` → references/pack-release-publication.md). No
0.4.9 republish card existed on the board at completion.

## Deliberately NOT touched

- `docs/adr/0031-...md` quotes the OLD goal string — ADRs are immutable
  decision records; the quote is history, not live copy.
- Dev comments in `lesson.tsx`, `new-pack.py`, `lib.rs`, `pack.rs` that say
  "case forms are attributes" — they state the CORRECT model; banned
  vocabulary targets learner-visible pack copy only.
