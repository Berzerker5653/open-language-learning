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

After that change the media stage passed in that clone — ru
`rows checked=4856 files restored=4846 files already valid=10 rows failing=0`,
ja `4902 / 4894 / 8 / 0` — and the Rust suite reached **59 `test result: ok`**.
That run still did not finish, and the reason matters: `scripts/ci.sh`
hard-required `pnpm`, which does not exist on this host
(`== web: install ==` → `pnpm: command not found`, exit 127). So no clean clone had
ever run the whole local gate on this machine: the "suite runs from a clean clone"
claim had only ever been established for the Rust half.

Fixed at HEAD `84b9658`. The web stage now selects a dependency runner: pnpm when
present (what CI uses, `pnpm install --frozen-lockfile`), otherwise npm against an
**already-prepared** root `node_modules`, walking `apps/*` and `packages/*`
explicitly because `pnpm -r` has no npm equivalent here (no npm workspaces field)
and the repository ships no `package-lock.json`, so an `npm install` would resolve
dependencies unpinned. A host with neither fails with a named error instead of 127.

Recorded run in `clean-clone-head-ci.txt` — fresh `git clone` of HEAD, `scripts/ci.sh`:

| stage | result |
|---|---|
| rust format, clippy | pass |
| packs: media | `media already valid: languages/ja-JP`, then `… ru-RU` — the first pass through this directory had already downloaded 4,894 + 4,846 files, so this log shows the verify path, not the download |
| rust test | **59 `test result: ok`** |
| packs conformance (ja-JP, ru-RU, eo-community, ar-ma) | pass |
| web dependency runner | `using npm 12.2.0 against the prepared node_modules (no pnpm here; no install performed)` |
| web fmt:check | `All matched files use Prettier code style!` |
| web typecheck | all six workspace packages (`apps/desktop`, `learner-ui`, `scenario-ui`, `schemas`, `shared`, `ui`) |
| web lint | pass |
| web test | `apps/desktop` 26 files / 239 tests, `shared` 1/2, `ui` 2/10; `learner-ui`, `scenario-ui`, `schemas` have no test files and run under `--passWithNoTests` |
| web build | `vite build` |
| schemas/handoff | `HANDOFF VALIDATION PASSED (1959 data files checked)` + the two standing WARNs |
| security mirror | `cargo audit` over 562 crate deps — the two known warnings (`proc-macro-error` unmaintained, `glib` unsoundness), no vulnerability; secret scan: 500 commits, 61.55 MB, **no leaks found** |
| total | `CI OK`, `CI_EXIT=0` |

Caveat stated plainly: root `node_modules/`, every package's `node_modules/` and
`.venv/` are gitignored, so a fresh clone has none of them. They were supplied here
by symlink from this host's prepared trees — the only way the web and schemas stages
can run on a host with no pnpm and no cached wheelhouse. A CI-equivalent dependency
install (`pnpm install --frozen-lockfile`) still requires pnpm, which only the Hermes
worker has.

## Update, same day: the pnpm caveat is closed locally, and CI parity at the batch head

The last sentence above is superseded. The pinned `pnpm@12.8.1` (from
`packageManager`) is now installed **in isolation** on the Gaming PC — `npm pack` +
sha512/shasum checked against registry metadata, wrapper running `bin/pnpm.mjs` under
`~/.local/opt/pnpm-12.8.1`; no global tool changed. Two host facts that cost a cycle to
learn: `npm install pnpm` yields **no binary** under npm 12 (install scripts are blocked)
and node 26.11.1 ships no corepack.

Re-measured in a fresh `git worktree` at `fd76786` with no `node_modules` present:
`pnpm install --frozen-lockfile` exit 0 (`Packages: +151`, 171 MB), then `pnpm fmt:check`,
`pnpm lint`, `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build` all green in that tree.
**Still not proven: a cold-network install** — pnpm reported `resolved 151, reused 151,
downloaded 0`, i.e. the content-addressable store was warm. Lockfile *resolution* is
supported; first-download behaviour is a CI-only claim.

