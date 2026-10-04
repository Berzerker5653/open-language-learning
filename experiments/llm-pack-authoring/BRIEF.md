# LLM Pack-Authoring Brief — any target language

**How to use this file (human, not the LLM):** fill in the three values in
the Target language block below — that is the ONLY language-specific part of
this document. Then paste the entire file to the LLM. Do not edit anything
else; every other rule is language-neutral and derives from the block.

---

You are authoring a starter language-learning pack for the **Open Language
Learning Platform**. Follow the contract exactly; the pack will be checked by
an automated validator, and any rule you break will be reported.

## Target language

| Field                                                                 | Value       |
| --------------------------------------------------------------------- | ----------- |
| Language                                                              | **Russian** |
| `target_locale` (BCP 47)                                              | **`ru-RU`** |
| id prefix `<p>` (derived: first subtag of `target_locale`, lowercase) | **`ru`**    |

"the target language" below always means the language in this table.
`<p>` always means the derived id prefix. The worked example at the end uses
the placeholder locale `xx-XX` and prefix `xx` — replace both with the
values above; change nothing else about the shapes.

## Task

Author a **starter pack for the target language** from scratch. Deliver, in
your response, the complete file tree and the FULL contents of every file.

Required minimum content:

- `manifest.yaml`
- `sources.jsonl` — every source you cite; original AI-drafted content gets
  one "original" source entry (see example)
- `licenses.jsonl` — redistribution policy per material class
- `curriculum/goals.yaml` — exactly 3 goals (band `on-ramp` or `A1`), each
  with `assessment_ids` pointing to real assessments and honest
  `prerequisites`
- `curriculum/units/000-<topic>.yaml`, `001-<topic>.yaml`,
  `002-<topic>.yaml` — one unit per goal; each unit lists activities with
  `content_refs` to REAL ids in your lexicon/sentences, and a
  `generation_contract` declaring exactly the vocab/grammar ids it uses
- `grammar/concepts.jsonl` — at least 3 grammar concepts your goals require
- `lexicon/greetings.jsonl` and `lexicon/everyday.jsonl` — 12-20 lexical
  entries total, topic-sharded
- `sentences/entries.jsonl` — at least 3 sentences with `cloze_targets`
- `assessments/definitions.jsonl` — at least one per goal

## Hard rules (violations = failure)

1. **Packs are data.** No code, no scripts, no HTML.
2. **ID grammar**: every id is `<p>.<kind>.<topic…>`, kebab case, ≥2
   segments, first segment = the derived id prefix `<p>` (must match the
   manifest `target_locale`). Kinds: `goal`, `lex`, `grammar`, `sent`,
   `assess`, `unit`, `activity`, `story`, `scenario`.
3. **Honest statuses**: lexicon entries, grammar concepts and sentences use
   `"status": "draft"` (or `review-needed`); goals and assessments use
   `review_status: "draft"`. Units and activities have NO status field —
   the schema rejects one. NEVER use `validated` or `verified` — those
   require a human review record you cannot create.
4. **AI provenance**: every goal, grammar concept, lexicon entry and
   sentence carries a `generation` object:
   `{"method": "ai-assisted", "tool": "<your model name>", "date":
"YYYY-MM-DD", "notes": "ai-drafted; needs dictionary sourcing and human review"}`.
   (The schema does NOT allow `generation` on assessments or units.)
5. **Goals, grammar concepts, lexicon entries and sentences cite `sources:`**
   ids that exist in `sources.jsonl` (units, activities and assessments have
   no `sources` field — the schema rejects one). Do not cite dictionaries
   you did not actually consult; if your knowledge is your own training,
   use the single "original" source entry pattern from the example.
6. **References must resolve**: every `content_refs`, `required_concepts`,
   `assessment_ids`, `allowed_vocab`, `allowed_grammar`, `prerequisites`
   value must be an id that exists in the pack.
7. **The target language must be correct**: correct forms, gender/case
   agreement where the language has them, natural register (mark register
   in `registers` where the schema shows it; otherwise keep neutral). Do
   not invent idioms. If the language is not written in Latin script, keep
   the native script in `forms[].text` and set `readings[].script` to the
   script actually used; `glosses` stay in `en-US`.
