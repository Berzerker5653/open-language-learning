# JA-KANJI-ATTRIBUTION-001 — attribution surface evidence

Date: 2026-10-17. Card: `JA-KANJI-ATTRIBUTION-001` (required for `REL-001`, per the owner
ruling recorded in ADR-0034). Invariant: *a learner can see where a pack's content came from
without leaving the app, and sees only what the pack actually declares.*

## What the learner sees

The existing Language packs panel — the place the learner already goes to look at a pack
(Settings ▸ Language packs) — grows a **Stated sources** list per pack. The pack card renders
it for every installed pack, not only for kanji decks. From `apps/desktop/src/language.tsx`
(the block added inside the pack-card branch, after the licence/capability rows):

- A heading `Stated sources`, unconditional, so a pack with nothing declared is visibly
  answered rather than silently blank.
- One row per declared source, keyed by the source `id`, labelled with
  `use.attribution_text` when the pack supplies one, otherwise the source `title` — verbatim.
  The renderer never composes a sentence of its own.
- A licence link when `licenses.jsonl`/the entry carries `license.text_url`
  (`{license} license text`, or `license text` when there is no SPDX id); a bare `license`
  with no URL renders as plain text; otherwise the source `url` renders as `source`.
- `(${access})` — the pack's own access mode (`public`, `restricted`, `reference-only`).
- The pinned release, taken verbatim from `access.notes` and rendered as a muted suffix, plus
  `retrieved {retrieved}` when the entry carries it.
- Empty state: `This pack declares no sources — its shipped content carries no attribution.`
- Trailer, unconditional: *The complete pack-level notice list ships in
  `third-party/notices/NOTICE.md`.* — so the panel is presented as the app-side surface and
  the file as the complete list, which is the relationship the licence asks for.

No new CSS: the block reuses the panel's existing `meta-list` / `meta` / `empty` classes.
`content_hash` is never turned into learner prose; it is carried on the row as a
`data-content-hash` attribute only. `use_notes` and `redistribution_allowed` are carried on
the payload for the panel to use later but are not rendered as learner prose, so no
redistribution wording is invented.

## Where the data comes from

The payload is read **from the installed pack**, never re-derived from a hardcoded table — the
lesson of this card: the hardcoded `third-party/notices/NOTICE.md` had already drifted from
what the packs ship, and the kanji deck's source was missing from the app-side notice list
entirely.

`content_claims()` in `apps/desktop/src-tauri/src/lib.rs` (the function behind
`get_pack_claims`) already validated the two provenance files and counted them; it now also
projects each row. It reads `licenses.jsonl` into a `spdx → text_url` map (duplicate ids take
the first non-empty URL) and joins each `sources.jsonl` entry against it, then emits the new
`ProvenanceClaim` rows on `PackClaims.provenance`. Install-mode validation already rejects a
pack with an empty `licenses.jsonl` (`crates/langpack/src/pack.rs:892-900`) or with no
`source-entry` at all (`:934-942`), so the payload is never a guess about an installable pack:
a pack that installs declares at least one source. The pack format and both schemas are
unchanged.

Schema defaults are applied at the payload boundary, exactly as the schema states
(`schemas/v0.2/source-entry.schema.json:126-134`): `use.attribution_required` defaults to
`true`, `use.redistribution_allowed` defaults to `false`. A row without an `id` is skipped — it
would not be a safe React key — and `Store::load_source_entries` drops invalid rows by design.

## Pinned-version policy

There is no versioned-URL problem to solve here: the pin lives in the pack data. The
`zalizniak-2010` source row's `title` carries the git commit
`c39322cb50aec024dd46aa182796520f77bf3dab`, and the batch rows carry a dated access note. The
renderer therefore prints `access.notes` (and the `title` when there is no
`attribution_text`) **verbatim** instead of parsing a version out of them. It does not
normalise URLs or synthesise a pinned-release field, because inventing one would be the app
speaking for a licence it does not own. The Rust test asserts the commit substring arrives
untouched.

## Per-pack counts, measured from the installed packs

From the real reference packs (`languages/ja-JP/sources.jsonl` 9 rows,
`languages/ru-RU/sources.jsonl` 3 rows), asserted in
`provenance_payload_covers_every_installed_pack_verbatim`:

| pack | version | trust | declared sources | ids |
|---|---|---|---|---|
| `org.openlanguage.ja-jp` | 0.4.1 | reference | 9 | `jf-standard`, `edrdg-jmdict`, `pyopenjtalk`, `commonvoice-ja-27`, `ai-drafted-kana`, `ai-drafted-extension`, `jmdict-simplified`, `kokoro-sherpa-tts`, `kradfile` |
| `org.openlanguage.ru-ru` | 0.4.1 | community | 3 | `ru-original`, `zalizniak-2010`, `ru-batch-70ec683-20f994d` |

