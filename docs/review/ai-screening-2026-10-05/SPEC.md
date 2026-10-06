# Screening spec for model-a (agent model) pass

Batch files: `docs/review/screening-packet-2026-10-05/batches/batch-NNNN-<batch_id>.json`
(sha of packet zip recorded at merge time; batch content identical to the owner zip).

Judge every item per its `kind` (prompts in `../screening-packet-2026-10-05/PROMPTS.md`):

- `lex`: gloss plausibly matches headword core meaning; pos/gender plausible; reading matches form.
- `sent`: sentence grammatical and matches its gloss.
- `assess`: criteria coherent, observable, appropriate for kind/modality.

Flag ONLY clear defects (wrong meaning, ungrammatical, form/reading mismatch, incoherent
rubric). Stylistic preference, acceptable variants, register choices are NOT defects.
Flagging everything is as useless as flagging nothing.

Output: one JSONL line per batch, appended to your assigned `parts/<chunk>.jsonl`:

```json
{"batch_id":"<copy from batch file>","kind":"<copy>","pack":"<copy>","model_id":"strata/qwen3.8-flash-next-iq3_s","model_version":"strata/qwen3.8-flash-next-iq3_s (omp default)","date":"2026-10-05","prompt_version":"screen-v1","status":"ok","items":[{"id":"<copy item id>","v":"ok","why":"<short reason>"}]}
```

Rules:
- `items[].id` copied verbatim from the batch file, same order, every item present.
- `v` is `"ok"` or `"flag"`; `why` is a one-line reason (required for flags, brief for ok).
- One line per batch; valid JSON per line; UTF-8 (Cyrillic + combining stress U+0301, kana, kanji verbatim).
- ru readings carry U+0301 after the stressed vowel; check stress position only against
  clear errors (e.g. stress on a consonant, missing mark on multi-vowel past tense vs known
  irregulars like стани́). Do not flag stress you are unsure of — humans adjudicate.
