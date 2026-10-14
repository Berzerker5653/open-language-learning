# Language Pack Authoring Quickstart

Audience: authors of language packs (human or AI-assisted). The layout
contract and per-type schemas live in `schemas/v0.2/` (see its README);
this document is the workflow around it. All commands are the
`langpack` CLI (`cargo run -p lts-langpack-cli --` or a built binary).

The single agent-facing contract — requirements digest, templates,
worked example, CI — is `docs/PACK_AUTHORING_CONTRACT.md`.

## 0. Decide scope before generating anything

Decide these as manifest fields, not as prose:

- **Bands.** Goals carry `band:`; a single-band pack is first-class and bands
  you do not claim are simply absent (never "incomplete").
- **Scripts.** `manifest.scripts` entries must each be declared in
  `language/orthography.yaml` (an undeclared id is `script_unknown`). There is
  no engine script allowlist: Arabic, Cyrillic, Hangul, Georgian work because
  your pack declares them. Adding a script is authoring, not an engine change.
- **Direction.** `capabilities.rtl` is honest to declare when the content is
  right-to-left, but know what it buys today: nothing in `apps/desktop` reads
  it, so an RTL pack installs and validates while the UI still lays out
  left-to-right. Say so in the pack's notes rather than implying rendered RTL.
- **World.** Declaring `world:` requires parsable `world/environments.jsonl`
  rows (`world_collection_missing` otherwise).

## 1. Start a pack

```sh
langpack init my-pack --pack-id dev.example.my-lang --locale xx-XX --name "My Language"
```

Creates a minimal 0.2 pack that validates clean immediately:
`manifest.yaml`, `curriculum/goals.yaml`, empty `sources.jsonl`,
`licenses.jsonl`, `grammar/concepts.jsonl`. Set the real
`target_locale` and `pack_id` before going further. It is a draft skeleton:
no orthography, no media, so it cannot install.

## 1a. The AI route: scaffold a gate-complete candidate

```sh
python3 scripts/new-pack.py --out examples/eo-community --language eo --locale eo-001 \
    --title "Esperanto Community Starter" --scripts Latin --band on-ramp
python3 scripts/new-pack.py --out examples/ar-ma --language ar --locale ar-MA \
    --title "Arabic (Morocco) Starter" --scripts Arabic,Latin --rtl --band A1
```

`scripts/new-pack.py` is the conformance scaffold: unlike `langpack init` it
emits the whole inventory an install-mode pack needs (language layers,
orthography shards for each declared script, phonology contrasts, scenarios,
stories, assessments, non-empty `sources.jsonl`/`licenses.jsonl`, a review kit
and `tests/README.md`) plus **placeholder audio** in the
`tests/fixtures/packs/ja-demo` shape, so `langpack test` passes on a fresh
checkout with no TTS and no network. Every row it could not ground is
`status: draft`, and it prints the questions it could not answer — record them
in `review/UNRESOLVED.md` (markdown inside a pack is documentation, not a
layout violation). Treat its content as a shape to rewrite: the scaffold proves
structure, never linguistic correctness.

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

Audio has exactly three honest states, and a pack is always in one of them:

| state | how | what it may claim |
| --- | --- | --- |
| drafting | no `media/manifest.jsonl` | `media_unbuilt`/`media_manifest_absent` are Info in draft mode; install and `build` refuse the pack |
| placeholder | fixture rows (`synthesizer.runtime: "fixture"`, `model: "fixture-silence"`) over real silent WAV bytes whose `sha256`/`bytes` match what is on disk | installs; for scaffolds, fixtures and conformance proofs; NEVER presentable as speech |
| baked | `scripts/generate-pack-audio.py` (ADR-0023 engine, weights pinned by sha256) | the release posture; only this state is what a learner hears |

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
error and **requires audio** (baked or placeholder — what matters is that every
addressable item has a row whose bytes match). CI does run install-mode `test`:
`scripts/fetch-pack-audio.sh` restores the published reference-pack archives
(sha-pinned via `catalog/packs.json`) before the gates run, and a pack whose
audio is not published commits its fixture bytes instead (see the conformance
packs under `examples/`). The release path bakes first (`build-catalog.sh`,
then `test` / `build`).

## 4a. Two generated packs are already in the tree

`examples/eo-community/` (Esperanto, Latin, on-ramp) and `examples/ar-ma/`
(Arabic for the `ar-MA` locale, Arabic **and** Latin scripts, `rtl: true`, A1)
are this kit's conformance proofs: both were produced by the two commands in
§1a. All seven gates report 0 errors / 0 warnings for both, including
install-mode `test`, and CI runs those fourteen gate invocations in the `rust`
job. Their placeholder `.wav` bytes are committed deliberately — only
`languages/*/media/*.wav` is gitignored — so a fresh checkout gates install mode
with no download and no TTS, and both packs regenerate byte-for-byte from the
committed generator.

What they prove: a second, non-Japanese language and an RTL/multi-script pack
reach full pack conformance with **zero engine edits** (`crates/`, `apps/` and
`schemas/` were untouched during authoring). What they do not prove: teaching
quality. Both stay `maturity: experimental`; the audio is labelled placeholder
silence; the Arabic forms are standard-Arabic flavoured and unverified as
Darija, which is recorded in `examples/ar-ma/review/UNRESOLVED.md`; and
declaring RTL surfaced a real engine gap — nothing in `apps/desktop` reads
`capabilities.rtl`, so the pack installs and then renders left-to-right. That
gap is tracked as `RTL-001`; the measurements are in
`state/evidence/PACK-AI-001/`.

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

## Review is a different job, and the author cannot do it

A pack ships the reviewer's kit, not a review: `review/REVIEW_POLICY.yaml` (the
governed file), `review/REVIEWER_KIT.md`, and dated `review/WORKLIST-<date>.md`
files for each pending item, with the manifest at `review_status: draft`.
Promoting a row to `validated`/`verified` requires an approved `reviews.jsonl`
record from a named qualified human (REVIEW-001) — an agent writing its own
content may prepare that worklist but may never sign it. The app renders the
"AI-generated · not human-reviewed" banner *because* the manifest says draft;
the banner is the control working, not a defect.

## What an AI author hands back

1. the pack, with the seven gate outputs pasted as reported (errors and
   warnings included, not as expected);
2. the source/licence matrix — each source's licence as its holder writes it,
   and the pack licence no more permissive than the most restrictive source it
   derives from. **No gate checks this today**: `audit-licenses` inspects
   redistribution flags, reference-only claims and unknown licence ids, and never
   compares the pack's declared `content_license` with the licences of the sources
   its records cite — that is how 0.4.0 shipped `CC-BY-4.0` over CC BY-SA
   dictionary data. `LIC-002` exists to change that; until it lands, the check is
   yours.
3. `review/UNRESOLVED.md`: every unverified claim, dialect/variant question and
   register judgement that needs a native speaker;
4. an explicit list of everything left at 0, stubbed or placeholder, audio
   state included;
5. any engine gap found, stated as a gap (what you tried, what the engine did)
   — reported, not patched around inside the authoring task.
