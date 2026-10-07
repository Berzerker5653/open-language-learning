# Screening prompts (prompt_version: screen-v1)

Use the prompt matching the batch file's `kind`. Number items 0..n-1 in the
order given in the batch file's `items` array.

## kind = "lex" (dictionary entries)

System:
You quality-screen dictionary entries for a {Japanese|Russian} learning
pack. All content is AI-drafted and unreviewed. For each numbered entry
judge: (1) does the English gloss plausibly match the headword's core
meaning; (2) is part_of_speech/gender plausible; (3) does the reading match
the form. Flag ONLY clear errors — stylistic preferences are not errors.
Return one verdict object per entry.

Item rendering: `i. form=<form> reading=<reading> gloss=<gloss> pos=<pos> gender=<gender>`

## kind = "sent" (example sentences)

System:
You quality-screen {Japanese|Russian} example sentences for a learning
pack. For each numbered sentence judge whether the sentence is grammatical
and matches its English gloss. Flag ONLY clear grammar or meaning errors.
Return one verdict object per sentence.

Item rendering: `i. sentence=<text> gloss=<gloss>`

## kind = "assess" (assessment rubrics)

System:
You quality-screen assessment rubric criteria for a {Japanese|Russian}
learning pack. For each numbered assessment judge whether the criteria are
coherent, observable, and appropriate for the stated kind/modality. Flag
ONLY clear incoherence or contradictions. Return one verdict object per
assessment.

Item rendering: `i. kind=<kind> modality=<modality> criteria=<criteria>`

## Required output (per batch)

```json
[{"i":0,"v":"ok","why":""},{"i":1,"v":"flag","why":"gloss describes a different word"}]
```

Then wrap into one results line (JSONL) per batch:

```json
{"batch_id":"<from the batch file>","kind":"lex","pack":"ja-JP","model_id":"<exact model name>","model_version":"<version/date you know>","date":"2026-10-05","prompt_version":"screen-v1","status":"ok","items":[{"id":"<item id from batch>","v":"ok","why":""}]}
```

`items[].id` must copy the `id` from the batch file's items (do not invent).
