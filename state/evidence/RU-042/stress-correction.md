# RU-042 Task 1 — `тотчас` stress correction

Zaliznyak's norm for тотчас stresses the first syllable; the pack's old
reading `тотча́с` (single mark on the second syllable) was wrong.

## Design conflict found and resolved

The task brief names the norm literally as `то́тча́с` (two acute marks —
the Zaliznyak entry does carry both). The repo's stress model rejects any
word with two marks: `crates/langpack/src/audit.rs:748`
(`lexicon_stress_multiple`, Severity::Error — "every Cyrillic word with
two or more vowels carries **exactly one** combining acute"), and
secondary-stress grave at `audit.rs:730` (`lexicon_stress_secondary`,
also Error: "uses combining grave (secondary stress); not supported").
`crates/` is outside this batch's ownership, so the pack-compatible
expression of the correction is the single **primary, first-syllable**
mark: `то́тчас`. The double-mark detail is preserved in the entry's own
`notes` so a human reviewer can see what the dictionary shows. Verified:
with `то́тча́с` the lint exits 1 on `lexicon_stress_multiple`; with
`то́тчас` lint is clean.

## Before/after

`languages/ru-RU/lexicon/narration.jsonl:4` — readings field:

before:
```
"readings": [{"text": "тотча́с", "script": "cyrillic"}]
```
after:
```
"readings": [{"text": "то́тчас", "script": "cyrillic"}]
```

The rest of the line is unchanged except that a correction sentence was
appended to the entry `notes` (documents the Zaliznyak double-mark form,
the one-primary-mark pack constraint, and a pointer to this note). The
surface form (`forms[0].text` = `тотчас`) carries no stress mark and is
unchanged; the stressed field is `readings[0].text`.

Old line, verbatim (pre-edit):

```
{"id": "ru.lex.narration.totchas", "status": "draft", "forms": [{"text": "тотчас", "is_primary": true}], "readings": [{"text": "тотча́с", "script": "cyrillic"}], "glosses": {"en-US": ["at once, immediately"]}, "sources": ["ru-original", "zalizniak-2010"], "generation": {"method": "ai-assisted", "tool": "omp", "model": "strata/qwen3.8-flash-next-iq3_s", "date": "2026-10-05", "notes": "ai-drafted; stress verified against zalizniak-2010 (2026-10-05); human review still required"}, "notes": "Stress and word form verified against Zalizniak 6th ed. (gramdict/zalizniak-2010 checkout c39322c) on 2026-10-05 (see docs/review/2026-10-05-external-pack-review.md). part_of_speech/gender derived 2026-10-05 from pymorphy3 + Zalizniak 6th ed. (c39322c); human review required", "part_of_speech": "adverb"}
```

## Whole-pack sweep for the lexeme

`grep -rn "тотча" languages/ru-RU/` found exactly three hits:

1. `lexicon/narration.jsonl:4` — the stressed reading (fixed above).
2. `media/manifest.jsonl:1483` — the baked-clip row. Its `text` field held
   the stressed lexeme `тотча́с`, and the media validator enforces
   `text == the item's declared reading` (`media_text_not_declared_reading`,
   K-65), so the field was aligned to `то́тчас`. The clip itself was then
   re-baked on GamingPC (2026-10-17) from the corrected reading, so the
   shipped audio and the declared reading agree:

   ```
   .venv/bin/python scripts/generate-pack-audio.py --pack languages/ru-RU \
     --only ru.lex.narration.totchas --force --tts qwen3 \
     --speaker ono_anna --language russian --note "re-baked 2026-10-17 …"
   ```

   New row values: sha256 `b4b4e4902b35d2f9fb9c67e0e97f9e2e41669a1a93a81b6ce669a1b3a010807a`,
   76,844 bytes, 1.60 s, engine `qwen3-tts` / `qwen3-tts-customvoice-1.7b`
   (model_sha256 `a0829281…`, unchanged), `ono_anna`, loudness normalized
   (gain 2.57x, active rms 0.15, peak ceiling 0.70). The 2026-10-12 bytes
   (`abefb681…`, 80,684 bytes) are superseded; the row `notes` say so.

   Two things worth recording for the next person who edits a reading:

   1. `--only <id>` without `--force` did **not** re-synthesize. The reuse
      test at `scripts/generate-pack-audio.py:269-289` compares the bytes
      against the *row's* recorded `text`, and the row had already been
      hand-aligned to the corrected reading, so the stale clip looked
      current and the run reported `generated=0 reused=1`. The same trap
      the docstring warns about (measured 2026-10-12 on five corrected A2
      sentences) — align the row by letting the generator rebuild it, or
      pass `--force`. With `--force` the run reported `generated=1 reused=0`
      and touched exactly one manifest row (`git diff --stat`: 1 insertion,
      1 deletion).
   2. Aural QA was not performed: the new clip was synthesized from the
      corrected string by the locked-in engine, and its stress has not been
      listened to or ASR-checked. That stays a human review item
      (`languages/ru-RU/review/REVIEW_POLICY.yaml`).

   The `.wav` bytes stay gitignored. The **published 0.4.1 archive still
   ships the pre-correction clip**, and the tracked row now demands a hash
   that archive does not contain, so a fresh checkout cannot restore ru-RU
   audio until the owner rebuilds the catalogue and publishes 0.4.2
   (owner gate O-05; see `verification.md` "Consequence for the audio
   restore path").
3. `curriculum/units/210-narration-sequence-01.yaml:4` — `summary: сперва,
   вдруг, вскоре, тотчас and тем временем.` — the plain written form with
   no stress mark; correct as-is, unchanged.

No sentences, assessments, stories or other lexicon shards contain the
lexeme.

## Regression test

The pack test format cannot express this assertion: `languages/ru-RU/tests/`
contains only `README.md` (a plan of future generated suites — no
`*.jsonl` assertion files exist in any pack; `languages/ja-JP/tests/` has
only `README.md` too). Inventing a new test format was out of scope, so the
pin is this evidence note plus the pack version bump (0.4.2) required for
any content change. The `crates/langpack/tests/{validate,audit}.rs` ru
assertions cover script-introduction units and license shape only; none broke,
so neither file was touched.
