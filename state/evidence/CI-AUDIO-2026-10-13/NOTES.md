# CI-AUDIO 2026-10-13 — restore pack audio into a fresh clone

Delegated job (remote snapshot workspace, execution host: OMP controller
`linux 7.2.5-3-omarchy`, x64). Goal: a reproducible path for CI and new
contributors to restore the gitignored `languages/*/media/*.wav` from the
published pack archives so `cargo test --workspace` and
`scripts/smoke-desktop.sh` pass on a fresh checkout.

## Files changed (within Ownership)

- `scripts/fetch-pack-audio.sh` (new, executable)
- `scripts/test_fetch_pack_audio.py` (new)
- `.github/workflows/ci.yml` (restore + cache steps in `rust` and
  `desktop-smoke`; script regression test in `schemas`; two stale
  install-mode-`test` rationale comments in the Pack conformance step
  refreshed — no other behavior changed)
- `state/evidence/CI-AUDIO-2026-10-13/NOTES.md` (this file)

Nothing else touched. `crates/langpack/src/archive.rs` (the silent-archive
guard at line ~97) is untouched; `.gitignore` untouched; no `.wav` was
created in the repo by any command below.

## How it works

`fetch-pack-audio.sh [--pack-dir DIR] [--catalog FILE] [--work-dir DIR] [--verify-only]`

- Reads `pack_id`/`version` from `<pack-dir>/manifest.yaml` (same sed
  pattern as `build-catalog.sh`/`stage-pack-bundle.sh`), resolves the
  matching entry in the catalog; absent entry fails naming
  `pack_id`+`version` and that the archive must be published first
  (owner gate O-05); missing `url`/`sha256`/`size_bytes` keys fail by name.
- Downloads with `curl -fL --retry 3` (HTTP error ⇒ fail); `file://` URLs
  are local copies (hermetic tests / offline mirrors only).
- Verifies exact `size_bytes` + `sha256` against the catalog pin before
  use — every run, including for an archive found already in `--work-dir`;
  a mismatch is deleted and refused.
- Malformed `manifest.jsonl` lines abort the pass (strict jq, parsed once
  per pass), never a silent skip.
- Unpacks through `cargo run -q -p lts-langpack-cli -- install --store
  <work>/store <archive>` (the install gate; a corrupt archive never
  reaches the working tree), then copies exactly the `media/*.wav` rows the
  tracked `manifest.jsonl` demands into `<pack-dir>/media/`. A `.wav`
  whose size+sha already match its manifest row is never deleted or
  overwritten (verified via inode identity in the tests), so re-runs are
  idempotent (`files restored=0`).
- Final pass verifies EVERY manifest row (file exists, sha256, byte
  length), prints `summary ...: rows checked=N files valid=N files
  restored=N files already valid=N rows failing=N`, prints each offending
  id, exits non-zero on any failure. `--verify-only` does only that pass:
  no network, no cargo.
- `set -euo pipefail`; repo-root-relative by `cd "$(dirname "$0")/.."`
  like the sibling scripts; no host-absolute paths.
- `LTS_LANGPACK_CLI` env override replaces the install command
  (whitespace-split; used only by the hermetic tests, documented in the
  script header).

CI (`ci.yml`): `rust` job and `desktop-smoke` job each get
`Cache published pack archives` (`actions/cache@v4`, path
`tmp/pack-audio`) + `Restore reference-pack audio (published archives)`
(both packs, `--work-dir tmp/pack-audio`) — in `rust` before
`cargo test --workspace`, in `desktop-smoke` before
`./scripts/smoke-desktop.sh`.

## Checks actually run (all in foreground, host as above)

1. `bash -n scripts/fetch-pack-audio.sh` → `BASH-SYNTAX-OK`
   (12:43:51-06:00 run).
2. `python -m unittest scripts.test_fetch_pack_audio -v` → **8 tests, OK**
   (0.209 s). Also `python3 scripts/test_fetch_pack_audio.py` (the form CI
   runs) → OK; `python3 -W error::SyntaxWarning scripts/test_fetch_pack_audio.py`
   → OK (no warnings). Tests:
   - `test_verify_only_passes_when_everything_matches`
   - `test_verify_only_fails_naming_the_corrupt_wav_id` (same length,
     flipped bytes → names id + `sha256 does not match`)
   - `test_verify_only_fails_naming_the_missing_wav_id`
   - `test_verify_only_without_audio_fails_naming_every_id`
   - `test_catalog_resolution_names_pack_and_version_when_absent`
   - `test_catalog_entry_missing_pins_is_refused` (sha256 and size_bytes)
   - `test_restore_copies_missing_rows_and_never_touches_valid_ones`
     (local `file://` archive + stub install: `files restored=2`,
     `files already valid=1`; untouched file keeps its inode; second run
     `files restored=0`; then `--verify-only` passes)
   - `test_archive_disagreeing_with_the_catalog_pins_is_refused`
     (wrong sha256 → `refusing to use it`, nothing restored; wrong size
     likewise)
   No network, no cargo used by the tests.
