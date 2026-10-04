# Pack Authoring Contract (agent-facing)

Audience: AI agents and human authors producing language packs. This is
the single contract: everything a pack must satisfy, in one place. The
machine-checkable sources of truth are `crates/langpack/src/layout.rs`
(layout), `schemas/v0.2/` (per-type schemas), and the `langpack` CLI
(every rule below is enforced by one of its commands). If this document
and those disagree, they win — fix this document.

## Non-negotiables

1. **Packs are data.** No executable code, ever. Declarative references
   only; the engine interprets everything.
2. **Every content record cites `sources:` ids** that exist in
   `sources.jsonl`; every third-party or derived asset needs a
   `licenses.jsonl` entry. AI-drafted content carries `generation`
   provenance and a non-approved status (`draft` / `review-needed`).
3. **Review statuses are honest.** `validated`/`verified` require a
   qualified human review record; agents cannot self-certify.
4. **IDs follow the content-ID grammar**: `<locale-primary>.<kind>.<topic…>`,
   ≥2 segments, kinds listed in `crates/domain/src/ids.rs`
   (`goal`, `lex`, `grammar`, `sent`, `story`, `kanji`, `assess`,
   `unit`, `scenario`, `activity`, …). The first segment must match the
   manifest's `target_locale` primary subtag.

## Layout contract (schema 0.2)

| Path | Schema | Shape |
| --- | --- | --- |
| `manifest.yaml` | language-pack-manifest | single doc |
| `language/identity.yaml` | language-identity | single doc |
| `language/normalization.yaml` | normalization | single doc |
| `language/orthography.yaml` | orthography | single doc |
| `language/phonology.yaml` | phonology | single doc |
| `language/pragmatics.yaml` | pragmatics | single doc |
| `curriculum/goals.yaml` or `curriculum/goals/*.yaml` | goal | `{goals: [...]}` |
| `curriculum/units/*.yaml` | unit | single doc |
| `activities/scenarios/*.yaml` | scenario | single doc |
| `assessments/definitions.jsonl` | assessment | one per line |
| `grammar/concepts.jsonl` | concept | one per line |
| `grammar/dependencies.yaml` | (prerequisite mirror; structural) | — |
| `lexicon/*.jsonl` | lexical-entry | one per line |
| `sources.jsonl` | source-entry | one per line |
| `licenses.jsonl` | license-inventory | one per line |
| `reviews.jsonl` | review-record | one per line |
| `speech/profiles.jsonl` | speech-profile | one per line |
| `phonology/contrasts.jsonl` | phonology-contrast | one per line |
| `sentences/entries.jsonl` | sentence | one per line |
| `kanji/entries.jsonl` | kanji | one per line |
| `stories/*.yaml` | story | single doc |
| `media/*` | (binary assets; `media/<content-id>.wav` is picked up automatically) | — |

Unknown paths fail validation (documentation files like `README.md`
are allowed). Chunking is legal where the table shows `*` (e.g.
`lexicon/food.jsonl`, `curriculum/units/003-market.yaml`).

## Gates (run them in this order, as you go)

```sh
langpack validate <pack>          # schema + layout + semantic refs (draft posture)
langpack lint <pack>              # fails on warnings too — quality gate
langpack audit-curriculum <pack>  # prereq cycles, mirror agreement, dead goals
langpack audit-sources <pack>     # provenance completeness
langpack audit-licenses <pack>    # redistribution gates + attribution report
langpack test <pack>              # install-mode validation + all audits (release gate)
langpack build <pack> -o out.lpk  # deterministic archive; requires scaffold-clean
```

`validate --mode install` additionally enforces promotion gates
(non-empty licenses/sources, resolved references, license clearance);
`TBD` content licensing blocks install, never drafting.

## Per-unit workflow

Author one lesson at a time:

1. Fill in the unit brief (`tools/pack-templates/unit-brief.md`): goal,
   exactly which lexicon/grammar/sentence ids the unit introduces,
   sources for each, register, and the validation method.
2. Add the cited records first (lexicon/concepts/sentences), then the
   unit file referencing them.
3. `langpack validate <pack>` after every file; fix before continuing.
4. Keep new-item budget honest: a unit introduces a bounded number of
   new items (the engine's planner assumes small, dense lessons).
5. For AI-drafted lessons, declare the unit's `generation_contract`
   (allowed vocab/grammar, new-item budget, register, validation
   method); the validator then enforces the envelope the unit promised.

## Chunking conventions (packs past A1)

Every `*` path in the layout table accepts many files; ids are global
to the pack and duplicates across files fail (`duplicate_ids`). The
conventions that keep large packs navigable:

- **Lexicon by topic**: `lexicon/<topic>.jsonl`, kebab-case topic
  (`lexicon/food.jsonl`, `lexicon/numbers.jsonl`). Never shard
  alphabetically — topic shards match how units cite vocabulary.
- **One unit per lesson**: `curriculum/units/NNN-<topic>.yaml` with a
  zero-padded sequence number (`000-greetings.yaml`,
  `012-market.yaml`). The number is presentation order, not an id;
  unit ids stay semantic (`<locale>.unit.<topic>.<lesson>`).
- **Sentences / kanji**: shard the same way when a single file passes
  ~200 records (`sentences/food.jsonl`, `kanji/n5.jsonl`); the engine
  reads every `*.jsonl` under those directories in file-name order.
- **Stories**: one file per reader text (`stories/<topic>-<band>.yaml`).
- **Goals**: `curriculum/goals/<band>.yaml` shards (K-23), e.g.
  `goals/on-ramp.yaml`, `goals/a1.yaml`; the single
  `curriculum/goals.yaml` remains valid.

These are conventions, not schema: `langpack validate` accepts any
file set the table allows; the CI template enforces the gates.

## Worked example

`tools/pack-templates/example-pack/` is a complete, minimal,
lint-clean pack: manifest, one goal with an assessment, one grammar
concept, three lexicon entries, one sentence with a cloze target, and
one unit exercising encounter/recall/cloze/dictation. Copy it, replace
the placeholder content and the `xx` locale, and it must still pass
`langpack lint`. CI validates it on every change.

## CI for community pack repos

Use `tools/pack-templates/ci-community-pack.yml` (GitHub Actions): it
runs `langpack test` on every push/PR and attaches the built `.lpk` on
tags. Pin the toolchain; the validator is deterministic.