The ja deck's ninth row is the one this card was opened for: `kradfile`, whose
`attribution_text` is *"Radical/decomposition data: KRADFILE © Electronic Dictionary Research
and Development Group, CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html)"* and whose
`content_hash` `90369021899d89159ee6e079bccd7d83915daa3191f0c6ed7efc2473e088c086` is what the
deck's `references.source` resolves against — the deck row and the attribution row are now the
same row on screen. `jmdict-simplified` pins its 2026-10-11 scrape by content hash
(`5f54504a62a7f45741e1bf6fd28f6e1e5add6405f2829748cc004a802839a3aa`), also asserted.

## EDRDG duty on a screen the learner sees

`languages/ja-JP/roles/third-party/edrdg-kkj.txt` (KRADFILE, CC BY-SA 4.0) requires the
acknowledgement in the about/sources screen of any product using the data, and asks that
substantive changes to the data be reported back to EDRDG. The first duty is now met in-app:
the pack card names KRADFILE with its SPDX licence, the EDRDG licence URL and the CC BY-SA
attribution text, and points at `third-party/notices/NOTICE.md` as the complete list.
`third-party/notices/NOTICE.md` §3 was rewritten from "not rendered anywhere in this build" to
describe the surface that now exists, including the pack's explicit statement of whether it
declares sources.

The second duty is **not** satisfied here and is recorded as still open: the update procedure
(`edrdg-kkj.txt:113`) needs a maintainer channel back to EDRDG. `pack:ja-KANJI-DECOMP-001`
records that we changed no dictionary content, so the obligation is to route the pack's own
source notes upstream, which is an owner action, not a UI action. `NOTICE.md` §4 stays open for
it. No other landed pack carries a licence-text file: `rg -l "Creative Commons|Permission is
granted" languages/*/roles/third-party/` matches only that file, and
`languages/ru-RU/roles/third-party/zalizniak-2010.txt` is a provenance note, not licence text.

## Verification

Focused provenance gate (Rust, GamingPC):

```
$ cargo test -q -p lts-desktop --lib provenance
running 3 tests
...
test result: ok. 3 passed; 0 failed; 0 ignored; 0 measured; 151 filtered out; finished in 261.75s
```

`provenance_payload_covers_every_installed_pack_verbatim` builds and installs the real 318 MB
ru reference archive, which is why the focused run costs ~4 minutes; the full-suite run below
reuses the same fixture cost.

Full desktop Rust gates, in order, one chain:

```
$ cargo fmt -p lts-desktop -- --check
FMT_OK
$ cargo clippy -q -p lts-desktop --all-targets -- -D warnings
CLIPPY_OK
$ cargo test -q -p lts-desktop --lib
test result: ok. 153 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 407.67s
```

The one failing test before this change (`provenance_payload_covers_every_installed_pack_verbatim`)
failed because the `install_bundled_pack` test shim only knows the ja fixture; it now stages
`languages/ru-RU` directly with `archive::build` + `archive::install` and records the
installation, so it exercises the real pack. The pre-existing claim-report test
(`pack_claims_report_installed_pack_data_without_upgrading_trust`) was extended with the
hash/attribution assertions rather than replaced, and
`a_pack_without_declared_sources_gets_an_empty_provenance_payload` pins the empty-payload half
of the rule. The perf probe stays `#[ignore]`d: it is measurement evidence requiring a 318 MB
network fixture, not a CI gate.

Frontend (GamingPC, node v26.11.1):

```
$ cd apps/desktop && npx tsc --noEmit
(exit 0)
$ npx vitest run src/language.test.tsx
Test Files  1 passed (1)
     Tests  17 passed (17)
```

The two new panel tests assert the rendered surface, not the plumbing: one drives
`get_pack_claims` with two ja sources — one with `attribution_text` plus a pinned release in
`access.notes`, one with only a `title` and no `text_url` — and asserts the exact attribution
strings, both licence-text hrefs, the verbatim pin text, the bare `source` link, the absence of
a fabricated sentence and of the word `kanji` in the section; the other injects an installed
pack with an empty `provenance` array and asserts the app says so plainly and renders no source
lines. A fixture with two sources deliberately does **not** copy the real 9-source count, so
the panel test does not silently track pack growth.

Learner-copy audit (same run, unchanged by this card):

```
$ .venv/bin/python tools/audit_learner_copy.py
LEARNER COPY AUDIT v1.0.0: 36 source files scanned, 22 test files skipped
findings: 0
```

## Residue

- `third-party/notices/NOTICE.md` §4 (EDRDG update-notification duty) remains open and needs an
  owner action.
- `NOTICE.md` §3's second item remains open at pack level: `licenses.jsonl` and
  `pack.toml.licenses` are both empty for both packs, so the pack's own licensing is still
  undeclared. That is separate from this card and is not claimed here.
- `kradfile` still has no role file; its hash is identical to `edrdg-jmdict`, which is why it
  has no third-party directory of its own.