3. `python -c "import yaml;yaml.safe_load(open('.github/workflows/ci.yml'))"`
   → `YAML-OK`; additionally parsed the step list: in `rust`,
   `Restore reference-pack audio (published archives)` precedes
   `cargo test --workspace`; in `desktop-smoke` it precedes
   `./scripts/smoke-desktop.sh`; `schemas` ends with
   `python scripts/test_fetch_pack_audio.py`.
4. Real `--verify-only` against both reference packs on THIS host:
   - `./scripts/fetch-pack-audio.sh --pack-dir languages/ja-JP --verify-only`
     → exit 1, first offender
     `ja.contrast.gemination.kite-0: file missing`, summary
     `rows checked=4894 files valid=0 files restored=0 files already valid=0 rows failing=4894`
   - `./scripts/fetch-pack-audio.sh --pack-dir languages/ru-RU --verify-only`
     → exit 1, first offender `ru.contrast.palatalization.brat-0: file missing`,
     summary `rows checked=4846 ... rows failing=4846`

   **This host has NO baked audio** (`ls languages/*/media/*.wav` → 0
   files; nothing in the repo gained wavs from these runs — verify-only is
   read-only). So the "verify-only all-green against the real packs"
   variant could NOT be demonstrated here; what is demonstrated is the
   real-manifest parse (4894/4846 rows) and the precise per-id failure
   output the acceptance demands for a broken/absent file.

## Not verified here, and why

- End-to-end restore with the REAL langpack CLI and a published archive:
  `cargo` is absent on this execution host (`which cargo` → none); the
  delegation explicitly leaves cargo verification to the parent. The
  download + size/sha pin checks up to the unpack step and everything
  after are covered by the hermetic tests (with a store-layout stub for
  `install`: `<store>/<pack_id>/<version>/`, which is exactly what
  `archive::install` does — `crates/langpack/src/archive.rs:343-355`).
  CI exercises the real CLI; the brief's own manual verification of
  `install --store` output (4,894 wavs under `media/`) corroborates the
  layout the script consumes (`<store>/<pack_id>/<version>/media`, with a
  `find … -name media` fallback).
- CI behavior itself (cache hit/miss, ~634 MB download): only assertable
  on GitHub Actions after the parent applies + pushes; locally pinned to
  YAML validity, step ordering, and the script's own contract tests.

## Deliberate choices / deviations

- Cache key is `pack-audio-${{ hashFiles('catalog/packs.json') }}`
  instead of literally splicing the two version+sha256 strings into the
  key: any catalog change to either pack's pinned `version`/`sha256` (or
  url) flips the key, with no duplicated magic constants to drift in
  ci.yml. A stale hit is still refused: the script re-verifies size+sha256
  against the catalog before unpacking (`test_archive_disagreeing_with_the_catalog_pins_is_refused`).
