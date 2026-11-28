# FIX-PACK-K65-001 — K-65 audio-manifest vs reading regression (ja-JP extended pack)

Board card `t_dfe6865a`. Spawned because `cargo test -p lts-desktop --lib` went red
(260/4): the four pack-loader consumers (`provenance_payload_covers_every_installed_pack_verbatim`,
`letter_drills_span_two_prompt_families_and_reach_independent`,
`sharded_pack_directories_reach_every_reader`,
`writing_targets_are_parsed_once_per_version_root`) install the extended ja-JP source
pack, and the build-path validator (`crates/langpack/src/archive.rs` → `Pack::validate`)
rejected it with `pack has N validation error(s)` (K-65 rule: the media manifest must
record exactly the text fed to the generator — `docs/provenance/ja-jp-greeting-audio-k65.md`).

## Scope decision

The working tree carried orphaned WIP from the dead `FIX-M1-CONTENT-JA-001` lane
(restoring 17 corrupted `-masu` verb cards + the katakana loanword convention +
`scripts/check_ja_lexicon.py` regression gate). That WIP changed declared readings to
the linguistically correct forms while the shipped audio had been baked from the
CORRUPTED readings (the 2026-10-05 `fix_reading` ai-screening pass, see
`docs/review/ai-screening-2026-10-05/applied.jsonl`) — so adopting the reading fixes
mechanically produces `media_text_not_declared_reading` errors for every one of them.

This card therefore ships BOTH halves of one coherent change:
1. adopt the orphaned WIP (verdict in `state/evidence/FIX-PACK-K65-001/adopt-notes.md` — sound, fully adopted);
2. re-bake the 19 affected clips with `scripts/generate-pack-audio.py`
   (qwen3-tts / ono_anna, the pack's standing synth) so every manifest row records
   the corrected declared reading, sha256/size written by the generator itself.

No manifest `text` was hand-edited. No pack data outside languages/ja-JP needed changes.
No apps/desktop source change was needed (the four tests fail purely on pack data).

## Enumeration note

The board body said "17 validation error(s)" (measured mid-WIP). This lane's full
enumeration at start (committed pack data + orphaned WIP in tree) found **25** errors
(19 text + 3 size + 3 hash; the size/hash drift = 3 clips the dead lane had re-baked
on disk without rewriting their manifest rows). See `gates.log` for the verbatim list.

## Gates (lane tier)

- `cargo fmt --all --check`
- `cargo clippy -p lts-desktop --all-targets -- -D warnings`
- `cargo test -p lts-desktop --lib` (full, before/after)
- `.venv/bin/python -m unittest scripts/test_ja_lexicon_check.py` (8 tests)
- `.venv/bin/python scripts/check_ja_lexicon.py` (0 hard violations)
- `langpack validate languages/ja-JP --mode scaffold` → 0 errors
