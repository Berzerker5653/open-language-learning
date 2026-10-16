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
  (`scripts/build-catalog.sh:55-56`). Regeneration therefore cannot clobber the live catalogue.
- Cost of running it: it rebuilds four archives — `ja-jp-reference`, `ru-ru-reference`,
  `ja-demo`, `eo-demo` (`:43-46`) — and with `WITH_PACK_AUDIO=1` it runs the Qwen3-TTS bake for
  ja-JP first (`:37-41`). On a machine without the bake venv, leave that flag off: the media
  already baked into `languages/ja-JP/media/` is what gets archived.
- Verdict: **the tracked catalogue is consistent with what the toolchain produces for the published
  archives**, field for field, including the licence value that motivated the 0.4.1 republish. What
  a regeneration would lose is your two prose fields and `catalog_version: "0.1.0"`.
- The catalogue entries' digests match the live immutable assets byte for byte
  (`gh-readback-*.txt` in this directory); the client transport was proven against these pins
  end-to-end (`state/evidence/RC-0.4.1-2026-10-15/publication-2026-10-16.md` §4).

## 3. The decisions sitting on this file

1. Whether `catalog_version: "0.1.0"` should change now that two entries point at 0.4.1.
2. Whether the ru pack's own `display_name` should keep `(Draft)` after review — it is a pack
   manifest field, so it needs a content change plus a new version, not a catalogue edit.
3. Whether `tested_platforms: ["linux"]` stays accurate — it does today; a Windows/macOS runtime
   report fills `community_confirmed_platforms`, never this field (ADR-0015).
4. `review_status: community` is the author's claim. Nothing in the app upgrades it, and it stays
   `community` until a real `reviews.jsonl` record exists — which is the same lever as the band
   reviews.
