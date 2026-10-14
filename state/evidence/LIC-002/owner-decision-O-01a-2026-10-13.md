# O-01(a) resolved: the Japanese pack is declared under the licence its dictionary source imposes

Date: 2026-10-13. Decision made by the owner in session, in answer to the
question "can we just run this all as free MIT content?". The record below is
the owner's choice; an agent cannot make or certify this call, and this file is
transcription plus measurement, not approval.

## What the owner chose

- **Pack content (`languages/ja-JP`)**: declare **CC-BY-SA-4.0** for the pack
  rather than CC-BY-4.0. Option chosen from three: declare honestly (chosen),
  drop or replace the dictionary-derived rows so the pack could be permissive
  (rejected — 4,141 of 5,362 rows are the pack's dictionary backbone), or leave
  the mismatch in place (rejected).
- **Application and engine source**: keep **Apache-2.0** (the `LICENSE` file
  today). MIT was considered and declined; the explicit patent grant is kept.

## Why "all MIT" was not on the table

Measured before answering, not from memory:

| material | volume | origin | declared |
| --- | --- | --- | --- |
| ja-JP lexicon rows | 4,057 | EDRDG JMDict (`sources.jsonl: edrdg-jmdict`, `CC-BY-SA-4.0`) | per-record `CC-BY-SA-4.0` (`licenses.jsonl: lic-lexicon-dictionary`) |
| ja-JP kanji rows | 84 | same source | per-record `CC-BY-SA-4.0` (`lic-kanji-dictionary`) |
| ja-JP sentences, grammar | 823 + 164 | ours (ai-drafted sources) | `CC-BY-4.0` |
| ja-JP audio rows | 4,894 | ours (`qwen3-tts-customvoice-1.7b` bake) | `CC-BY-4.0` |
| ru-RU pack | 100% original, 4,846 audio rows | ours | `CC0-1.0`; its only non-original source (`zalizniak-2010`, `CC-BY-NC-4.0`) is `access.mode: reference-only`, nothing distributed |
| `examples/eo-community`, `examples/ar-ma` | scaffold + placeholder audio | ours | `CC-BY-SA-4.0` scaffold (generator default), `Apache-2.0` placeholder audio |

ShareAlike travels to a derivative work, and MIT is permissive rather than
share-alike-compatible, so the JMDict-derived rows cannot be re-declared MIT by
us. Whether a filtered subset of dictionary facts is a copyrightable derivative
is contested across jurisdictions; JMDict's own terms say BY-SA, so the pack
follows them. That legal question is the owner's to settle, not the
toolchain's, and it is recorded here as uncertainty rather than a product claim.

## Changed in this decision

- `languages/ja-JP/manifest.yaml` — `content_license: "CC-BY-4.0"` → `"CC-BY-SA-4.0"`.
- `README.md` §Scope and licence — the pack sentence corrected to name the two
  packs' actual declarations and the fact that `audit-licenses` now checks the
  direction; the code licence (Apache-2.0) stated explicitly.
- `docs/10_LICENSING_AND_PROVENANCE.md`, `docs/13_RELEASE_AND_DISTRIBUTION.md`,
  `docs/adr/0028-license-permissiveness-detection.md`,
  `docs/provenance/JA_SOURCE_MATRIX.yaml` — the "open owner decision" and
  "the audit does not check this" wording replaced with the decision and the
  implemented check.
- `catalog/packs.json` and `catalog/preview-entries.json` were deliberately
  **left** at `CC-BY-4.0`: those records describe the already-published 0.4.0
  artifacts, which still carry the older declaration.

## Measured after the change

`for pack in languages/ja-JP languages/ru-RU examples/eo-community examples/ar-ma;
for g in validate lint audit-curriculum audit-lexicon audit-licenses audit-sources test`

```
failures=0 finding-lines=0
```

28/28 gate invocations exit 0, and no shipped pack prints
`license_less_permissive_than_source` any more. Coverage of the check now rests
on fixtures that keep a deliberately wrong declaration:
`tests/fixtures/packs/valid-license-bysa-dropped` (fires at record and manifest
level) and the pre-existing `valid-audit` fixture.

## Still open for the owner (O-01(b), not this decision)

The published 0.4.0 packs are unchanged, so the archive a user installs today
still understates the ShareAlike obligation. Closing that means: manifest
version bump, hand-edit `catalog/packs.json` (never `scripts/build-catalog.sh`),
re-hash, tag and release, update `docs/13`. Publishing, tagging and the final
licence wording remain owner-only actions.
