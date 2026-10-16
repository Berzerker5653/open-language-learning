# Russian content review packet — what has no human verdict

Companion to `state/evidence/OWNER-CHECKLIST-2026-10-16.md` §5b. Prepared 2026-10-16 from
`6648da6`. Raw evidence in this directory:

```
git-ru-040-to-041-numstat.txt   git-ru-040-to-041.log   git-ru-041-to-head.log
audit-content-templates-ru.txt  audit-learner-copy-ru.txt  audit-learner-copy-default-roots.txt
validate-handoff-default.txt    validate-handoff-strict.txt
gh-readback-ru-ru-0.4.0.txt     gh-readback-ru-ru-0.4.1.txt
```

## 1. Inventory: every Russian change between the two published versions

`git diff --numstat 70ec6830611ef67a2e54b0305c09f38b58798de6 20f994df05478f92b9d2399bbf655066e21ffda6 -- languages/ru-RU`
(the 0.4.0 tag commit → the commit both 0.4.1 tags point at):

| file | +/− | what it is | human verdict needed for |
| --- | --- | --- | --- |
| `curriculum/goals.yaml` | +68 / −1 | goal edges (`prerequisites` on `ru.goal.a2.past-events`, `ru.goal.b1.practical-problems`, `ru.goal.b2.style-register`) plus their `required_concepts` | pedagogical (is the prerequisite load right?) |
| `curriculum/units/810-a2j-past-day.yaml` | +76 | new journey unit | linguistic + pedagogical |
| `curriculum/units/811-a2j-past-workday.yaml` | +70 | new journey unit | linguistic + pedagogical |
| `curriculum/units/812-a2j-past-revision.yaml` | +72 | new journey unit | linguistic + pedagogical |
| `curriculum/units/813-b1j-problem-letter.yaml` | +77 | new journey unit | linguistic + pedagogical |
| `curriculum/units/814-b1j-problem-reply.yaml` | +71 | new journey unit | linguistic + pedagogical |
| `curriculum/units/815-b1j-problem-revision.yaml` | +71 | new journey unit | linguistic + pedagogical |
| `curriculum/units/816-b2j-style-editing.yaml` | +75 | new journey unit | linguistic + pedagogical |
| `curriculum/units/817-b2j-style-presend.yaml` | +75 | new journey unit | linguistic + pedagogical |
| `curriculum/units/818-b2j-style-revision.yaml` | +75 | new journey unit | linguistic + pedagogical |
| `curriculum/units/010-cyrillic-a-o-m-t.yaml` | +2 | declares the `script-introduction` capability ADR-0031 requires so a fresh ru profile is taught Cyrillic first | technical (does the app actually introduce it first?) |
| `grammar/concepts.jsonl` | +4 | the two new grammar sets the journey units depend on | linguistic |
| `sentences/journeys-2026-10-14.jsonl` | +10 | the journey sentences the 10 new clips speak | linguistic (form, register, gloss faithfulness) |
| `media/manifest.jsonl` | +10 | bake rows for the 10 clips (`ru.sent.{a2,b1}.j{1,2,3}` + `b2.j{1,2,3,4}`) | technical + listening judgement |
| `world/environments.jsonl` | +3 | three new environments | see §4, modality question |
| `manifest.yaml` | +1 / −1 | `version: 0.4.1` | none (mechanical) |
| `review/WORKLIST-2026-10-14.md` | +90 | the reviewer worksheet for this batch | it *is* the queue |
| `media/ru.sent.*.wav` ×10 | binary | the clips | now untracked (ADR-0032 end step, queue item D4); they ship inside the published 0.4.1 archive |

**After publication nothing Russian content-wise moved:** `git diff --numstat 20f994d HEAD --
languages/ru-RU` lists only those 10 `.wav` files leaving git. So the review verdict applies to
exactly the tree whose digest is the published pin.

## 2. Machine signals you may lean on, and what they do not mean

- `python3 tools/audit_content_templates.py languages/ja-JP languages/ru-RU` → ru: **825 sentences
  in 3 files, 818 units, 35 findings**; ja: 831 sentences / 792 units, 92 findings (exit 0).
  Full ru output: `audit-content-templates-ru.txt`. The tool measures **structural repetition
  only** — no claim about CEFR level, linguistic quality or pedagogical validity.
- The specific depth problem for B2: ru `b2` = **400 units on one 2-element grammar set**, with the
  `это _` skeleton repeated 400×. That is why a B2 "reviewed" verdict cannot be waved through on
  counts (board row `upperband-journeys`, card `UPPERBAND-TASK-JOURNEYS-001`).
- `python3 tools/audit_learner_copy.py` → **0 findings** (34 source files); learner-facing copy
  carries no ticket/ADR ids. It says nothing about Russian correctness.
