# Batch Authoring Guide (agent authors)

Every content batch MUST follow this exactly. Reference exemplars:
`candidates/ru-fullkit-v1/` (7/7, Mode B shape) and
`tools/pack-templates/example-pack/` (canonical shapes).

## One batch = one commit

1. Pick the next 10 unit numbers from the plan (`PROGRESS.json` →
   `units_next`). NEVER reuse or skip into reserved ranges.
2. Author the 10 unit YAML files + the records they introduce:
   - 5 lexicon entries + 1 grammar-or-sentence record per unit
     (capacity is EXACT per the plan; `new_item_budget: 6`; symbol
     drills use `new_item_budget: 0`).
   - Append new records to the existing JSONL shards (lexicon topic
     shards, `sentences/entries.jsonl`, `grammar/concepts.jsonl`,
     `assessments/definitions.jsonl`). Check ids against the shard
     BEFORE appending (`grep '"id":"<id>"' <shard>`); duplicates are
     fatal.
   - Re-emit `curriculum/goals.yaml` IN FULL when adding goals.
3. Every record: `status: draft` / `review_status: draft`,
   `generation` block (`method: ai-assisted`, tool = your model id,
   date, notes "ai-drafted; needs dictionary sourcing and human
   review"), `sources` citing only ids present in `sources.jsonl`.
4. References must resolve: `content_refs` ⊆ `allowed_vocab` +
   `allowed_grammar`; `goal_id`, `assessment_ids`,
   `required_concepts`, prerequisite targets all exist.
5. Score: `./experiments/llm-pack-authoring/score.sh <pack-dir> <label>`
   — ALL 7 gates PASS, lint 0 errors 0 warnings. Fix before commit.
6. Update `PROGRESS.json` (`units_next`, `last_score`), append a
   RESULTS.md line, commit (message: `<lang>: band <X> units NNN-NNN`),
   push to `origin/main`.

## Content quality bar (draft, but honest)

- Target-language forms must be correct: case/gender (ru), kana +
  okurigana + pitch-neutral readings (ja). Stress marks (ru) in
  `readings` only. Mark register where the schema shows it.
- `prohibited_ambiguity` must fence the classic learner trap per entry
  (see ru exemplars: ручка=pen, это unchanged, пожалуйста senses).
- Never invent idioms; never use `validated`/`verified`.
- Activities: `encounter-read`/`encounter-listen`/`recall`/`cloze`
  shapes per exemplars; modality ∈ pack capabilities (ru-RU:
  reading/writing only — NO listening/speaking activities).

## What agents may NOT do

- Change schemas, validators, brief, or plan files mid-band.
- Touch reserved ranges (see PROGRESS.json notes).
- Certify content: everything stays `draft`; human review pending.
- Make the repo public or add remotes.