8. **Small dense lessons**: each unit's `new_item_budget` ≤ 6 and its
   `content_refs` must stay inside `allowed_vocab`/`allowed_grammar`.
9. **Honest capabilities**: manifest `capabilities` must match the
   modalities your pack actually uses. If any activity or assessment uses
   `listening` (e.g. a dictation activity) or `speaking`, set that
   capability `true`; set it `false` only if the pack uses none. The
   worked example includes a dictation activity, so its manifest declares
   `listening: true` — keep that consistent if you keep or drop the
   activity.

## Schema notes (fields the example leaves implicit)

- Goal `prerequisites` entries are RECORDS, not ids:
  `{"target": "<id>", "dimension": "<mastery-dimension>", "required_state":
"<state>", "strength": "hard"|"helpful"}` written in YAML mapping form.
  Valid `dimension`: `comprehension-listening`, `comprehension-reading`,
  `recall-meaning`, `orthography-recognition`, `phonological-discrimination`,
  `orthographic-encoding`, `production-speaking`, `production-writing`,
  `pronunciation-segmental`, `pronunciation-prosody`, `grammar-controlled`,
  `grammar-spontaneous`, `pragmatic-use`, `interaction`, `retention`.
  Valid `required_state`: `unseen`, `introduced`, `supported`, `independent`,
  `flexible`, `retained`.
- Assessment `kind` must be one of: `recognition`, `recall`, `production`,
  `interaction`, `transfer`. (Cloze activities live in units; they are not an
  assessment kind.)
- Assessment `modality` must be one of: `listening`, `reading`, `speaking`,
  `writing`, `interaction`.

## Output format

First the file tree, then one fenced block per file, each preceded by a
line `### <relative/path>`:

```
### manifest.yaml
...
### lexicon/greetings.jsonl
...
```

JSONL files: one JSON object per line, no trailing commas, no comments.
YAML: two-space indent. Your text response IS the deliverable: the
harness reconstructs the folder from these blocks. Do NOT create or
offer to create a zip, archive, or downloadable file.

## Worked example (structurally perfect — same shapes, replace content and locale)

A minimal pack that passes every gate. Mirror its shapes exactly. It uses
the placeholder locale `xx-XX` and prefix `xx`; in YOUR pack these are the
Target language values above.

```
manifest.yaml
sources.jsonl
licenses.jsonl
curriculum/goals.yaml
curriculum/units/000-greetings.yaml
grammar/concepts.jsonl
lexicon/entries.jsonl
sentences/entries.jsonl
assessments/definitions.jsonl
```

### manifest.yaml

```yaml
schema_version: "0.2"
pack_id: "dev.example.xx"
display_name: "Example Language (template)"
version: "0.0.1"
target_locale: "xx-XX"
source_locales: ["en-US"]
engine:
  min_version: "0.1.0"
  max_version_exclusive: null
maturity: "experimental"
capabilities:
  listening: true
  speaking: false
  reading: true
  writing: true
license:
  content_license: "CC0-1.0"
  redistribution_allowed: true
```

### sources.jsonl

```text
{"id":"template-original","title":"Original example content authored for this template pack","url":"https://github.com/Berzerker5653/open-language-learning/tree/main/tools/pack-templates/example-pack","license":{"spdx":"CC0-1.0","text_url":"https://creativecommons.org/publicdomain/zero/1.0/"},"access":{"mode":"public"},"use":{"redistribution_allowed":true,"attribution_required":false},"retrieved":"2026-10-03"}
```

### licenses.jsonl

```text
{"id":"lic-template-original","scope":{"kind":"pack-original"},"license":{"spdx":"CC0-1.0"},"redistribution_allowed":true}
```

### curriculum/goals.yaml

```yaml
goals:
  - id: "xx.goal.demo.greet"
    description: "Greet someone using the two taught example words"
    band: "on-ramp"
    modalities: ["reading", "writing"]
    prerequisites: []
    required_concepts: ["xx.grammar.demo.word-order"]
    assessment_ids: ["xx.assess.demo.greet"]
    transfer_required: false
    sources: ["template-original"]
    review_status: "draft"
    generation:
      method: "human"
      date: "2026-10-03"
      notes: "placeholder template content; replace with sourced content"
```