- `.venv/bin/python tools/validate_handoff.py --require-explicit-ledger-records` → PASSED; the
  strict run's WARN list is in `validate-handoff-strict.txt`. Again structural, not linguistic.

## 3. Lexicon queue (the biggest number in the ru review)

`docs/review/worklists/ru-RU-2026-10-05.jsonl` — **534 rows**: `stress-unverified` 316,
`pos-low-confidence` 85, `feature-undetermined` 81, `plural-only-noun` 43, `gender-conflict` 9.
Kit notes: `languages/ru-RU/review/REVIEWER_KIT.md:32-40`. Zaliznyak 6th ed. auto-verifies
3,684/4,000 readings, and an inherent `ё` written without a combining mark is correct, not a
defect — do not let a reviewer mass-"fix" that.

## 4. Questions the audio reopened (no code change can answer them)

`languages/ru-RU/review/WORKLIST-2026-10-14.md:66-71` kept the three new environments at
`recall-meaning` rather than `comprehension-listening` because "no audio exists yet — re-check
modality choice after the audio bake". Audio exists now (baked, and inside the published 0.4.1
archive). A reviewer must decide whether those three environments become listening; that decision
changes `world/environments.jsonl`, needs a review record, and re-publishes the pack.

Per-sentence linguistic checks for this batch are at `:24-33` — e.g. `гулял` gender agreement, the
`неполадку` four-case cloze chain, `опечаток` genitive plural — plus the general rule that cloze
targets appear verbatim and glosses stay faithful in register.

The 18 new clips' **loudness** needs no review (all re-normalise byte-identically at gain 1.00×,
`state/evidence/AUDIO-NORMALIZATION-2026-10-15/NOTES.md:14-23`). What a reviewer judges is the
*character* of each clip and whether it matches the reading shown to the learner.

## 5. `tmp/fix-ru-stress.py` — owner-only, deliberately not run

Read, not executed. What it does (`tmp/fix-ru-stress.py`):

1. Loads Zaliznyak 6th ed. from `tmp/zaliznyak/dictionary/{Нарицательные,Глаголы}` (present here,
   5.0 MB) into a `{letters-lowercased-ё→е: set(stressed headwords)}` index.
2. For **every** row of **every** `languages/ru-RU/lexicon/*.jsonl` — 4,015 rows total — it takes
   `forms[0].text` and `readings[0].text`, converts precomposed Latin accented vowels (`é á ú ó í
   ü ý …`) into Cyrillic + U+0301, and then:
   - if a Zaliznyak headword matches the letters but not the stress position, it **adopts the
     Zaliznyak stressed headword** (`:59-84`);
   - then a letter repair: if the stressed letter-strings have equal length and the stress index is
     preserved, it rebuilds the reading from the form's own letters (`:85-90`).
3. It rewrites each lexicon file **in place** and prints `ru entries: {total}, readings changed:
   {changed}`. The changed-row count is only knowable by running it — that run is yours.

Preconditions and consequences if you run it:

- Worktree must be clean and ideally backed up: it truncates and rewrites four-plus jsonl files with
  no backup and no diff output.
- It is a **pack content change**: 0.4.1 is published and immutable, so the pack must be version
  bumped, `langpack test`-ed, re-baked for any affected media rows, and republished as a new version
  — never patched in place.
- Each changed reading needs provenance: Zaliznyak 6th ed. as the authority belongs in
  `languages/ru-RU/sources.jsonl`/`licenses.jsonl` with its licence and access date, and AGENTS.md
  forbids committing third-party data without redistribution approval — check the dictionary data's
  licence before it ever lands in git (it currently sits in `tmp/`).
- Reviewers should still see the affected rows: the tool is an authority shortcut for **stress**,
  not for meaning, register or part of speech, and the 85 `pos-low-confidence` / 9
  `gender-conflict` / 43 `plural-only-noun` rows are untouched by it.

## 6. What a verdict has to look like

One PR per reviewer that adds `languages/ru-RU/reviews.jsonl` (does not exist yet — the first review
PR creates it) **and** flips the reviewed items off `draft`; a bare flip fails the validator
(`review_promotion_unsupported`). `community-reviewer` caps at `validated`; only
`qualified-human-expert` / `qualified-human-native-speaker` reach `verified`; `ai-assisted` never
promotes. Ceilings and the two-column qualification rule are in
`state/evidence/OWNER-CHECKLIST-2026-10-16.md` §4 and `languages/ru-RU/review/REVIEW_POLICY.yaml:38-63`.

There is no `RU-*-00x` band card in `tasks/ROADMAP.yaml` (only `RU-GOAL-PREREQ-001` and
`RU-MODALITY-PRACTICE-001`): the Russian review demand is carried by the kit and the worklists, not
by band cards. If you want ru band parity with ja's `JA-A1-003`-style cards, that is a roadmap
decision, not a review act.
