# Pack Authoring Kit — start here

This is the route, not the specification. One document cannot be both, and the
specification has to stay normative. Read in this order:

| document | what it is for |
| --- | --- |
| this file | the route: what to run, in what order, and what an honest finished state looks like |
| `docs/PACK_AUTHORING_CONTRACT.md` | the contract: layout, schemas, gates, media rules, band coverage, the complete-pack checklist |
| `tools/AI_LANGUAGE_PACK_AUTHOR_PROMPT.md` | the prompt to hand an AI author; self-contained, carries the non-negotiables |
| `docs/16_CONTENT_AUTHORING_AND_REVIEW.md` | authoring order and review protocol (human reviewers) |
| `docs/04_LANGUAGE_PACK_SPEC.md` | why the pack model is shaped this way |

`examples/minimal-language-pack/` is a manifest illustration, not a starting
point: it fails `validate` (`script_unknown`) and `test`
(`license_inventory_missing`, `redistribution_blocked`, `script_unknown`,
`sources_missing`). Copy `tools/pack-templates/example-pack/`, or scaffold with
`scripts/new-pack.py` (§2).

## 0. Decide scope before generating anything

Answer these in the manifest, not in prose:

- **Which bands?** Goals carry `band:` (`on-ramp`, `A1`, `A2`, `B1`, `B2`,
  `C1`, `C2`). A single-band pack is first-class and needs no extra field —
  bands the pack does not claim are simply absent, never "incomplete".
- **Which scripts?** `manifest.scripts` lists script ids, and every one must be
  declared in `language/orthography.yaml` (undeclared → `script_unknown`).
  There is **no engine script allowlist**: Arabic, Cyrillic, Hangul, Georgian
  are accepted because your pack declares them and the orthography layer
  covers them. No engine change is required to add a script.
- **Which capabilities?** `capabilities{listening,speaking,reading,writing}`
  plus the honest optional ones (`rtl`, `pronunciation_assessment`,
  `prosody_assessment`, `handwriting`). Set them to what the content actually
  supports.
  - Say plainly that `rtl` is currently a **pack-side claim only**: nothing in
    `apps/desktop` reads it, so an RTL pack installs and validates but the UI
    does not flip text direction. Declaring it is honest about the content;
    it is not a claim that rendering is right-to-left.
- **World?** If you declare `world:` in the manifest you must ship parsable
  `world/environments.jsonl` rows (`world_collection_missing` otherwise).

## 1. Sources and licences before content

Every content row names a source id; every source id appears in
`sources.jsonl`; every source appears in `licenses.jsonl`. The canonical pack
files are `sources.jsonl` and `licenses.jsonl` (`crates/langpack/src/layout.rs`
also accepts `SOURCES.yaml`/`LICENSES.yaml` array forms, but the reference
packs use the JSONL files — use those).

This is the gate that has actually bitten us: a declared `content_license` that
is **more permissive** than the source it derives from passes every check, and
0.4.0 shipped that way (`CC-BY-4.0` over a `BY-SA` mirror — `docs/04` §Licensing
retrospective). `audit-licenses` proves the opposite direction only. So the
matrix is a human obligation, not a lint: for each source record the exact
upstream licence, and if anything derives from a share-alike source, the pack's
licence must carry the same obligation.

Self-authored or AI-drafted material is a source too: record it (`provenance:
ai-drafted` / original draft) instead of leaving rows source-less.

## 2. Scaffold

```sh
python3 scripts/new-pack.py --out examples/eo-community --language eo --locale eo-001 \
    --title "Esperanto Community Starter" --scripts Latin --band on-ramp
python3 scripts/new-pack.py --out examples/ar-ma --language ar --locale ar-MA \
    --title "Arabic (Morocco) Starter" --scripts Arabic,Latin --rtl --band A1
```

The generator writes a pack that passes every gate with **placeholder audio**,
labels every row it could not verify as draft, and prints the questions it could
not answer. It does not invent linguistic facts, and it never claims its audio
is speech (§4). Scaffold into your own directory and rewrite the draft content:
the scaffold is a shape, not content worth keeping.

## 3. Gates, in the order that costs least to fail

```sh
CLI="cargo run -q -p lts-langpack-cli --"
$CLI validate          <pack>   # schema + layout conformance
$CLI lint              <pack>   # learner-visible defects, not schema errors
$CLI audit-curriculum  <pack>   # goal/unit/concept linkage, coverage integrity
$CLI audit-lexicon     <pack>   # transliteration and script-label integrity
$CLI audit-licenses    <pack>   # licence inventory completeness (see §1 limits)
$CLI audit-sources     <pack>   # source records well-formed and actually cited
$CLI test              <pack>   # install mode: media coverage + redistribution
```

