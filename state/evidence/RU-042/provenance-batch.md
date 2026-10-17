# RU-042 Task 3 — provenance rows for the ru content batch

## Measured commit-range content-line count

Claim under test: 847 content lines landed across `70ec683..20f994d` with
zero provenance rows.

This snapshot has exactly **one commit** (`9b80c2a Main-PC working
snapshot`); `git cat-file -t 70ec683` / `20f994d` → "Not a valid object".
A live `git log --numstat` over the range is impossible here. The
main-PC-captured artifact stands in and was re-verified:

- `state/evidence/OWNER-CHECKLIST-2026-10-16/git-ru-040-to-041-numstat.txt`
  records `$ git diff --numstat 70ec683..20f994d -- languages/ru-RU`;
  `awk`-summing its added-line column over this workspace copy:
  **847 added lines** (17 numeric rows; the ten `.wav` rows are binary `-`).
- Cross-check against the snapshot tree: new unit files 810–818 have
  `wc -l` = 76,70,72,77,71,71,72,75,75 (matches the numstat column for
  each), `sentences/journeys-2026-10-14.jsonl` = 10 lines, and the range's
  git log line (`git-ru-040-to-041.log`) shows the 0.4.1 publish commit
  `20f994d` dated 2026-10-16.

Scope caveat: the task brief parenthesized "content files
(sentences/lexicon/grammar/activities/assessments/stories)", but the 847
figure — confirmed by the recorded diff — covers the whole `languages/ru-RU/`
tree: `curriculum/goals.yaml` (68), nine new units + one unit edit (659+2),
`grammar/concepts.jsonl` (4), `sentences/journeys-2026-10-14.jsonl` (10),
`media/manifest.jsonl` (10 bake rows), `world/environments.jsonl` (3),
`review/WORKLIST-2026-10-14.md` (90), `manifest.yaml` (1, the 0.4.1 bump).
No lexicon/activities/assessments/stories files changed in the range. The
provenance row's title enumerates what actually landed rather than the
brief's category list.

Zero-provenance claim also verified from the tree: before this batch,
`languages/ru-RU/sources.jsonl` had exactly 2 rows (`ru-original` from
2026-10-04, `zalizniak-2010` from 2026-10-05 — both predating the range)
and `licenses.jsonl` exactly 1 row.

## Row added

`languages/ru-RU/sources.jsonl:3` — `ru-batch-70ec683-20f994d`, in the
existing row shape (compared against `languages/ja-JP/sources.jsonl`,
including `access.mode`, `license` and `use` blocks):

- `title`: names both full commit SHAs, the 847 added lines and the exact
  files covered.
- `url`: the repo tree at `20f994d…` under `languages/ru-RU` — the
  observable origin, not a corpus citation.
- `license`: `CC0-1.0` with text_url — backed by
  `languages/ru-RU/licenses.jsonl` (`lic-ru-original`, pack-original,
  CC0-1.0, redistribution_allowed true) and the manifest `content_license`.
  No other license is claimed.
- `access.mode`: `public`, notes state repository provenance — authored in
  this repo by AI drafting during the range, no external corpus fetched,
  copied or mirrored, pointing at the numstat artifact; "reconstructed
  2026-10-17 per ADR-0035".
- `use.notes`: review-pending wording per the existing convention (ja rows
  put "unreviewed" in notes/attribution text since the source-entry schema
  has no dedicated review field): every item is `status: draft` with
  ai-drafted `generation`; BLK-REVIEW-CAPACITY; "attests authorship history
  only, must not be read as human-verified".
- `retrieved`: `2026-10-16` (range end date).

Row shape validated against `schemas/v0.2/source-entry.schema.json`
(required: `id`, `title`, `license`, `access`, `use`; `id` matches the
contentId pattern) and the pack validator run below.

## Tests

No new pack test: the format does not exist yet (see stress-correction.md).
The validator's schema validation of `sources.jsonl` exercises the row.