CI at `fd76786` (the batch base, before the 0.4.1 bump): run `38757754128` completed
`success`; jobs `rust`, `web`, `desktop-smoke`, `schemas`, `security`,
`platform-compile (windows-latest)`, `platform-compile (macos-latest)` all `success`;
`platform-bundles` `skipped` (manual trigger only). The 0.4.1 manifest bump and the new
`crates/langpack/tests/media_upgrade.rs` are covered only by the run this batch pushes.

## Update: the batch head went red, and the cause was the version bump

Pushed batch head `b5bafc8` → run `38772271396` conclusion `failure`. Per job: `web`,
`schemas`, `security`, `platform-compile (windows-latest)`,
`platform-compile (macos-latest)` `success`; `platform-bundles` `skipped`; **`rust` (job
`116550909282`) and `desktop-smoke` (job `116550909671`) `failure`** — both at the step
"Restore reference-pack audio (published archives)", identical refusal, verbatim:

```
fetch-pack-audio: catalog: no single catalog/packs.json entry for org.openlanguage.ja-jp.reference 0.4.1 — the pack archive must be published (owner gate O-05) before its audio can be restored into a checkout
```

`scripts/fetch-pack-audio.sh` resolves audio by `<pack_id, version>` in
`catalog/packs.json`, and the catalogue still pins the published `0.4.0`. Bumping the
manifest ahead of publication therefore breaks restore, exactly as ADR-0032's gate is meant
to. The gate is working, not flaking; weakening the fallback was rejected. The tracked bump
is reverted and now lives only as `state/evidence/RC-0.4.1-2026-10-15/version-bump.patch`
(`git apply --check` clean against the reverted tree), so it can land only together with
publication and the two hand-edited catalogue entries — see queue **D2**.

Verification after the revert: `fetch-pack-audio.sh --verify-only` reports
`rows checked=4902 … rows failing=0` (ja) and `4856 … 0` (ru);
`validate` / `lint` / `audit-licenses` / `audit-sources` report no findings for both packs;
`tools/validate_handoff.py` and `--require-explicit-ledger-records` both end
`HANDOFF VALIDATION PASSED (1959 data files checked)` with the two standing WARNs.

## Baseline note: the data-file count is now 1960, not 1959

The validator walks `schemas/ languages/ examples/ tasks/ state/` and parses every
`.yaml/.yml/.json/.jsonl` it finds (`tools/validate_handoff.py:376-382`), so filing
`state/evidence/O-07/radical-changes-2026-10-15.json` (the 57-record O-07 change log) moved
both modes to `HANDOFF VALIDATION PASSED (1960 data files checked)`. **No pack data changed**;
every earlier `1959` figure in the day's records is a correct historical measurement of its
own tree, and the two standing WARNs are unchanged. Treat 1960 as the current baseline.

## Green again: per-job conclusion at the revert head

`8be62a2` (revert of the tracked pack bump) → Actions run `38774132358`, conclusion
**success**, watched to completion (`gh run watch --exit-status` exit 0, 3,144 s wall).
Per job: `rust` success, `web` success, `desktop-smoke` success, `schemas` success,
`security` success, `platform-compile (windows-latest)` success,
`platform-compile (macos-latest)` success, `platform-bundles` skipped (manual trigger only).

So the pair of runs is the evidence for the coupling recorded in the RC notes: `b5bafc8`
(manifest at `0.4.1`, catalogue at `0.4.0`) failed exactly the two jobs that restore audio,
and `8be62a2` (manifest back at the published `0.4.0`) passes all of them without any gate
being weakened. CI reference table for the day: `fd76786` → `38757754128` success;
`b5bafc8` → `38772271396` failure (2 jobs); `8be62a2` → `38774132358` success.

