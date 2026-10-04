# Takeover Plan: finish ru-RU and ja-JP kits

Owner directive (2026-10-04): after the external model's next batch
(Phase 2, ru-RU A1 units 020-029), the agent takes over authoring of
ALL remaining work for both kits, working unattended-style in batches.
The owner may point an external chat model at this repo (private —
NEVER make it public) for confirmation; that is the owner's channel.

## Ground rules (unchanged contract)

- Every record obeys `BRIEF.md` hard rules 1-10 (ids, draft statuses,
  generation provenance, sources, reference resolution, ≤6 new items
  per unit, honest capabilities, script on-ramp).
- ALL content stays `draft` / `review_status: draft`. Qualified human
  review is a separate gate the agent can never self-certify
  (AGENTS.md). "Done" here = structurally complete + 7/7 gates, NOT
  shippable.
- Every batch: write files → `score.sh` → commit → push to
  `origin/main` (standing rule). A batch that breaks a gate is fixed
  before the next batch starts.
- Batch size: 10 units + their records (matches plan capacity math and
  keeps commits reviewable).
- Update `PROGRESS.json` in the same commit as each batch.

## Workloads

### ru-RU (`candidates/ru-fullkit-v1/`, plan `plans/ru-fullkit-v1.yaml`)

- Done: on-ramp (units 000-019, 60 items, 67 symbols) — 7/7.
- Reserved: units 020-029 = external model's Phase 2 batch. Do NOT
  author these; if the batch never arrives, take them over (note it in
  PROGRESS.json).
- Agent authors: A1 remainder (030-109), A2 (110-199), B1 (200-399),
  B2 (400-799) per the plan's unit syllabus and per-band budgets
  (A1 540, A2 600, B1 1200, B2 2400 new items; capacity is EXACT —
  every unit stays at 5 lex + 1 grammar-or-sentence).
- JSONL shards grow by direct append (no parser needed — the agent
  writes files); duplicate-id check before each append.
- On completion: promote to `languages/ru-RU/` with a product
  `pack_id` (replace `dev.example.ru`), README, REVIEW_POLICY.yaml
  mirroring ja-JP's.

### ja-JP (`languages/ja-JP/`, extend IN PLACE — it is the live pack)

- Baseline: 7/7 green, 5 on-ramp + 15 A1 goals, 31 units (000-061),
  ~211 lex, 61 sentences, 15 grammar, 20 assessments, 147 kana
  symbols, 57 kanji.
- Step 1: author `plans/ja-fullkit-v1.yaml` (same block shape as
  ru-fullkit-v1) covering A1 completion + A2 + B1 + B2; unit
  numbering continues from 062; must pass `validate_plan.py`.
- Step 2: author batches per the plan. Kanji staging follows the
  existing `kanji/entries.jsonl` shape; romaji policy and macrons per
  `docs/06_JAPANESE_REFERENCE.md`.
- No promotion step (already in `languages/`).

## Resumable state

`PROGRESS.json` (this directory) is the single source of truth for
where work stands. Any session (or reviewer) resumes by: read
PROGRESS.json → next batch pointer → follow this plan. Format:

```json
{
  "ru-RU": {
    "plan": "plans/ru-fullkit-v1.yaml",
    "pack": "candidates/ru-fullkit-v1",
    "bands_done": ["on-ramp"],
    "units_next": "030",
    "last_score": "7/7",
    "notes": "020-029 reserved for external model Phase 2"
  },
  "ja-JP": {
    "plan": null,
    "pack": "languages/ja-JP",
    "bands_done": [],
    "units_next": "062",
    "last_score": "7/7",
    "notes": "plan not yet authored"
  }
}
```

## Definition of done (per kit)

1. Every band in the approved plan delivered; capacity math satisfied.
2. `score.sh` 7/7 on the final state (and per batch, logged in
   RESULTS.md).
3. All records `draft`; review kits present; human review explicitly
   pending.
4. ru-RU promoted to `languages/ru-RU/`.

## Verification channel (owner-side)

External chat models may be pointed at the repo to cross-check Russian
/ Japanese content. Agents must not treat such confirmations as
qualified human review; log disagreements in RESULTS.md for the human
queue.
