# Language Pack Authoring Quickstart

Audience: authors of language packs (human or AI-assisted). The layout
contract and per-type schemas live in `schemas/v0.2/` (see its README);
this document is the workflow around it. All commands are the
`langpack` CLI (`cargo run -p lts-langpack-cli --` or a built binary).

The single agent-facing contract — requirements digest, templates,
worked example, CI — is `docs/PACK_AUTHORING_CONTRACT.md`.

## 1. Start a pack

```sh
langpack init my-pack --pack-id dev.example.my-lang --locale xx-XX --name "My Language"
```

Creates a minimal 0.2 pack that validates clean immediately:
`manifest.yaml`, `curriculum/goals.yaml`, empty `sources.jsonl`,
`licenses.jsonl`, `grammar/concepts.jsonl`. Set the real
`target_locale` and `pack_id` before going further.

## 1b. Choose levels (bands) and set your scope

Band every goal (`band:` enum: `on-ramp`, `A1`…`C2`). Decide which
bands you cover: a small pack may target a single tier (an A1-only
starter is fully supported — just use only those bands). If you band,
add the finite coverage denominator
`docs/assessment/RELEASE_COVERAGE_<lang>.yaml`, grounded in a NAMED
framework; bands stay "partial (review pending)" until the gates pass.
Standard: "Language-level (band) coverage" in
`docs/PACK_AUTHORING_CONTRACT.md`; author rules in
`tools/AI_LANGUAGE_PACK_AUTHOR_PROMPT.md`.

## 2. Author content

- Goals: `curriculum/goals.yaml` (`goals:` array, one schema per entry).
- Lexicon: `lexicon/*.jsonl` (one JSON object per line).
- Grammar concepts: `grammar/concepts.jsonl`; optional
  `grammar/dependencies.yaml` mirrors goal prerequisites and must agree.
- Units/scenarios: `curriculum/units/*.yaml`, `curriculum/scenarios/*.yaml`.
- Assessments: `assessments/definitions.jsonl`.
- Every content record cites `sources:` ids that exist in `sources.jsonl`.
- Every third-party or derived asset needs an entry in `licenses.jsonl`.

IDs follow the content-ID grammar (`domain.kind.topic...`, ≥2 segments;
see `schemas/v0.2/README.md`). File-local record ids (source/license
names) are separate and pack-scoped.

## 2b. Bake the audio (mandatory — the pack carries 100% of it)

Runtime TTS was removed (ADR-0024): there is no read-time fallback, so every
clip a learner hears must be baked into the pack. `scripts/generate-pack-audio.py`
enumerates the audio-addressable items exactly as the install gate does — every
sentence, every phonology contrast item, every script-tagged lexicon entry —
synthesizes each (default engine Qwen3-TTS CustomVoice, ADR-0023), and writes
`media/manifest.jsonl`:

```sh
scripts/generate-pack-audio.py --pack my-pack --language <lang>
```

Never hand-write manifest rows or edit their hashes. The `.wav` bytes are
gitignored; only `media/manifest.jsonl` is committed. Until every addressable
item has a row **and** its baked `.wav`, install-mode `validate`, `test`, and
`langpack build` all refuse the pack (`media_asset_missing`) — an audio-less
archive is not a legal artifact.

A **complete** pack ships the full reference-grade inventory, not just the
files `init` scaffolds: `language/{identity,normalization,orthography,phonology,pragmatics}.yaml`,
`orthography/*.jsonl`, `phonology/contrasts.jsonl`, `curriculum/` (goals + units +
agreeing dependency mirrors), `grammar/{concepts.jsonl,dependencies.yaml}`,
`lexicon/` + `sentences/`, `activities/scenarios/`, `stories/`,
`world/environments.jsonl` (declared as `world:`), `assessments/`, `review/`
(kit + policy + dated worklists), `sources.jsonl`, `licenses.jsonl`,
`media/manifest.jsonl`, `tests/README.md`. Full list: "Complete-pack checklist"
in `docs/PACK_AUTHORING_CONTRACT.md`.

## 3. Check as you go

```sh
langpack validate my-pack          # schema + layout + semantics (draft posture)
langpack lint my-pack              # fails on warnings too (quality gate)
langpack audit-curriculum my-pack  # prerequisite cycles, mirror, dead goals
langpack audit-sources my-pack     # provenance completeness
langpack audit-lexicon my-pack   # script purity + stress self-consistency
langpack audit-licenses my-pack    # redistribution gates + attribution report
```

`validate --mode install` additionally enforces promotion gates
(non-empty licenses/sources, resolved references, license clearance).

## 4. Full conformance gate

```sh
langpack test my-pack
```

Runs install-mode validation plus all audits in one pass; exits non-zero on any
error and **requires baked audio**. The release path runs it (`build-catalog.sh`
bakes, then `test` / `build`). CI itself runs only the draft gates (`validate`,
`lint`, `audit-*`) — never install-mode `test` — because the gitignored `.wav`
bytes would trip `media_unbuilt`/`media_missing` in a fresh checkout for reasons
that say nothing about the pack.

## 5. Package, ship, roll back

```sh
langpack build my-pack -o my-pack.lpk   # deterministic; scaffold-clean AND baked audio
langpack inspect my-pack.lpk            # manifest without extracting
langpack install my-pack.lpk --store ~/.lts/packs
langpack rollback dev.example.my-lang --store ~/.lts/packs [--to 0.0.1]
```

Archives are `lts-pack/1` zips with a SHA-256 manifest; install rejects
path traversal, symlinks, unlisted entries, size bombs, and hash
mismatches, and validates the extracted pack in install mode before
committing it to the store.

## Rules that never bend

- Third-party sources are reference-only unless their license allows
  redistribution; `audit-licenses` blocks the reference build otherwise.
- Pending (`TBD`) content licensing blocks install, not drafting.
- Prerequisite graphs must be acyclic and every goal must be reachable
  from a delivered unit/scenario.
- Packs are data: no executable code is ever part of a pack.
