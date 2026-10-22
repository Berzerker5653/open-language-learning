# Pack Authoring Contract (agent-facing)

Audience: AI agents and human authors producing language packs. This is
the single contract: everything a pack must satisfy, in one place. The
machine-checkable sources of truth are `crates/langpack/src/layout.rs`
(layout), `schemas/v0.2/` (per-type schemas), and the `langpack` CLI
(every rule below is enforced by one of its commands). If this document
and those disagree, they win — fix this document.

For the ordered route — what to run, in what order, and what an honest finished
state looks like — start at `docs/QUICKSTART_PACK_AUTHORING.md`.

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
                                  # + declared-licence-vs-source check (info)
langpack test <pack>              # install-mode validation + all audits (release gate; audio must be baked first)
langpack build <pack> -o out.lpk  # deterministic archive; requires scaffold-clean AND baked audio
```

`validate --mode install` additionally enforces promotion gates
(non-empty licenses/sources, resolved references, license clearance);
`TBD` content licensing blocks install, never drafting.

### Learner-visible romaji and script labels

`validate` adopts three lexicon-audit codes as hard gates: learner-visible
romaji that contradicts an entry's own kana is misleading on screen. The
rest of `audit-lexicon` (`lexicon_script_contamination`, Cyrillic stress
marks) stays audit-only so the install gate does not widen by accident.

- A `transliteration_system` reading carrying kana (U+3040–U+30FF) or an
  ASCII digit (`kentoう`, `ronso2`, `jiゅnり`): `reading_transliteration_not_latin`
  (Error in every mode).
- Kana inside a sentence's `romaji` field — digits stay legal there, because
  sentence texts legitimately contain Arabic numerals
  (`3-nen shokumu keiken ga arimasu.`): `romaji_contains_kana`
  (Error in every mode).
- A `script` label of `hiragana`/`katakana` on text that carries kana of the
  *other* block and none of the labelled one (マナー labelled hiragana):
  `form_script_mismatch` (Error in every mode). Text with no kana at all, or
  with kana of both blocks (エコくるま, はんばーガー), is left alone — no single
  label describes it, so the rule fires only when the label is outright wrong.
  U+30FC, U+30FB and space are script-neutral, so まーけっと stays clean.

Repair tooling: `scripts/fix-pack-transliterations.py --pack <pack-dir>`
regenerates romaji from the entry's own kana reading and never copies a
sibling row's spelling (`--check` is the default, `--write` rewrites the
shards, `--report <csv>` lists every repair).

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

### Verifying the audio (PACK-AUDIO-VERIFICATION-001)

Baked audio is certified by three machine gates before a pack is ever
offered for release (owner directive 2026-10-21: voice lines must be
machine-checked for accuracy, for any and all languages):

```sh
ASR_MODEL=<whisper ggml> WHISPER=<whisper-cli> bash scripts/qa-audit.sh languages/<pack> <asr-lang>
```

1. `scripts/qa-asr.py` — whisper round-trip: the clip must transcribe back
   to the declared text (word content).
2. `scripts/qa-segments.py` — ML-free structure: onset bursts, internal
   silences > 0.8 s, clipping, trailing noise (never content).
3. `scripts/qa-pron.py` — phoneme-level RECORD layer: recognized phones,
   edit distance and a CTC alignment posterior are logged per clip for
   human review and future re-calibration. It does not auto-flag:
   calibration (2026-10-21) found no threshold separating known-bad from
   certified-good clips with this recognizer — the README documents both
   failed experiments. A new language is still a new mapping module
   (`scripts/qa_pron_g2p.py`): expected phones derive from the pack's own
   text, and an unmapped language ABSTAINS explicitly — the layer never
   silently passes a language it cannot read.

Every certify-layer FAIL re-enters `scripts/bake-repair-loop.sh` (all
layers run per round; default `ALL_GATES=1`) until clean or
owner-dispositioned. The audit
JSONL + repair record land under `state/evidence/PACK-AUDIO-VERIFICATION-001/`
and are cited in the pack's provenance at publish time. The phoneme
model weights are NOT shipped in the app or the pack — they are a
development-time check only (the model is upstream CC-BY-NC; internal
verification use, zero distribution). What no gate certifies: naturalness
— the human listening pass remains the final word (see the READMEs for
each gate's documented blind spots).

### CI vs the release path

CI restores the published pack archives and then runs install-mode `test`,
because the `.wav` bytes are gitignored and a fresh checkout would otherwise
fail `media_unbuilt`/`media_missing` for reasons that say nothing about the
pack. The order is: `scripts/fetch-pack-audio.sh --pack-dir languages/<pack>
--work-dir tmp/pack-audio` for both reference packs (downloads the `.lpk`
pinned by `pack_id`+`version` in `catalog/packs.json`, refuses a size/sha256
mismatch, copies only manifest-named files), then `validate`, `lint`, `test`,
`audit-curriculum`, `audit-lexicon` and `audit-licenses` for
`languages/ja-JP`, `validate`/`lint`/`test` for `languages/ru-RU`, and `lint`
for `tools/pack-templates/example-pack` (`.github/workflows/ci.yml`). A pack
whose audio has no published archive cannot take that path: a new pack ships
either baked audio (release) or committed placeholder fixture bytes, which is
exactly why the conformance packs under `examples/` commit their WAV bytes so
install mode can gate them in CI. The release path stays bake-then-build
(`scripts/build-catalog.sh` → `langpack build`); the manifest/byte pairing
logic itself is pinned by `crates/langpack/tests/media.rs` under
`cargo test --workspace`.

## Language-level (band) coverage

Band every goal: the goal schema carries a `band:` token (enum:
`on-ramp`, `A1`, `A2`, `B1`, `B2`, `C1`, `C2`). Bands are framework
vocabulary, not certifications — the UI glosses them generically and
renders any band subset (`apps/desktop/src/home.tsx`).

A band-scoped pack must ALSO ship a finite coverage denominator at
`docs/assessment/RELEASE_COVERAGE_<lang>.yaml`, grounded in a NAMED real
framework (ja-JP: Japan Foundation Standard; ru-RU: ТРКИ/ТБУ component
model). Per required objective it lists modalities, prerequisites, an
`assessment_plan`, and an honest `content_status`; plus
machine-verifiable gates: `coverage_linkage` (via `audit-curriculum`),
`review_core`, `sampling_disclosed`, `speech_features`,
`sources_licenses`. The gates are run by hand
(`audit-curriculum` / `audit-licenses`): the denominator is a
hand-authored review artifact, NOT parsed by CI.

Honesty: a band is labeled at most **"partial (review pending)"** until
every gate passes; completeness may NEVER be inferred from unit or
activity counts (docs/18).

### Tier-scoped / single-band packs

First-class, and they need no new manifest field: a pack's covered
bands = the bands its goals use + the bands its coverage map lists.
Bands the pack does not claim are simply absent — never marked
"incomplete". Example: an A1-only starter pack uses only `band: A1`
goals and a coverage map listing only A1.

## Complete-pack checklist (reference-grade inventory)

`languages/ja-JP` is the reference inventory. A complete pack ships:

- `manifest.yaml` — every required field (schema_version, pack_id, version,
  target_locale, source_locales, engine, maturity, capabilities{listening,
  speaking, reading, writing}, license), honestly-set optional capabilities
  (`pronunciation_assessment`, `prosody_assessment`, `handwriting`, `rtl`,
  `scenario_help` — declaring the last promises the U07 help guarantee and
  must be kept (ADR-0038)), plus `scripts`, `world`, and
  `requested_model_capabilities`;
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
- `tests/README.md` — the pack's test plan;
- If you band goals, you ship a coverage denominator and label bands
  partial until gates pass (see §Language-level (band) coverage above).

### `maturity` is a claim about review, not about completeness

The manifest enum is `experimental`, `community`, `validated`, `verified`,
`reference`. The tier names **who has examined the content**, not how much of
it exists — a fully populated pack nobody has reviewed is still
`experimental` — and the tier is learner-visible: the pack picker renders it
verbatim (`apps/desktop/src/onboarding.tsx:187` prints
`(locale, maturity)`).

- Start at `experimental`. Scaffolds — including `scripts/new-pack.py`
  output — and AI-drafted packs stay there until a human review happens.
- No check in this repo authorizes promotion. `tools/validate_handoff.py`
  fails a scanned pack that claims a tier above `experimental`, because the
  checker has no evidence with which to certify it; `--release-readiness`
  separately requires a trusted tier, which is why both reference packs still
  report `pack is experimental/unreviewed`.
- Promotion is a qualified-human decision (REVIEW-001), evidenced in the
  pack's `review/` files. An author, a generator or an agent editing the field
  is a false claim, not a version bump.

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
7. When a lesson family is meant to exercise a whole goal, declare the
   sequence with `task_sequence` (ADR-0037): `input`, `scaffolded`,
   `independent`, `transfer`, `reuse`, each naming one activity id in the
   pack. Put the first three on the introducing unit; let `transfer` name the
   changed-context activity (a scenario stage, or a stage in a later unit
   that reuses the same content refs) and `reuse` name a stage in a unit that
   `requires_unit`-gates on the introducing unit. Only name activities the
   engine can actually run — the audit reports a named-but-unrunnable role as
   `task-sequence-unrunnable` rather than pretending the stage exists. A
   speaking stage stays guided: it writes no mastery score (ADR-0017).

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

`tools/pack-templates/example-pack/` is a **reading example and a `lint`
starting point, not an installable pack**: manifest, one goal with an
assessment, one grammar concept, three lexicon entries, one sentence with a
cloze target, and one unit exercising encounter/recall/cloze/dictation.
Measured at this head: `validate` 0 errors / 0 warnings, `lint` 0 / 0, and
install-mode `test` fails with `media_manifest_absent` — it has four
audio-addressable items and no `media/manifest.jsonl`. CI runs `lint` over it,
not the install gate. To start a pack that actually installs, use
`scripts/new-pack.py` (`docs/QUICKSTART_PACK_AUTHORING.md` §1a) and read a
pack that clears all seven gates: `examples/eo-community/` or
`examples/ar-ma/`.

## CI for community pack repos

Use `tools/pack-templates/ci-community-pack.yml` (GitHub Actions): it
runs `langpack test` on every push/PR and attaches the built `.lpk` on
tags. Pin the toolchain; the validator is deterministic.
