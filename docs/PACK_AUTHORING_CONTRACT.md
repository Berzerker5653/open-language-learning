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
5. **The pack carries 100% of its audio.** The app performs no speech
   synthesis at read time (ADR-0024): every clip a learner hears was baked
   into the pack at build time (ADR-0016/0023). An audio-addressable item
   with no `media/manifest.jsonl` row is a `media_asset_missing` block in
   every gate that matters — there is no fallback that can paper over it.
   See §Media below.

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
| `lexicon/*.jsonl` | lexical-entry | one per line; optional `band` (same band vocabulary as goals: `on-ramp`, `A1`…`C2`) and optional `framework_refs` — reference alignment only, never a certification claim (docs/18) |
| `sources.jsonl` | source-entry | one per line |
| `licenses.jsonl` | license-inventory | one per line |
| `reviews.jsonl` | review-record | one per line |
| `speech/profiles.jsonl` | speech-profile | one per line |
| `phonology/contrasts.jsonl` | phonology-contrast | one per line |
| `sentences/entries.jsonl` | sentence | one per line |
| `kanji/entries.jsonl` | kanji | one per line |
| `stories/*.yaml` | story | single doc |
| `media/manifest.jsonl` | media-asset | one per line |
| `media/*.wav` | (binary asset; exactly one manifest row; **gitignored** — produced by `scripts/generate-pack-audio.py`, never hand-placed) | — |
| `world/environments.jsonl` | environment | one per line; optional (ADR-0018) |

Unknown paths fail validation (documentation files like `README.md`
are allowed). Chunking is legal where the table shows `*` (e.g.
`lexicon/food.jsonl`, `curriculum/units/003-market.yaml`).

`world/environments.jsonl` is optional and must be declared in `manifest.yaml`
as `world: environments.jsonl` if shipped. Each row names a place and the
capabilities that open it (`{content_id, modality, min_state}`). Four gates are
errors rather than warnings, because none is a legitimate draft state:
`duplicate_environment_id`, `environment_unknown_content` (the requirement names
a content id this pack does not declare, so the place can never open),
`environment_listening_without_audio` (a listening unlock on content your pack
declares no audio for — checked only once you declare audio for anything), and
`world_collection_missing` (manifest declares the collection, no rows shipped).
`modality` is an enum of the dimensions a shipped activity records, so you cannot
gate a place on something no runner can credit; the thresholds are yours to get
right. See docs/04 §World environments.

## Gates (run them in this order, as you go)

```sh
langpack validate <pack>          # schema + layout + semantic refs (draft posture)
langpack lint <pack>              # fails on warnings too — quality gate
langpack audit-curriculum <pack>  # prereq cycles, mirror agreement, dead goals
langpack audit-sources <pack>     # provenance completeness
langpack audit-lexicon <pack>    # script purity + Cyrillic stress self-consistency
langpack audit-licenses <pack>    # redistribution gates + attribution report
langpack test <pack>              # install-mode validation + all audits (release gate; audio must be baked first)
langpack build <pack> -o out.lpk  # deterministic archive; requires scaffold-clean AND baked audio
```

`validate --mode install` additionally enforces promotion gates
(non-empty licenses/sources, resolved references, license clearance);
`TBD` content licensing blocks install, never drafting.

## Media: the pack carries 100% of its audio (ADR-0016/0023/0024)

Runtime speech synthesis was removed from the app (ADR-0024): there is no
read-time fallback, no downloadable synthesizer, no silent-pack posture.
`media_asset_missing` — an audio-addressable item with no manifest row — is
the only audio block in the product.

`media/manifest.jsonl` states what audio the pack carries, and the manifest is
the only thing the app reads audio provenance from — never file presence
(ADR-0016). The coverage gate enumerates audio-addressable items exactly as
`scripts/generate-pack-audio.py` `targets()` does: every sentence, every
phonology contrast item (`{row.id}-{index}`), and every script-tagged lexicon
entry. Each needs a manifest row AND its `.wav`, or install-mode `validate`
and `langpack build` refuse the pack. How it is enforced:

- An addressable item with no manifest row: aggregated `media_asset_missing`
  (Error in every mode). A pack with addressable items and no manifest at all
  is `media_manifest_absent` (Error at install, Info in a source checkout).
- Nothing generated yet (a fresh checkout): one aggregated `media_unbuilt`
  diagnostic, Info while drafting, Error at `--mode install` — and `build`
  refuses outright: an audio-less archive is no longer a legal artifact,
  because nothing would synthesize the gaps at read time.
