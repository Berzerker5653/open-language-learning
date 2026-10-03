# Contributing a community language pack

A language pack is **declarative data, never code**: JSONL/YAML content
plus media files, validated before install and executed by the engine's
own activity types. Packs may not contain scripts or executables; the
installer rejects archives with unsafe paths, oversized files, checksum
mismatches, or schema violations.

## Quick start

```sh
cargo run -p lts-langpack-cli -- init my-pack --pack-id community.you.language --locale LANG --name "Display Name"
cd my-pack   # edit manifest, sources, licenses, then content
cargo run -p lts-langpack-cli -- test my-pack
cargo run -p lts-langpack-cli -- build my-pack --out my-pack-1.0.0.lpk
```

`templates/language-pack-template/` is the same scaffold, checked in.

## Structure (layout contract, schema v0.2)

- `manifest.yaml` — identity, version, locale, engine compatibility
  (`engine.min_version`), capabilities, license block.
- `sources.jsonl` — every source you used: id, title, URL, license (or
  `reference-only`), access date, attribution text.
- `licenses.jsonl` — redistribution policy per material class.
- `curriculum/goals.yaml` — goals and units with prerequisite graph.
- `lexicon/*.jsonl`, `grammar/concepts.jsonl` — content items; each item
  references `sources` ids and carries `status` (`draft` →
  `review-needed` → reviewed only by humans).
- `activities/scenarios/*.yaml`, `language/phonology.yaml`,
  `media/*.wav` — optional; media requires rights for distribution.

## Licensing and provenance rules

1. **Original content**: state it in `licenses.jsonl`
   (`kind: original`) and pick a license (CC-BY-4.0 recommended for
   text/media). You keep copyright; the license grants redistribution.
2. **Derived content** (dictionary data, corpus excerpts): the source's
   license governs. CC-BY-SA sources require attribution + share-alike
   on your derived data. Reference-only sources (e.g. pedagogical
   frameworks) may *inform* your goals but their text may not be copied.
3. **AI-generated replacements** are allowed but must be labeled as such
   and stay `review-needed`: no pack may claim qualified human review it
   did not receive. `review_status: reviewed` in a catalog entry is your
   claim, shown to users as a claim; the app never upgrades local trust.
4. **Synthesized audio**: label `model-output` and record the model +
   its license. Check the model's *and its dependencies'* licenses before
   distributing (e.g. GPL-licensed text-to-speech frontends carry GPL
   obligations — see `docs/provenance/speech-distribution-audit.md`).
5. `audit-licenses` fails the build on blocked or unlicensed
   redistribution; run it before publishing.

## Attribution

Every third-party source record needs an `attribution` string;
`langpack audit-licenses --attribution-report` aggregates what your pack
must display. Keep attribution inside the pack so it travels with every
install.

## Publishing to the community catalog

1. Publish the `.lpk` as a **GitHub release asset** (immutable per
   version; re-upload requires a version bump).
2. PR an entry to `catalog/packs.json`:

   ```json
   {
     "pack_id": "community.you.language",
     "version": "1.0.0",
     "display_name": "Display Name",
     "locale": "LANG",
     "author": "Your Name",
     "license": "CC-BY-4.0",
     "review_status": "community",
     "min_sdk_version": "0.1.0",
     "url": "https://github.com/you/repo/releases/download/v1.0.0/my-pack-1.0.0.lpk",
     "sha256": "<64 hex chars>",
     "size_bytes": 123456
   }
   ```

3. Maintainers verify `langpack test` passes on the exact archive before
   merging. The app enforces: https + GitHub release hosts only, pinned
   checksum/size re-verified at install, archive identity must match the
   entry.

## What community packs are not

- Not part of the reference curriculum; they are labeled community
  content in the UI everywhere.
- Not trusted code; they cannot run anything.
- Not a review shortcut: qualified human review (docs/16) is separate
  and cannot be satisfied by hosting.
