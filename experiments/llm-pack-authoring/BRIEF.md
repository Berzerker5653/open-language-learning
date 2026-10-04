# LLM Pack-Authoring Brief — any target language

**How to use this file (human, not the LLM):** fill in the four values in
the Target language block below — that is the ONLY language-specific part
of this document. Then paste the entire file to the LLM. Do not edit
anything else; every other rule is language-neutral and derives from the
block.

Two modes share one contract; the Target language block selects exactly
one, and the model MUST follow the selected mode:

- **Mode B — full kit (production path):** the real deliverable — the
  learner's complete path from zero through the bands, built band-by-band
  across several responses in ONE chat. Score after every batch.
- **Mode A — starter pack (calibration run):** one response, one tiny
  pack, scored once. Used ONLY to validate the kit itself — when testing
  a new model or after any brief change — not as a product deliverable.

---

You are authoring a language-learning pack for the **Open Language
Learning Platform**. Follow the contract exactly; the pack will be checked by
an automated validator, and any rule you break will be reported.

## Target language

| Field                                                                 | Value            |
| --------------------------------------------------------------------- | ---------------- |
| Language                                                              | **Russian**      |
| `target_locale` (BCP 47)                                              | **`ru-RU`**      |
| id prefix `<p>` (derived: first subtag of `target_locale`, lowercase) | **`ru`**         |
| Mode                                                                  | **B — full kit** |

"the target language" below always means the language in this table.
`<p>` always means the derived id prefix. The worked example at the end uses
the placeholder locale `xx-XX` and prefix `xx` — replace both with the
values above; change nothing else about the shapes.

## Mode A — starter pack (calibration run, single response)

Use this mode only to validate the kit; a starter pack alone is not a
shippable language path.

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

## Mode B — full-kit protocol (production path, all bands, batched in one chat)

A starter pack is a few hours of study. A full kit takes a learner from
zero through the bands: `on-ramp` (script + first words), `A1`, `A2`,
`B1`, `B2`. No single response can hold that much content, so work in
phases inside one conversation. Every phase obeys ALL hard rules and
extends the SAME pack — later phases never rewrite or delete an id that
was already delivered.

**Phase 0 — curriculum plan (before any pack file).** Output one fenced
block headed `### CURRICULUM_PLAN.yaml` (a planning artifact for the
human, NOT part of the pack) with:

- `bands:` every band you will cover; per band, the goal ids and one-line
  can-do descriptions;
- `units:` per band, the planned unit file names using blocks of ten
  (`000`-`009` first cluster, `010`-`019` script, `020`-`029` next
  cluster, …), each with topic and the goal it serves;
- `lexicon:` cumulative word budget per band and the topic shards used;
- `grammar:` the grammar concepts each band introduces;
- `orthography:` scripts to teach and symbol counts, if the target script
  is not Latin (see hard rule 10).

Then STOP. The human runs the kit's `validate_plan.py` on your plan; if
it reports errors you must emit a corrected plan (repeat until it
passes). Only then does the human confirm scope — which bands and how
much effort — and say "continue". You do NOT need the human to judge
pedagogy; content stays `draft` pending qualified human review either
way.

**Phase 1 — skeleton + start of on-ramp:** manifest, sources, licenses,
the orthography layer (if rule 10 applies), on-ramp goals/assessments,
and AT MOST 10 units with exactly the lexicon/sentence/grammar records
those units use (the on-ramp band may span several responses).

**Phase 2+ — capacity-bounded batches:** each response delivers AT MOST
10 units (a band may take many responses; finish a band before starting
the next). New goals, units, assessments and the new lexicon/sentence/
grammar records they use. Re-emit IN FULL every file you touch — e.g.
`curriculum/goals.yaml` must contain ALL goals, old and new. Keep each
unit's `new_item_budget` ≤ 6 at every band.

Planning targets (planning estimates, not research claims): on-ramp =
full basic script + ~50 words; A1 ≈ 500 cumulative words; A2 ≈ 1,000;
B1 ≈ 2,000; B2 ≈ 4,000. These budgets FORCE the unit count: at ≤ 6 new
items per unit, A1 needs 75+ units and a full B2 kit needs hundreds.
Plan unit lists accordingly — a plan whose unit count cannot carry its
budgets is rejected by `validate_plan.py`.

## Hard rules (violations = failure)

1. **Packs are data.** No code, no scripts, no HTML.
2. **ID grammar**: every id is `<p>.<kind>.<topic…>`, kebab case, ≥2
   segments, first segment = the derived id prefix `<p>` (must match the
   manifest `target_locale`). Kinds: `goal`, `lex`, `grammar`, `sent`,
   `assess`, `unit`, `activity`, `story`, `scenario`, `orth`.
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
10. **Script on-ramp (non-Latin targets):** assume the learner knows
    NOTHING — not even the alphabet. If the target language is not written
    in Latin script, the pack MUST include `language/orthography.yaml`
    (`schema_version` plus `scripts[]`; each script: `id`, `name`,
    `direction` ∈ `ltr|rtl|vertical`, optional `unicode_blocks`,
    `teaching_order`) and `orthography/<script>.jsonl` with one record per
    teachable symbol (required: `id`, `status`, `symbol`, `reading`,
    `sources`; include `script`, `mnemonic`, `teaching_order`,
    `similar_to` where useful; `status` follows rule 3). Add an on-ramp
    goal that teaches the script and at least one unit whose
    `allowed_vocab`/`content_refs` reference those `<p>.orth.*` ids
    (`validation_method: "exact-match"`, `new_item_budget: 0` for symbol
    drills). Every goal that reads or writes the target script lists the
    script goal in `prerequisites` with dimension
    `orthography-recognition`.

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
- Orthography symbol records (rule 10) look like lexicon records but are
  their own kind, e.g.
  `{"id":"xx.orth.demo.letter-a","status":"draft","script":"example","symbol":"a","reading":"a as in cat","mnemonic":"round open mouth","teaching_order":0,"sources":["template-original"],"generation":{"method":"human","date":"2026-10-03","notes":"placeholder"}}`.
  The `orthography-recognition` mastery dimension tracks them.

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

In Mode B, every response uses this same format for the files it touches;
the harness merges the batches into one pack folder. `CURRICULUM_PLAN.yaml`
is saved by the harness outside the pack folder — it is never scored.

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

In Mode B every batch must pass all gates: the pack is scored after each
phase, not only at the end.