And at the evidence-only head that carries this file's earlier sections: `eaefadf` → run
`38781477556`, conclusion **success** (watch exit 0, 3,152 s): `rust`, `web`,
`desktop-smoke`, `schemas`, `security`, `platform-compile (windows-latest)`,
`platform-compile (macos-latest)` all `success`; `platform-bundles` `skipped`. No pack,
schema, data-model, provider, privacy, platform or release-gate behavior changed after
`8be62a2`, so no further CI-relevant surface was touched by the evidence commits.

## UI/UX round: issue #1 items I04 and I05 (I08 untouched)

The two CI heads after `8be62a2` were also watched, closing the chain that the
revert head started: `02f7df8` → run `38788822884` conclusion **success**, and
`e032e16` (the re-derived 24-box checklist) → run `38801290123` conclusion
**success** (watch exit 0, 3,107 s). Per job in both: `rust`, `web`,
`desktop-smoke`, `schemas`, `security`, `platform-compile (windows-latest)`,
`platform-compile (macos-latest)` `success`; `platform-bundles` `skipped`.
CI reference table for the day therefore reads: `fd76786` → `38757754128`
success; `b5bafc8` → `38772271396` failure (2 jobs); `8be62a2` → `38774132358`
success; `eaefadf` → `38781477556` success; `02f7df8` → `38788822884` success;
`e032e16` → `38801290123` success.

What the round itself changed, and the local gate before pushing:

- I04's engineering half (route-change focus to the destination `h1`; a no-pack
  Today that withholds the budget control, the zero-count summary and the empty
  paragraph; a mounted keyboard-only journey) — `A11Y-FLOW-001`, evidence in
  `state/evidence/A11Y-FLOW-2026-10-15/NOTES.md`.
- I05's engine half (cancel inside unpacking through a new
  `install_with_cancel` hook; byte-range resume of an interrupted download with
  sidecar-bound partials; free-space preflight and a named ENOSPC error) —
  `INSTALL-UX-001`, evidence in
  `state/evidence/INSTALL-UX-001/RESUME-CANCEL-PREFLIGHT-2026-10-15.md`.
- Local gates at this working state: `cargo fmt --all --check` clean;
  `cargo clippy -p lts-desktop -p lts-langpack --all-targets -- -D warnings`
  clean; `cargo test -p lts-desktop --lib packs::tests` 23 passed / 0 failed / 1
  ignored; `cargo test -p lts-langpack --test archive` 10 passed; all seven pack
  gates exit 0 on `languages/ja-JP` and `languages/ru-RU`;
  `pnpm fmt:check` / `pnpm lint` / `pnpm -r typecheck` clean and `pnpm -r test`
  at 27 files / 240 tests (desktop) plus 10 (packages/ui);
  `tools/validate_handoff.py` still `PASSED (1960 data files checked)` with only
  the two standing WARNs, also under `--require-explicit-ledger-records`;
  `tools/audit_learner_copy.py` 0 findings over 34 files.

Not closed by this round, and not closable by an agent: issue #1 items I04 (needs
the human Linux/Orca matrix — ACC-001, gate O-03), I05 (needs fresh-artifact
timing plus the `PERF-002` device tiers, i.e. publication), R12 (qualified band
review), R13 (ru listening/speaking practice) and I08 (owner gates D2/D3 plus
SEC-001, PLAT-001 Windows/macOS runtime, D12).

### Runs for the UI/UX round itself

`5d93fac` (the I04 + I05 slice) → run `38815458078`, conclusion **success**
(watch exit 0, 2,575 s): `rust`, `web`, `desktop-smoke`, `schemas`, `security`,
`platform-compile (windows-latest)`, `platform-compile (macos-latest)` all
`success`; `platform-bundles` `skipped` (manual trigger only).

`19a753c` (audit-worksheet notes describing what the keyboard slice changed
under the human AT run) → run `38820330303`, conclusion **success** (watch exit
0, 2,192 s), same per-job pattern.

The push carrying this line also carries `9187f0d`, which rewords two
partial-download errors so a full disk is named instead of surfacing an os error
string; its run is the gate for that copy change and is recorded in the Actions
log rather than here.