- Partially generated: every declared row that is absent is `media_missing`
  (Error in every mode).
- Present but not matching its row: `media_size_mismatch` / `media_hash_mismatch`
  (Error in every mode). A media file with no row is `media_unlisted` (Warning),
  never a silent asset.

### Baking the audio

Never hand-write `media/manifest.jsonl` rows and never hand-edit their
hashes: the rows record the bytes the bake actually produced. The bake script
writes them:

```sh
scripts/generate-pack-audio.py --pack my-pack --language <lang>
```

The default engine is the ADR-0023 locked-in bake engine, Qwen3-TTS
CustomVoice with the `ono_anna` speaker (`--tts kokoro` reproduces the
legacy payload for provenance work). An existing file is reused only when
its bytes still match the row's sha256 AND the previous row credits the
same synthesizer this run would record — an engine switch can never leave
stale bytes under a new provenance row. `--force` regenerates; `--dry-run`
prints each asset's synthesis input; `--only <id>` restricts the run.

Generated `.wav` bytes are gitignored; only `media/manifest.jsonl` is
committed. `scripts/build-catalog.sh` regenerates the audio before
`langpack build`, so the release path always bakes first.

### CI vs the release path

The engine's pack-conformance CI runs `validate`, `lint`,
`audit-curriculum`, `audit-lexicon`, and `audit-licenses` in draft mode.
Install-mode `test` is deliberately NOT in CI: the `.wav` bytes are
gitignored, so a fresh checkout would fail `media_unbuilt`/`media_missing`
for reasons that say nothing about the pack. Install-mode gates run only in
the release path (bake, then `langpack test` / `build-catalog.sh` →
`langpack build`); the manifest/byte pairing logic itself is pinned by
`crates/langpack/tests/media.rs` under `cargo test --workspace`.

## Complete-pack checklist (reference-grade inventory)

`languages/ja-JP` is the reference inventory. A complete pack ships:

- `manifest.yaml` — every required field (schema_version, pack_id, version,
  target_locale, source_locales, engine, maturity, capabilities{listening,
  speaking, reading, writing}, license), honestly-set optional capabilities
  (`pronunciation_assessment`, `prosody_assessment`, `handwriting`, `rtl`),
  plus `scripts`, `world`, and `requested_model_capabilities`;
- `language/{identity,normalization,orthography,phonology,pragmatics}.yaml`;
- `orthography/*.jsonl` — one shard per taught script;
- `phonology/contrasts.jsonl`;
- `curriculum/` — goals shards, units, and the dependency mirrors that
  agree with them;
- `grammar/{concepts.jsonl,dependencies.yaml}`;
- `lexicon/*.jsonl` (topic shards) and `sentences/`;
- `activities/scenarios/*.yaml`;
- `stories/*.yaml`;
- `world/environments.jsonl` (declared as `world:` in the manifest);
- `assessments/definitions.jsonl`;
- `review/` — reviewer kit, machine-readable review policy, and dated
  `WORKLIST-<date>.md` files for every review-pending item;
- `sources.jsonl`, `licenses.jsonl`;
- `media/manifest.jsonl` — one baked row per audio-addressable item (the
  `.wav` bytes stay gitignored);
- `tests/README.md` — the pack's test plan.

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
6. When a lesson opens a new layer the learner has not met yet (a script
   chart, a marked-letter series), declare its phase with `requires_unit`
   (ADR-0022): `{unit: <unit id>, state: <masteryState>}` entries gate the
   unit's content behind every content item of the named units reaching that
   state. The engine applies it to the NEW pool only — due reviews keep
   scheduling — and gates that can never pass (self-reference, a
   non-unit target, a gate cycle) are validation errors in every mode.

## Chunking conventions (packs past A1)

Every `*` path in the layout table accepts many files; ids are global
to the pack and duplicates across files fail (`duplicate_ids`). The
conventions that keep large packs navigable:

- **Phrases**: a lexicon record may declare `kind: "phrase"` with
  `slots` (each slot: `text`, optional `alternatives`, optional
  `label`). A slot's `text` must occur verbatim in the primary
  surface form — the engine drops non-verbatim slots instead of
  guessing. Slots are display-only: they never affect grading,
  evidence, or scheduling. Absent `kind` means an ordinary word.
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
