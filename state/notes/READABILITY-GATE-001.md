# READABILITY-GATE-001 — authoring-time readability validator

Russio/NuanceDeck discipline: no sentence a learner reads may carry more
than one lemma outside their known lexicon. This card ships the
deterministic gate, the regeneration-request loop interface, and the
known-lexicon layering from the local confirm/mine ledger.

## What shipped (commit: see ledger row)

- `tools/readability-gate.py` — the validator + loop driver (CLI).
- `tools/test_readability_gate.py` — 10 golden tests (deterministic).
- Evidence under `state/evidence/READABILITY-GATE-001/`: gates.log,
  first real-pack run (`pack-run/violations.jsonl`, `summary.json`,
  `regeneration-requests.jsonl`).

## Frozen interface

### Known lexicon for band B (deterministic, offline, venv-only)
known(B) = glue (FUNC/CORE shared with `tools/vocab-budget-check.py`)
∪ cumulative story drill pools (`state/data/story-vocab-pools-2026-11.json`,
order on-ramp < a1 < a2 < b1 < b2)
∪ lexicon entries that DECLARE `band` ≤ B (v0.2 lexicon field)
∪ ledger-known lemmas (see below).

A word in the pack lexicon WITHOUT a declared band is NOT automatically
known — the band field is the declaration. The first real-pack run
found 94/945 sentences with >1 out-of-band lemma; most offenders
(завтрак, яйцо, гитара…) are pack-lexicon words that were never band-
tagged. Disposition is data-lane work (tag the band or regenerate) —
the gate is honest, not noisy: 10% of sentences, each naming its words.

### Sentence band
id segment (`ru.sent.a1.*` → a1). Non-band segments (the `cp` shard)
resolve via `--band`, or via their story's max sentence band; without
either, an explicit `readability_band_undeclared` diagnostic — never a
silent guess.

### Ledger-known (acceptance 3)
`--known-db <profiles.db> --profile <id> --pack-id <installed pack id>`:
- a mined surface (K-14 `mined_items`) makes its lemmas known;
- a CONTENT-CONFIRM-001 confirmation of a sentence (or story: all its
  sentences) marks those lemmas known for that profile only;
- missing ledger tables or zero rows = cold profile → pack band list.
Store read is mode=ro; the app's real schema columns are used.
The owner's store (`~/.local/share/openlang/profiles.db`) currently has
3 mined rows (ja profiles) and 0 confirmations, so the ru run shows the
honest cold-fallback note — plumbing proven golden against the real
column names.

### Regeneration loop (acceptance 2)
Every rejection emits a regeneration request
(`--requests-out`): `{id, band, text, negative_hints: [lemmas],
instruction}` — the offending lemmas ARE the explicit negative hints.
The authoring chain regenerates and submits candidates through
`--recheck FILE` ({id?, band, text} jsonl): PASS or REJECT with the
UPDATED negative hints; loop until PASS. Violations + summary are
written as pack-build evidence (`--evidence-out DIR`). Determinism:
sorted ids, byte-identical reruns (golden-tested).

## Decisions
- Authoring/build-time scope, not app runtime: there is no runtime LLM
  generator in the app (grep-verified 2026-11-20 — the only "generator"
  code paths are audio regeneration notes); the "runtime generator
  loop" is the pack-authoring generation chain, which consumes these
  requests. Wiring the gate into CI as a blocker would RED the pack
  today (94 findings) — deferred like every content gate: run in the
  bake/authoring pipeline, findings logged, not release-blocking yet.
- ru-only this lane (pymorphy3 is the only lemmatizer authority in the
  toolbox); non-ru packs exit 2 with `readability_gate_unsupported_locale`
  — never a silent pass. ja needs a JMDict-based follow-up card.
- Gate counts DISTINCT unknown lemmas per sentence (≤1 allowed),
  hyphenated compounds split, stress marks stripped (norm-token
  convention shared with `media/lemmas.jsonl`).

## Follow-ups (not this card)
1. Band-tag the ru lexicon entries covering the 94 findings' lemmas
   (data lane) or regenerate the flagged sentences (authoring chain,
   consume `regeneration-requests.jsonl`).
2. ja readability gate (JMDict + furigana tokenization) — separate card.
3. Consider wiring the gate into the pack-build evidence chain next to
   `scripts/build-morphology-table.py --check`.

## Runbook
```
.venv/bin/python tools/readability-gate.py --pack languages/ru-RU --band a2 \
  [--known-db ~/.local/share/openlang/profiles.db --profile <id> \
   --pack-id org.openlanguage.ru-ru.reference] \
  --evidence-out <dir> --requests-out <dir>/regeneration-requests.jsonl
.venv/bin/python tools/readability-gate.py --pack languages/ru-RU --recheck regen-candidates.jsonl
```
Exit 0 = clean, 1 = violations (authoring work), 2 = usage/locale error.
Python gates touching pymorphy MUST use the repo venv (`.venv/bin/python`).
