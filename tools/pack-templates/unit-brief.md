# Unit authoring brief

Fill this in BEFORE writing the unit file. It becomes the unit's
`summary` plus the commit/PR description, and it is what a human
reviewer checks the unit against.

## Identity
- Unit id: `<locale>.unit.<topic>.<lesson>`
- Goal id (must already exist in `curriculum/goals.yaml`):
- Title / one-line summary:
- Estimated minutes:

## What it teaches
- New lexicon ids introduced here (with glosses):
- New grammar concept ids:
- New sentences (with cloze targets):
- Kanji/characters (with radicals + mnemonic status):
- Register / formality constraints:

## Sources (each must exist in `sources.jsonl`)
- source ids cited by the records above:
- AI-drafted records (must carry `generation` + `draft`/`review-needed`):

## Validation method
- How a reviewer checks correctness (dictionary entry, corpus URL,
  native-speaker confirmation):
- New-item count (keep small; one lesson, not a syllabus):

## Activity plan
| activity id | type | modality | support_level | content_refs |
| --- | --- | --- | --- | --- |
|  | encounter-read / recall / cloze / dictation / shadow / scenario | reading / writing / listening / speaking / interaction | 0-3 |  |

## After writing
1. `langpack validate <pack>` — zero errors before continuing.
2. `langpack lint <pack>` — zero warnings before opening a PR.
3. Never set `validated`/`verified` yourself; that needs a human
   review record in `reviews.jsonl`.
