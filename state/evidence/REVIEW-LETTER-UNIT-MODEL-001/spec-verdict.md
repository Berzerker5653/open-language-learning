# SPEC verdict — REVIEW-LETTER-UNIT-MODEL-001 (t_68ac28b8)

**CHANGES-REQUESTED** for the entangled lane code commit `294d649` + evidence `dcec7cc`
(cards t_941065ae LETTER-UNIT-MODEL-001 + t_ec7f6a92 LETTER-DRILL-TEXT-001;
design authority `state/notes/LETTER-TEACHING-DESIGN-001.md`).

Review base: `main` at `683d918`.

## Findings (numbered; each warrants a FIX follow-up unless marked docs-only)

### S1 — RU drill copy still names letter properties (learner-visible) — FIX card needed
The owner dogfood complaint class is NOT closed for Russian pack data:

- `languages/ru-RU/orthography/cyrillic.jsonl` — 62 of 67 entries carry
  `"reading": "sound a — name а"`-style scaffold strings (e.g. entry `ru.orth.cyrillic.a-upper`,
  line 1: `"reading":"sound a — name а"`). No pack anywhere sets the new `sound`/`name` fields
  (`grep -l '"sound"' languages/*/orthography/*.jsonl` → empty).
- Engine fallback: `OrthEntry.sound` falls back to `reading` when the pack does not split them
  (`apps/desktop/src-tauri/src/lib.rs:1204-1209`).
- Drill surfaces: recognize-mode answer and distractor buttons are exactly `entry.sound`
  (`lib.rs:6421-6424` `(&entry.symbol, &entry.sound)`; choices at `lib.rs:6456-6466`).
  So a learner sees buttons literally reading `sound a — name а`.
- Guards miss it: `case_vocabulary_leak` (`lib.rs:1270-1284`) matches the phrase `letter name`,
  not standalone `name`/`sound`; audit `PROPERTY_WORD_RE` (`tools/audit_learner_copy.py:94-95`)
  is anchored to whole copy strings (`^(?:uppercase|lowercase|appearance|letter name|case pair)$`).

This violates design-authority rule 2 — BANNED: "any item whose copy is letter-property metadata"
(`LETTER-TEACHING-DESIGN-001.md:19`) — and card (a) acceptance "drill copy never names a letter
property". Fix: populate `sound` (and `name`) in the RU pack (schema already supports both,
`schemas/v0.2/orthography-unit.schema.json:23-33`), and extend the leak guard + audit ratchet to
scaffold words inside generated drill choice copy.

### S2 — confusable-pair drill dimension promised in docs, not implemented — FIX card (small) or doc fix
Doc comment claims `confusable_with` "drives confusable-pair drills and sequencing"
(`lib.rs:1149-1150`). Sequencing IS wired (production `script_intro_refs` at `lib.rs:3440`,
stagger at `lib.rs:3343` + `stagger_confusables` `lib.rs:3382-3399`). Drills are NOT:
`orth_task_build` picks distractors as the first 3 other same-pack entries in file order after
case-fold dedupe (`lib.rs:6456-6470` `.take(3)`) — a confusable pair is never selected because
it is confusable. Design authority lists confusable-pair discrimination as ALLOWED (not required)
(`LETTER-TEACHING-DESIGN-001.md:19`), so this is an over-promise in code docs + a missing
accepted dimension, not a banned-behavior defect. Either make distractor selection pair-aware
or correct the doc comment.

### S3 — case attribute lives in orthography.yaml, not manifest.yaml (docs-only, no FIX card)
Card (a) wording said the `case` attribute would sit in `languages/*/manifest.yaml` + langpack
schema; implementation declares it per-script in `language/orthography.yaml`
(`languages/ru-RU/language/orthography.yaml:7` `case: "bicameral"`;
`languages/ja-JP/language/orthography.yaml:13,20,28,36`) and `schemas/v0.2/orthography.schema.json`.
Placement is defensible (script-scoped attribute belongs in the orthography file, not the pack
identity manifest). Recorded as a deliberate deviation from card wording; no change requested.

### S4 — acceptance screenshot still deferred (fold into S1's fix)
`state/evidence/LETTER-UNIT-MODEL-001/gates.log` Deferred: "post-fix first-run screenshot for
LETTER-DRILL-TEXT-001 acceptance". The owner-visible acceptance criterion is therefore unverified,
and per S1 the current first-run RU drill copy would fail it. The S1 fix card should deliver the
post-fix screenshot as its acceptance evidence.

## Verified present and correct (no action)

- Letter-entity schema additions typed + optional with engine-side defaults:
  `name`/`sound`/`confusable_with` (`schemas/v0.2/orthography-unit.schema.json:23-33`);
  `case: bicameral|unicameral` in orthography schema, declared in every script of both packs.
- Case-drill ban is generator-wide at task-build: any case/property word, stray `:` ending or
  `h: ` debug fragment refuses the task outright (`lib.rs:6437-6441`), covering both RU and JA
  runners via `orth_task_build`.
- Unicameral-never-case rule structurally enforced: choice dedupe case-folds ONLY when the
  script is bicameral (`lib.rs:6449-6455`); kana readings are clean single sounds
  (`languages/ja-JP/orthography/hiragana.jsonl`: `"reading":"a"` …).
- Stagger rule wired in production, never drops letters (greedy fallback "pack order wins over
  silence", `lib.rs:3382-3399`); 10 RU entries carry `confusable_with` data.
- RU unit summaries rewritten to the letter=sound contract.
- Audit ratchet red-before-green on the exact DOGFOOD-2026-11-21 strings
  (`state/evidence/LETTER-DRILL-TEXT-001/audit-red.log` + `audit-green.log`, 13/13 unit tests).
- Screen fixes from card (b) present in the same commit (per-stage distinct items, RUNNER jargon
  labels, answer-revealing hint, 4K centering) and unit staging dedupes repeated content sets.
- Independent re-verification at review time on HEAD `683d918`:
  `cargo test -p lts-desktop --lib letter_model` 1/1, `--lib stagger` 2/2,
  `python3 tools/test_audit_learner_copy.py` 13/13 OK.
