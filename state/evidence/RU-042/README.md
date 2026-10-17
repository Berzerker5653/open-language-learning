# RU-042 — Russian reference pack 0.4.2 data batch (2026-10-17)

Four bounded fixes + ADR-0035, executed on hermes-worker in a snapshot
workspace; patch returned to parent for review (nothing auto-applied).

| note | covers |
| --- | --- |
| `stress-correction.md` | Task 1 — `тотчас` stress fix, whole-pack sweep, single-vs-double stress design conflict, regression-test finding |
| `version-and-display-name.md` | Task 2 — 0.4.2 bump, `(Draft)` removal, manifest schema finding (no description field), grep results, catalog owner-gate note |
| `provenance-batch.md` | Task 3 — measured 847-line commit range (artifact-based; snapshot git is squashed), new `ru-batch-70ec683-20f994d` source row |
| `verification.md` | exact commands, exit codes, final lines; `test languages/ru-RU` pre-existing `media_unbuilt` failure with baseline proof; venv environment note |

Files changed (diff touched only owned paths):
`languages/ru-RU/manifest.yaml`, `languages/ru-RU/lexicon/narration.jsonl`,
`languages/ru-RU/media/manifest.jsonl` (line 1483), `languages/ru-RU/sources.jsonl`,
new `languages/ru-RU/README.md`, new `docs/adr/0035-provenance-batch-reconstruction.md`
(Proposed; `docs/adr/README.md` untouched).
