# Russian content review packet — what has no human verdict

Companion to `state/evidence/OWNER-CHECKLIST-2026-10-16.md` §5b. Prepared 2026-10-16 from
`6648da6`, extended on 2026-10-16 with §5-§6 measured on the published tree (`20f994d` + follow-ups).
Raw evidence in this directory:

```
git-ru-040-to-041-numstat.txt   git-ru-040-to-041.log   git-ru-041-to-head.log
audit-content-templates-ru.txt  audit-learner-copy-ru.txt  audit-learner-copy-default-roots.txt
validate-handoff-default.txt    validate-handoff-strict.txt
gh-readback-ru-ru-0.4.0.txt     gh-readback-ru-ru-0.4.1.txt
ru-unreviewed-inventory.txt     fix-ru-stress-blast-radius.txt   fix-ru-stress-replica-main.txt
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

`languages/ru-RU/review/WORKLIST-2026-10-14.md:66-72` set the three new environments at
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

## 5. `tmp/fix-ru-stress.py` — owner-only, and its blast radius is measured

Read, never executed. What it does:

1. Indexes Zaliznyak 6th ed. from `tmp/zaliznyak/dictionary/{Нарицательные,Глаголы}` — 36 files
   (31 + 5), ~94k headwords — and dies at `:23-25` if either directory is missing. Both are
   gitignored (`.gitignore:62 tmp/`; `git ls-files tmp` is empty), so the script cannot run on a
   fresh clone or in CI.
2. Scope: `languages/ru-RU/lexicon/*.jsonl` only — 84 files, 4,015 rows. It reads `forms[0].text`
   and `readings[0].text`, converts precomposed Latin accented vowels into Cyrillic + U+0301, adopts
   a matching-but-differently-stressed Zaliznyak headword (`:59-84`), then a letter repair
   (`:85-90`). It cannot reach the journey sentences, units, goals or media.
3. It writes only `readings[0].text` (`:93`) and then re-emits **all 84 files unconditionally**
   (`:97`); there is no argparse, no dry-run, no backup.

**Measured without running it.** I made a faithful copy of the script with the write at `:97`
replaced by a no-op and an extra print per changed row, and ran that copy. Output:
`ru entries: 4015, readings changed: 1`, and `git status --porcelain languages/ru-RU/lexicon` stayed
empty. One row, in one file:

| file | id | now | proposed |
|---|---|---|---|
| `languages/ru-RU/lexicon/narration.jsonl:4` | `ru.lex.narration.totchas` | `тотча́с` | `то́тча́с` |

Raw capture of that run — the row's own annotations and the licence record included — is
`fix-ru-stress-replica-main.txt` in this directory; the throwaway copy was deleted afterwards.

The difference is real, not a script artifact: the headword in the pinned checkout is `то́тча́с`
(secondary stress on the initial о) at `tmp/zaliznyak/dictionary/Нарицательные/С.txt:81`. It
contradicts that row's own annotations — `"stress verified against zalizniak-2010 (2026-10-05);
human review still required"` and `"Stress and word form verified against Zalizniak 6th ed.
(checkout c39322c) on 2026-10-05"`. So either the 2026-10-05 check dropped a secondary stress mark,
or someone deliberately chose not to print secondary stress for learners. **That is a
Russian-speaker's typographic decision, not an agent fix.** Running the script silently overwrites a
recorded "verified" annotation, which is exactly the kind of change the review record exists to
catch.

Rights: the pack declares this source `CC-BY-NC-4.0`, `access.mode: reference-only`,
`redistribution_allowed: false`, "the dataset is NOT bundled or mirrored in this repo"
(`languages/ru-RU/sources.jsonl:2`). The local `tmp/` copy matches that declaration (verification
only); nothing from it may enter git, and the only durable artefact of a fix is the changed reading
plus the source id already on the row.

If you adopt it: 0.4.1 is immutable, so this is a new pack version — bump, `langpack test`, re-bake
the affected clip if any, republish. The reviewer-visible diff is one token.

## 6. How much of the pack still has no human verdict

All of the numbers below were produced in this session by read-only scans.

- **Depth.** 818 ru unit files: on-ramp 20, A1 90, A2 102, B1 203, **B2 403**. 60 goals: on-ramp 6,
  A1 9, A2 10, B1 13, **B2 22**. **763 units** cite only the two on-ramp grammar concepts
  (`ru.grammar.on-ramp.eto-identification`, `ru.grammar.on-ramp.zero-present-copula`) — A1 64, A2 99,
  B1 200, B2 400 (a further 5 on-ramp units do the same, correctly) — matching the worklist's own
  `:93-95` statement (99/200/400) that these need band-appropriate rework and that bulk-rewriting
  them now "would fake depth". The +68 goal lines and +340 unit lines you published are new surface
  at the top of a shallow middle.
- **Provenance never moved.** `git log --oneline 70ec683..HEAD -- languages/ru-RU/licenses.jsonl
  languages/ru-RU/sources.jsonl` is **empty** while 847 content lines landed. `licenses.jsonl` is one
  row (`lic-ru-original`, pack-original, CC0-1.0); `sources.jsonl` is two rows.
- **Every media row self-declares as unreviewed**: the note "AI output, not a human recording and not
  human-reviewed" appears in 4,856 ru and 4,902 ja manifest rows, including the ten new clips, which
  are now inside an immutable published archive (`members-041pub-ru-RU.txt`, one hit each). There is
  no undo; the only forward path is a reviewed re-release.
- **The tracked worklist is entirely open.** `grep -c '^\s*- \[x\]'` on
  `languages/ru-RU/review/WORKLIST-2026-10-14.md` returns 0 (it uses prose items, not checkboxes), and
  `:95-96` says plainly: "Human review artifacts (calibrated reviewer, `review_status` transitions)
  remain open for every id above." Its bake-obligation section (`:74-89`) was rewritten in this pass:
  it used to assert the ten sentences had no media rows, which stopped being true at 0.4.1. Fixing a
  worksheet's stale facts is an agent-doable edit; **deciding** its items never is.
- **A re-check is due.** `:66-72` kept `ru.env.talk-about-yesterday`, `ru.env.report-a-problem-writing`
  and `ru.env.polite-request-desk` on `recall-meaning`, with the reason given as "no audio exists yet
  … re-check modality choice after the audio bake". The audio exists in 0.4.1, so three shipped
  environments are now arguably mis-modelled — a reviewer decides, code cannot.
- **Maturity.** Every new sentence row is `status: "draft"`, notes "ai-drafted; human review required",
  and `languages/ru-RU/manifest.yaml:10` is still `maturity: "experimental"`. The immutable 0.4.1 pack
  therefore ships content that describes itself as draft.
- **Why "the audits are green" is not a verdict.** `validate_handoff.py` ends with "WARN scope: handoff
  structure checked; SDK completeness, linguistic correctness, source rights, calibration quality,
  build/install/runtime/UX/privacy/security remain unverified"; `audit_learner_copy.py` scans only
  `*.ts`/`*.tsx` under `apps/desktop/src` and `packages/ui/src`, so pack content can never register a
  finding there. The two content findings (`langpack audit templates` → 35 ru warnings) are the
  machine-visible half of the list above.
- **Owner-only ticks for this content** live in issue #1: **R12** (journey coverage) and **R13** (band
  depth), plus the worklist items — none of which an agent may close.

## 7. What a verdict has to look like

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
