# Catalogue review packet — what you are approving

Companion to `state/evidence/OWNER-CHECKLIST-2026-10-16.md` §5a. Prepared 2026-10-16 from the
tracked tree (`6648da6`) and the candidate catalogue built from the exact archives that were
published (`dist/rc-0.4.1/packs.json`, built 2026-10-16 08:20, gitignored).

Raw evidence in this directory:

```
gh-readback-ja-jp-0.4.1.txt   gh-readback-ru-ru-0.4.1.txt   (live host read-backs)
gh-readback-ja-jp-0.4.0.txt   gh-readback-ru-ru-0.4.0.txt
validate-handoff-default.txt  validate-handoff-strict.txt
```

## 1. Every field, and where the generated value comes from

Tracked `catalog/packs.json` holds two entries. Both were compared field by field with the
generated candidate. Identical unless stated otherwise.

| field | tracked value | generated? | derivation (`crates/langpack-cli/src/main.rs`) |
| --- | --- | --- | --- |
| `pack_id`, `locale`, `author` | `org.openlanguage.{ja-jp,ru-ru}.reference` | yes | from the pack manifest |
| `version` | `0.4.1` | yes | `manifest.yaml` version at build time |
| `url` | `…/releases/download/<tag>/<file>.lpk` | yes | `--url-template` in `scripts/build-catalog.sh:16` |
| `sha256`, `size_bytes` | ja `e697ee92…4690` / 318,722,747; ru `9eb074fa…1d7a` / 318,489,935 | yes | measured off the built archive; re-verified against the live asset digest on 2026-10-16 |
| `license` | ja `CC-BY-SA-4.0`, ru `CC0-1.0` | yes | `manifest.yaml:33` / `:30` — the ja value that had to be hand-corrected for 0.4.0 is now reproducible because the pack itself declares CC-BY-SA-4.0 |
| `display_name` | "Japanese Reference Pack" / "Russian Reference Pack (Draft)" | yes | `manifest.yaml:3` — note the ru pack still declares `(Draft)` in its own manifest, so the catalogue label is the pack's claim, not an app judgement |
| `review_status: community` | same | yes | `:1246` — `reference/certified/reviewed` maturity → `reviewed`, otherwise `community`; it is the author's claim and the app never upgrades trust from it |
| `min_sdk_version: "0.1.0"` | same | yes | `:1247` — manifest `engine.min_version`, default `0.1.0` |
| `tested_platforms: ["linux"]` | same | carried through, never derived | `:695-699` rejects any attempt by a report record to populate it; `:1182-1185` defaults the root to `["linux"]` only when absent |
| `community_confirmed_platforms: []` | same | yes | from `docs/platform/PLATFORM_REPORTS.yaml` (`--platform-reports`) — empty because no human runtime report exists |
| `untested_platforms: ["windows","macos"]` | same | yes | everything neither tested nor community-confirmed |
| `catalog_version` | tracked `0.1.0`, generated `"1"` | differs | hand-set in the tracked file |
| root `note`, `platform_note` | tracked has both, generated has a one-liner | differs | hand-authored prose; regenerating would drop `platform_note` if you pasted the candidate verbatim |

## 2. Reproducibility verdict

- `scripts/build-catalog.sh` writes **`dist/preview/packs.json`** only (gitignored). It never
  touches the tracked `catalog/packs.json`; merging entries into it is owner gate O-05
  (`scripts/build-catalog.sh:55-56`).
- Cost of running it: it rebuilds four archives — `ja-jp-reference`, `ru-ru-reference`, `ja-demo`,
  `eo-demo` (`:43-46`) — so the draft carries **four** entries where the tracked file has two: you
  drop `ja-demo` and `eo-demo` by hand. With `WITH_PACK_AUDIO=1` it bakes Qwen3-TTS audio for
  **ja-JP only** (`:37-41`); ru audio is never baked by this script.
- **The in-place trap.** `langpack catalog` reads and then rewrites whatever `--file` you give it
  (`crates/langpack-cli/src/main.rs:1169-1181`); the fresh root object (`catalog_version: "1"` plus
  a one-line note) is used only when that file is missing. A draft therefore has no `platform_note`,
  `catalog_version: "1"`, and the short note. Copying the draft over the tracked file would silently
  delete the owner prose — that is exactly what the `diff` step in checklist §5a exists to catch.
- Derivation detail, so you know what is yours and what is not: the entry for a `pack_id` is deleted
  and replaced, then the array re-sorted (`main.rs:1239-1256`); platform fields are re-stamped per
  entry (`main.rs:922-924`) and at the root (`main.rs:936-937`). Today `docs/platform/PLATFORM_REPORTS.yaml:51`
  is `reports: []`, which is why `community_confirmed_platforms` is `[]` and `untested_platforms` is
  `["windows","macos"]`. `tested_platforms: ["linux"]` is maintainer-owned and never derived from reports.
- **The published pins cannot be reproduced.** `sha256`/`size_bytes` are computed from freshly built
  bytes (`main.rs:1249-1250`); synthesis is not byte-reproducible
  (`docs/13_RELEASE_AND_DISTRIBUTION.md:419-421`: "a regeneration is a pack change (version bump,
  fresh catalog hashes …)"); and a fresh checkout has no `.wav` bytes at all, while
  `crates/langpack/src/archive.rs:97` refuses to build an archive that omits declared media. Any
  regeneration therefore produces **different digests**, which means a new pack version (0.4.2) and a
  catalogue that no longer describes the 0.4.1 assets. Regenerate only when you intend to publish
  again — not to "check" the file.
- Verdict: the tracked file already matches what the toolchain produced for the archives you
  published, field for field. There is no content drift here to review; the only judgement left is
  cosmetic (§3).

## 3. The decisions sitting on this file

1. Whether `catalog_version: "0.1.0"` should change now that two entries point at 0.4.1.
2. Whether the ru pack's own `display_name` should keep `(Draft)` after review — it is a pack
   manifest field, so it needs a content change plus a new version, not a catalogue edit.
3. Whether `tested_platforms: ["linux"]` stays accurate — it does today; a Windows/macOS runtime
   report fills `community_confirmed_platforms`, never this field (ADR-0015).
4. `review_status: community` is not hand-written either: `main.rs:1246` derives it from the pack
   manifest — `maturity` in `reference|certified|reviewed` yields `reviewed`, anything else yields
   `community`. Both packs are `maturity: "experimental"` (`languages/ja-JP/manifest.yaml:10`,
   `languages/ru-RU/manifest.yaml:10`), so no regeneration can ever print `reviewed` for them. The
   lever is a human pack change: calibrated reviewer records in `languages/<pack>/reviews.jsonl`
   first (ADR-0003), then the manifest maturity flip, then a new release. Nothing you can type into
   the catalogue changes it.