### curriculum/units/000-greetings.yaml

```yaml
id: "xx.unit.demo.greetings"
goal_id: "xx.goal.demo.greet"
title: "First greetings"
summary: "Worked example: the smallest unit that exercises reading and writing."
estimated_minutes: 5
activities:
  - id: "xx.activity.demo.encounter-greet"
    type: "encounter-read"
    modality: "reading"
    support_level: 0
    content_refs: ["xx.lex.demo.tola", "xx.lex.demo.mara"]
  - id: "xx.activity.demo.recall-greet"
    type: "recall"
    modality: "reading"
    support_level: 0
    content_refs: ["xx.lex.demo.tola"]
  - id: "xx.activity.demo.cloze-greet"
    type: "cloze"
    modality: "writing"
    support_level: 1
    content_refs: ["xx.sent.demo.greet-friend"]
  - id: "xx.activity.demo.dictation-greet"
    type: "dictation"
    modality: "listening"
    support_level: 1
    content_refs: ["xx.sent.demo.greet-friend"]
generation_contract:
  allowed_vocab: ["xx.lex.demo.tola", "xx.lex.demo.mara", "xx.sent.demo.greet-friend"]
  allowed_grammar: ["xx.grammar.demo.word-order"]
  new_item_budget: 3
  register: []
  expected_interpretations: ["greeting a friend"]
  prohibited_ambiguity: []
  target_proficiency: "on-ramp"
  validation_method: "choice"
```

### grammar/concepts.jsonl

```text
{"id":"xx.grammar.demo.word-order","name":"Basic word order","category":"syntax","status":"draft","definition":"Example language places the greeting before the addressee (tola mara = hello friend). Placeholder rule for the template; replace with a sourced rule.","sources":["template-original"],"generation":{"method":"human","date":"2026-10-03","notes":"placeholder template content; replace with sourced content"}}
```

### lexicon/entries.jsonl

```text
{"id":"xx.lex.demo.tola","status":"draft","forms":[{"text":"tola","is_primary":true}],"readings":[{"text":"tola","script":"latin"}],"glosses":{"en-US":["hello"]},"sources":["template-original"],"generation":{"method":"human","date":"2026-10-03","notes":"placeholder template content; replace with sourced content"}}
{"id":"xx.lex.demo.mara","status":"draft","forms":[{"text":"mara","is_primary":true}],"readings":[{"text":"mara","script":"latin"}],"glosses":{"en-US":["friend"]},"sources":["template-original"],"generation":{"method":"human","date":"2026-10-03","notes":"placeholder template content; replace with sourced content"}}
{"id":"xx.lex.demo.shina","status":"draft","forms":[{"text":"shina","is_primary":true}],"readings":[{"text":"shina","script":"latin"}],"glosses":{"en-US":["good day"]},"sources":["template-original"],"generation":{"method":"human","date":"2026-10-03","notes":"placeholder template content; replace with sourced content"}}
```

### sentences/entries.jsonl

```text
{"id":"xx.sent.demo.greet-friend","status":"draft","text":"tola mara","gloss":"hello, friend","cloze_targets":["tola"],"sources":["template-original"],"generation":{"method":"human","date":"2026-10-03","notes":"placeholder template content; replace with sourced content"}}
```

### assessments/definitions.jsonl

```text
{"id":"xx.assess.demo.greet","goal_id":"xx.goal.demo.greet","kind":"recall","modality":"reading","rubric":{"scale":"observed","criteria":["greeting matched to situation"]},"review_status":"draft"}
```

## Success criteria (how you will be graded)

Your pack is written to disk and run through the real toolchain:

1. `langpack validate` — 0 errors
2. `langpack lint` — 0 errors AND 0 warnings (this is the strict gate)
3. `langpack audit-curriculum` / `audit-sources` / `audit-licenses` — 0 errors
4. `langpack test` — install-mode conformance
5. `langpack build` — deterministic archive builds

Also graded by a human: correctness of the target language (forms,
agreement, naturalness) and whether the content actually teaches the stated
goals.
