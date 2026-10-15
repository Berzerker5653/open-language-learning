# Pack audio loudness: measured, and one earlier claim retracted

Measured on GamingPC (inference host `lab-main`) on 2026-10-15, working tree at
`b35f03e` plus in-progress desktop work. Reproducible commands are listed at the
bottom; every number below is tool output, not inference.

## The retraction

`tasks/KANBAN.md` (content-depth row) and the `CONTENT-DEPTH-001` note in
`state/task-state.json` both asserted that the journey audio added on 2026-10-14
was produced **without SoX and is therefore unnormalised**. That is wrong, and
this file is the correction that stays in the repo.

1. **SoX was never in the synthesis path.** Loudness normalisation lives in
   `scripts/generate-pack-audio.py::normalize_wav`, pure Python: gain-match so the
   RMS over active (speech) frames reaches `TARGET_ACTIVE_RMS = 0.15`, capped by
   `PEAK_CEILING = 0.70` of full scale, with an `ACTIVE_GATE = 0.02` silence gate.
   The absence of the `sox` binary on any host changes nothing about those files.
   (Confirmed: `which sox` → not found on GamingPC, Omarchy and Hermes worker;
   `ffmpeg`/`ffprobe` are present on all three and are unrelated to this path.)
2. **The tracked assets measure conforming.** Re-applying `normalize_wav` to a
   copy of every tracked journey asset returns byte-identical audio with
   `gain 1.00x`, and every peak sits at or under `round(0.70 · 32767) = 22937`.

## Measured rows (18 assets: 8 ja-JP, 10 ru-RU)

`identical` = re-normalised copy is byte-identical to the tracked file.
`row_sha_ok` / `row_bytes_ok` = the media manifest row matches the file on disk.

| id | peak | gain note | identical | row sha/bytes |
|---|---|---|---|---|
| `ja.sent.film-friend-recommended` | 22937 | 1.00x | yes | ok |
| `ja.sent.film-long-interesting` | 22823 | 1.00x | yes | ok |
| `ja.sent.film-recommend-friend` | 19504 | 1.00x | yes | ok |
| `ja.sent.film-teacher-points` | 22937 | 1.00x | yes | ok |
| `ja.sent.office-notice-time` | 22937 | 1.00x | yes | ok |
| `ja.sent.office-question-email` | 22937 | 1.00x | yes | ok |
| `ja.sent.office-room-reserve` | 22937 | 1.00x | yes | ok |
| `ja.sent.office-thanks-notice` | 22937 | 1.00x | yes | ok |
| `ru.dialog.cafe-drink*` (5 rows) | ≤ 22937 | 1.00x | yes | ok |
| `ru.dialog.station-meet*` (5 rows) | ≤ 22937 | 1.00x | yes | ok |

The per-asset peak list for the ten Russian rows is in the raw tool output quoted
below; all 18 rows report `identical=True row_sha_ok=True row_bytes_ok=True`.

Pack-level check with the committed tool (no rewrite needed):

```
$ ./scripts/renormalize_pack_audio.py languages/ja-JP --all-tracked
renormalize-pack-audio: summary languages/ja-JP: rows updated=0 rows unchanged=8 rows failing=0
$ ./scripts/renormalize_pack_audio.py languages/ru-RU --all-tracked
renormalize-pack-audio: summary languages/ru-RU: rows updated=0 rows unchanged=10 rows failing=0
$ git status --porcelain languages/            # empty: no bytes changed
```

## What enforces this now

- `scripts/renormalize_pack_audio.py` — targeted re-normalisation of pack media
  rows (specific ids, or `--all-tracked` for exactly the assets git carries). It
  runs the synthesis DSP unchanged, then updates `sha256`/`bytes`/`notes` in
  `media/manifest.jsonl`; a row whose audio is already conforming is left alone,
  and a row that stays broken is reported as failing.
- `scripts/test_renormalize_pack_audio.py` — 8 tests, now run by `scripts/ci.sh`
  and by the `schemas` job in `.github/workflows/ci.yml`. Covers the
  quiet-toward-target case, the hot-file pull-down with a strict peak bound,
  manifest row rewrite plus note provenance, idempotence, and that an
  unrelated tracked row is left untouched.
- `scripts/ci.sh` now restores **both** packs' media with
  `fetch-pack-audio.sh --pack-dir <dir> --verify-only` before the Rust suite
  (`SKIP_PACK_AUDIO=1` refuses the download and fails with a named error), which is
  what CI already did.
  That closes the local-gate gap that made the desktop-lib tests fail in a clean
  clone run on 2026-10-15.

## Scope of this measurement, stated honestly

- Covered: the 18 tracked journey assets, byte-for-byte, plus manifest
  integrity for those rows.
- Not re-measured here: the ~9,746 bulk pack assets. They are distributed inside
  the published pack archive and are verified for presence, size and hash by
  `scripts/fetch-pack-audio.sh --verify-only` (measured in the clean-clone run:
  ja `rows checked=4902 files restored=0 files already valid=8 rows failing=0`;
  ru `rows checked=4856 files restored=0 files already valid=10 rows failing=0`).
  Those assets were produced by the same generator, so they carry the same
  normalisation, but no loudness measurement of each of them was run locally.
