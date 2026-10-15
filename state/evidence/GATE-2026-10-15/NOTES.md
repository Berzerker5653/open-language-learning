# Gate record — 2026-10-15 (working tree, pre-push)

Batch runner `tmp/run_gates.sh` (scratch), logs in this directory. HEAD `b35f03e`,
tree dirty. `SUMMARY.txt` is the per-check exit table.

## Result

43 checks green, one red:

| check | exit |
|---|---|
| `fmt` (`cargo fmt --check`) | 0 |
| `clippy` (workspace, `-D warnings`) | 0 |
| `cargo test --workspace` | **101** (see below) |
| `web-tsc`, `web-vitest` (26 files, **239 tests**, 133 snapshots), `web-lint`, `web-dts` | 0 |
| reference-pack gates × 7 × 2 packs (`validate`, `lint`, `test`, `audit-curriculum`, `audit-lexicon`, `audit-licenses`, `audit-sources`) | 0 |
| example-pack gates × 7 × 2 examples | 0 |
| `template-pack-lint` | 0 |
| `root-prettier`, `root-eslint` | 0 |
| `restore-ja-JP-media`, `restore-ru-RU-media` (fetch-pack-audio `--verify-only`) | 0 |
| `renormalize-audio-tests`, `pack-audio-tests` | 0 |
| `content-template-audit`, `content-template-tests` | 0 |
| `learner-copy-audit`, `learner-copy-tests` | 0 |
| `handoff-validation` | 0 |

The new frontend totals are 26 files / 239 tests (was 24 / 222 at the `b35f03e`
green run): `+journeys/session.journey.tsx`, `+journeys/progress.journey.tsx`.

## The one red test, and what was wrong with it

`tests::plan_generation_stays_fast_on_the_reference_pack` failed on the *ratio*
clause, not on latency:

```
reference-pack parse: cold 299.6 ms, warm 394.7 ms; pack plan (warm): 2.2 ms
test panicked: planning got slower relative to parsing; planning depends on
parsing, not the reverse, so this must not happen
```

The assertion was `warm <= 1.25 × cold`. The same measurement has been observed
four times:

| run | cold | warm | warm/cold |
|---|---|---|---|
| 2026-10-13, first guard | 482.8 ms | 153.4 ms | 0.32× |
| 2026-10-13, CI | 436.2 ms | 439.3 ms | 1.01× |
| 2026-10-13, recheck | 350.7 ms | 303.7 ms | 0.87× |
| 2026-10-15 (this failure) | 299.6 ms | 394.7 ms | 1.32× |

`cargo test --workspace` runs the binaries in parallel (five binaries, the real
pack parse taking ~30 s), so this test's two timings are taken under varying
load. A ratio between two noisy numbers is not a gate. It also failed to test
what the card is about: if `packcache` shared nothing, warm would equal cold and
a `1.25 ×` bound would still pass.

The guard now asserts the invariant directly (`apps/desktop/src-tauri/src/lib.rs`):
`packcache::pack()` returns the same `Arc` for the same `(pack_dir, version)` on
the second call, with a cold-wait `> 50 ms` pre-check so a zero-wait fixture
cannot pass vacuously. The two duration backstops (`< 8 s` cold, `< 4 s` repeat)
stay.

After the change, run alone: `cold 317.5 ms, warm 105.5 ms`, `1 passed`.
Full `cargo test --workspace` rerun: **59 `test result: ok` lines, exit 0**
(`cargo-test-rerun.txt`); the failing batch log had only 6 binaries' results
because cargo stops at the first failing binary.

## Clean-clone reproducibility re-check

`tmp/clean-clone-2026-10-15` = fresh clone of `b35f03e`, then `scripts/ci.sh`.
Bulk pack media is absent there by design (`.gitignore` pins it;
ADR-0032 tracks only 18 audio exceptions) and `scripts/ci.sh` did not restore
media, so the run failed: `CARGO_EXIT=101`, five desktop-lib failures, all of
the form `pack has 4846 validation error(s): media/<id>.wav: referenced media
file is absent`. `git ls-files languages | wc -l` → 1967 in the clone vs 11,304
here.

This is the gate's gap, not the product's: CI restores media with
`fetch-pack-audio.sh` for **both** packs before the Rust tests; the local gate
restored neither. `scripts/ci.sh` now runs `--verify-only` for both packs
(falling back to a real restore), and fails with a named error under
`SKIP_PACK_AUDIO=1` instead of letting media-absence look like a pack defect.
`.github/workflows/ci.yml` additionally runs `scripts/test_renormalize_pack_audio.py`
so the loudness suite is CI-enforced, as `scripts/ci.sh` already did.

After that change, rerun in the same clean clone: media step
`rows checked=4856 files restored=4846 already valid=10 failing=0` for both
packs, **59 `test result: ok`**, `CARGO_EXIT=0`. Both runs' stdout was captured
in the session only: my `tee state/evidence/GATE-2026-10-15/clean-clone-ci.txt`
target directory does not exist inside a fresh clone (the gate evidence dir is
untracked at `b35f03e`), so no log file was written. The durable log for this
claim is produced by re-running `scripts/ci.sh` in a fresh clone of the pushed
commit, which is where the fix actually lands.