- Work-dir/cache path is `tmp/pack-audio`, not `.cache/pack-audio`:
  `.gitignore` ignores `tmp/` but has no `.cache` entry, and `.gitignore`
  is outside my ownership. Archives land in an ignored path either way
  (`tmp/` is the repo's existing scratch-ignored directory).
- The conformance-step comments in ci.yml were refreshed (they justified
  skipping install-mode `test` by "fresh checkout has no audio" — no
  longer true once the restore step runs). The commands they annotate
  are unchanged.

## Parent follow-ups (out of my ownership, informational)

- None blocking. If the owner wants the cache key literally keyed on the
  pinned version+sha256 strings, swap the `key:` line; behavior is
  identical because pins are re-verified at every run.

## Clean-checkout acceptance proof (local, 2026-10-13)
Simulated a fresh CI checkout: `git ls-files | xargs -I{} cp --parents {} /tmp/ci-sim/`
→ 42 MB tree, `languages/*/media/*.wav` count = 0 (tracked files only).
Then, in /tmp/ci-sim (the only extra files were the two new scripts):

    ./scripts/fetch-pack-audio.sh --pack-dir languages/ja-JP
    ./scripts/fetch-pack-audio.sh --pack-dir languages/ru-RU

    ja: summary languages/ja-JP: rows checked=4894 files valid=4894 files restored=4894 files already valid=0 rows failing=0
    ru: summary languages/ru-RU: rows checked=4846 files valid=4846 files restored=4846 files already valid=0 rows failing=0
    find languages -name '*.wav' | wc -l  →  9740

Wall time for both restores (download of the two published archives + install-gate
unpack + per-file sha256 verification): 174 s. Unpacking went through the real install
gate (`cargo run -q -p lts-langpack-cli -- install`), so a published archive that does
not match its tracked manifest rows cannot pass this step.
Then `CARGO_TARGET_DIR=/tmp/ci-sim-target cargo test -p lts-desktop` in that tree — the
job that was red in run 38432671203 — result appended below.

## Contributor-side cost of the mutation suite (found while waiting)
`tools/test_validate_handoff.py` copied the whole checkout per test
(`shutil.copytree(ROOT, ...)` ignoring only `__pycache__, .venv, target, node_modules`),
which on a machine with generated pack audio means ~3.4 GB per case: tmp/ 2.6 GB
(33,030 files), languages/*/media 796 MB, .git 56 MB, dist/. Observed before the fix:
31 cases did not finish inside 600 s (about 20 s per case, I/O dominated).
Fixed by also ignoring `tmp, dist, build, .git, *.wav`
(media/manifest.jsonl is kept: the validator reads it).
Measured after the fix: one fixture copy = 0.38 s, 124 MB, 3,635 files. The suite's
remaining cost is not copying: each case re-runs the full audit, and one standalone
`python tools/validate_handoff.py` over 1,905 data files is 18.5 s single-threaded on
this machine, so 31 cases are inherently minutes. CI is unaffected either way (a runner
checkout has no audio, no tmp/, no dist/).

## Desktop test suite in the audio-restored checkout (green)

    cd /tmp/ci-sim && CARGO_TARGET_DIR=/tmp/ci-sim-target cargo test -p lts-desktop
    test result: ok. 124 passed; 0 failed; 0 ignored; finished in 415.95s

The 8 cases that failed in CI run 38432671203 are named in that pass, among them
a_fresh_ja_jp_plan_is_all_introductions_in_the_packs_goal_order,
bundled_japanese_pack_installs_and_records,
bundled_pack_phrase_entries_carry_valid_slots,
goal_map_orders_bands_by_ladder_not_ascii and
first_run_steps_lead_with_the_declared_script_in_its_teaching_order.
Nothing in lts-desktop needed changing: the tests were correct, the checkout was
incomplete. That is the whole point of the restore step.

## Mutation suite after the fixture fix (green)

    time python -m unittest discover -s tools -p 'test_*.py'
    Ran 37 tests in 436.337s
    OK
    real 7m16.589s   user 118m23.433s   sys 4m5.599s

Green, and no longer I/O bound: 11.8 s per case is the audit itself (user time far
exceeds real time, so the audit is using the cores). Before the fix the same cases did
not finish inside 600 s with ~3.4 GB of copying per case.

## Run 38457024075 conclusions (head 4908174), observed 2026-10-13 20:40

rust **success** (first time that job has ever completed), desktop-smoke **failure**,
schemas/security/web/platform-compile(windows)/platform-compile(macos) **success**,
platform-bundles **skipped** (dependency-gated).

Failure mechanism read from the step log, not guessed:

```
19:49:01 == launch under Xvfb ==
19:53:01 smoke-ok home-rendered
19:53:01 smoke-ok home
19:53:01 FAIL: walkthrough never completed (exit 124)
```

exit 124 is the script's own `timeout 240` killing a live app whose furthest
marker was `home`. Marker lines are logged at `cat` time, so the log cannot say
when `home` was reached; the run simply never got past it inside 240 s.

Locally at the same tree the script completes in **182 s** end to end
(`SMOKE OK (13 routes walked)`) and in **207 s** pinned to 2 CPUs
(`taskset -c 0,1`), and with `LTS_SMOKE_TIMEOUT=5` it reaches
`smoke-ok home` in about 4 s. So the budget, not the tree, is what failed.

Fix: `LTS_SMOKE_TIMEOUT` env override (default still 240) and CI sets 900.
If a 900 s CI run still fails, the script's own `paint-stall` reporting should
name the route it froze on instead of dying anonymous at the watchdog.

## desktop-smoke green — run 38463751108 (head 92291b0), observed 2026-10-13 20:52

`desktop-smoke` **success**. That is the first time the job has completed with the
whole pushed tree, and it is the first time it completed after the watchdog fix, so
both halves of the earlier diagnosis hold: the audio restore works and the 240 s
budget was too tight for a 2-core runner (the job now runs with `LTS_SMOKE_TIMEOUT: 900`).
Also green in that run: `web`, `security`, `platform-compile (windows-latest)`,
`platform-compile (macos-latest)`; `platform-bundles` skipped (dependency-gated);
`rust` and `schemas` still running when this was written.

Local gate evidence for the same acceptance set: `cargo test --workspace` (lts-desktop
124/0), `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`,
`cargo run -q -p lts-langpack-cli -- test` 0 errors / 0 warnings for `languages/ja-JP`
and `languages/ru-RU`, and `scripts/smoke-desktop.sh` → `SMOKE OK (13 routes walked)`
in 182 s (and 207 s pinned to 2 CPUs).