`test` is a different mode, not a stricter lint: it requires
`license.redistribution_allowed: true`, non-empty `sources.jsonl` and
`licenses.jsonl`, and a `media/manifest.jsonl` row for every audio-addressable
item (every sentence, every phonology contrast item `{row.id}-{index}`, every
script-tagged lexicon entry).

## 4. Audio: three honest states, no fourth

The app carries no runtime synthesizer (ADR-0024) — it plays what the pack
shipped, or stays silent. So audio state is a fact the pack declares:

| state | how it happens | what it means |
| --- | --- | --- |
| drafting | no `media/manifest.jsonl` | `media_unbuilt`/`media_manifest_absent` are Info; the pack cannot install |
| placeholder | fixture rows (`synthesizer.runtime: "fixture"`, `model: "fixture-silence"`) over real silent WAV bytes | installs, for tests and scaffolds; must never be presented as speech |
| baked | `scripts/generate-pack-audio.py --pack <pack>` (ADR-0023 engine, weights pinned by sha256) | the release posture; `.wav` bytes stay gitignored, the manifest row is the record |

Never hand-write or hand-edit `media/manifest.jsonl` rows: they record the bytes
a bake produced (`media_hash_mismatch`/`media_size_mismatch` catch a lie).
Placeholder rows are written by the generator and follow
`tests/fixtures/packs/ja-demo/media/manifest.jsonl` exactly, including
`sha256`/`bytes` computed from the file on disk.

CI vs release: the engine's CI restores the published reference-pack archives
(`scripts/fetch-pack-audio.sh --pack-dir languages/<pack> --work-dir tmp/pack-audio`)
so install-mode gates can run, and `scripts/ci.sh` runs `validate`/`lint`/`test`
for both reference packs plus `lint` for the template and the conformance packs.
The release path bakes first (`build-catalog.sh`).

## 5. Band coverage: a denominator, not a count

A band-scoped pack ships a finite denominator at
`docs/assessment/RELEASE_COVERAGE_<lang>.yaml`, grounded in a named real
framework, with per-objective modality/prerequisite/assessment-plan/
`content_status` and the five gates the contract lists. Until every gate
passes, a band is labelled **partial (review pending)** at most. A learner-facing
count without a denominator is a defect — "you know 12 words" against an
unstated target is unverifiable by design (docs/18).

## 6. Review is a separate role, and an AI cannot fill it

A pack ships the reviewer kit, not a review: `review/REVIEW_POLICY.yaml` (the
one governed file), `review/REVIEWER_KIT.md`, and dated `review/WORKLIST-<date>.md`
files for every pending item, with the manifest at `review_status: draft`.
Status flips require an approved `reviews.jsonl` record from a named human
(REVIEW-001). An AI author sets its own content to draft and may prepare the
worklist; it may not approve it. The app renders the resulting
"AI-generated content · not human-reviewed" banner because the manifest says so
— that banner is the point, not a blemish.

## 7. What an AI author must hand back

1. the pack itself, with the gate output pasted in (all seven, errors and
   warnings as reported, not as expected);
2. the source/licence matrix, with the licence of each source as written by its
   holder;
3. an unresolved-question file — `review/UNRESOLVED.md` is the right place
   (markdown inside a pack is documentation, not a layout violation): every
   linguistic claim you could not verify, every dialect/variant question, every
   register judgement that needs a native speaker;
4. an explicit list of everything left at 0, stubbed, or placeholder —
   including the audio state;
5. anything that looked like an engine gap, stated as a gap (what you tried,
   what the engine did). Do not work around an engine limitation by editing the
   engine inside a pack-authoring task; report it.

## 8. In-tree conformance proofs

`PACK-AI-001`'s bar is conformance, not educational completeness. Two generated
packs are pinned in CI (`scripts/ci.sh`):

- `examples/eo-community/` — a second, non-Japanese language generated with
  **no engine edits**;
- `examples/ar-ma/` — RTL and multi-script (Arabic + Latin): checks that script
  declaration, segmentation and transliteration rules are language-independent.

Regenerate either with `scripts/new-pack.py` (the command is in its header) and
re-run §3. `scripts/test_new_pack.py` covers the generator's structural
invariants without cargo, network or TTS.
