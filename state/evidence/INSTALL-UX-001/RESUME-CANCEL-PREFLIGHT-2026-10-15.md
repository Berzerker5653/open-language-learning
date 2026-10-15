# INSTALL-UX-001 — resume, cancel-inside-unpack, and the free-space preflight

Date: 2026-10-15. Tree: `e032e16` + this change set. Host: Gaming PC
(lab-main), all runs offline. This closes the two gaps the earlier slice
disclosed in its own notes (`state/evidence/INSTALL-UX-001/ENGINE-SLICE-2026-10-15.md`):
resume-as-continuation, and cancel *inside* unpacking.

## Cancel inside unpacking

`crates/langpack/src/archive.rs`

- `ArchiveError::Cancelled` added. Safe as an additive change: `grep -rn
  "ArchiveError::" crates apps` found no reference outside `archive.rs`, so no
  exhaustive `match` anywhere had to grow an arm.
- `install_with_cancel(bytes, store, cancelled)` is now the real install; `install`
  is a wrapper delegating with `&|| false`, so no caller had to change.
- The hook is consulted at the head of every extraction-loop iteration and once
  more immediately before any store mutation (`fs::create_dir_all` of the pack
  directory onward). Because extraction already lands in a staging tempdir
  inside the store and only `staging.keep()` is renamed, aborting drops the
  staging directory: no version directory, no `current` pointer moved.
- `apps/desktop/src-tauri/src/packs.rs::install_pack_bytes_report` passes its
  `cancelled` hook down and maps `ArchiveError::Cancelled` to the shared
  `CANCELLED` reason **and** the terminal `cancelled` stage, so the renderer's
  distinct cancelled state still comes from the engine, not a client guess.

Proven by:

- `crates/langpack/tests/archive.rs::a_cancelled_unpack_leaves_the_store_untouched`
  — cancels at the first entry and one entry in; asserts the error variant, that
  the hook was consulted per entry, that `current_version` is `None`, that the
  pack directory was never created, and that `walk(store)` is empty (no partial
  files left behind); then installs the same bytes successfully.
- `crates/langpack/tests/archive.rs::install_is_install_with_cancel_that_never_fires`
  — the wrapper is the old behavior.
- `packs::tests::cancelling_during_unpacking_leaves_no_pack_installed` — the
  stage stream is `verify, install, cancelled`, the hook counter proves the
  unpack itself was entered, and the store shows no pack and no version.

## Resume as continuation

`apps/desktop/src-tauri/src/packs.rs`

- A cancelled or failed transfer keeps its bytes in
  `<data>/partial-<key>.part` plus `<key>.part.meta`, where the key is
  `SHA-256(url ‖ sha256 ‖ size_bytes)` of the pinned entry — a re-pinned or moved
  artifact cannot inherit the old bytes.
- A retry sends `Range: bytes=<n>-` and appends **only** if the answer is `206`.
  A `200` (server ignored the range) truncates and restarts, so the file is never
  a duplicated splice. A `have == size_bytes` leftover is verified directly
  instead of re-requested, which also avoids the `416` dead end a full leftover
  would otherwise cause.
- Verification is not weakened anywhere: every hop still goes through
  `url_policy` / `ALLOWED_HOSTS` / `MAX_REDIRECT_HOPS`, the byte cap still
  aborts at `size_bytes`, and the finished file must match the pinned size and
  SHA-256 before `install_pack_bytes_report` and `pack.validate(Mode::Install)`
  see a byte of it. A size or digest mismatch deletes the partial, so a retry
  cannot inherit corrupt bytes.
- The partial is deleted once the install settles (success, or any failure other
  than a cancel), and `prune_partials` clears partials for artifacts the cached
  catalog no longer pins, so a replaced release asset does not eat the user's
  disk forever.
- Bug the test caught first: `open(append)` used `write(true).create(true)`
  without `append(true)`, so the resumed write overwrote the prefix from offset
  zero — length stayed at the prefix size and the digest would have rejected it,
  making resume silently impossible. With `append(true)` the resumed attempt
  produced the exact pinned bytes.

Proven by `packs::tests::an_interrupted_download_resumes_from_the_bytes_on_disk`
(cancel mid-transfer on a 400,000-byte pinned body → `installed_packs` empty and
no version → prefix kept and strictly smaller than the whole → second attempt
appends, progress counts the whole archive rather than the current attempt →
`finalize_partial` returns the exact pinned bytes);
`an_unidentifiable_partial_is_refused_and_cleared` (foreign sidecar, corrupt
sidecar, and an over-long part each yield `0` usable bytes and delete the file;
`prune_partials` removes a stale artifact's pair and keeps this entry's);
`a_retry_asks_for_the_missing_bytes_and_only_trusts_a_partial_answer`
(`range_header`, and `206`→append versus `200`/`404`/no-prefix→restart); and
`a_partial_on_disk_is_verified_before_anything_is_installed` (a complete
leftover installs through the same pack gate; right-length-wrong-bytes fails on
checksum; one byte short fails as incomplete; both refusals delete the file).

## Free space, stated before the download and named if it fills

- `estimated_install_bytes` = 3 × pinned archive size (archive + staging copy +
  installed copy), documented as a conservative expectation rather than a
  measurement, and used only to refuse an install that cannot finish.
- `free_bytes` asks `statvfs` under `#[cfg(unix)]` (new
  `[target.'cfg(unix)'.dependencies] libc`); on non-unix it answers `None` and
  the preflight is skipped rather than guessed, so the `platform-compile
  (windows-latest)` job keeps compiling.
- The refusal names the pack, the space expected and the space free; it reaches
  the learner verbatim through the install alert.
- A disk that fills *during* unpacking maps ENOSPC to "not enough space left on
  device to finish installing" instead of an opaque `io:` string.

## Copy and contract that had to change with it

The renderer previously withheld Cancel during unpacking and told the learner a
retry "downloads the whole pack again — a cancelled download does not continue
where it stopped." Both statements were true of the old engine and are false now,
so `apps/desktop/src/language.tsx` offers Cancel during `fetch`, `verify` and
`install` (not `record`, which runs after the store swap), and the cancelled-state
copy now says the retry continues where it stopped. `language.test.tsx` was
updated to pin the new contract instead of re-pinning the old wording.
`docs/07_TECHNICAL_ARCHITECTURE.md` (progress + cancel/retry sections) and
`docs/13_RELEASE_AND_DISTRIBUTION.md` (which said "no partial-byte resume") were
corrected in the same change.

## Measured

- `cargo test -p lts-desktop --lib packs::tests` → **23 passed / 0 failed / 1
  ignored** (the ignored test is the live pinned-catalog install, release
  evidence only).
- `cargo test -p lts-langpack --test archive` → **10 passed / 0 failed** with the
  two new cancel tests.
- `cargo fmt --all --check` clean; `cargo clippy -p lts-desktop -p lts-langpack
  --all-targets -- -D warnings` clean.
- `pnpm -r test` → `apps/desktop` **27 files / 240 tests passed**, `packages/ui`
  10 passed; `pnpm fmt:check`, `pnpm lint`, `pnpm -r typecheck` clean.
- Before/after proof for the resume test: with `append(true)` removed from
  `PartialDownload::open`, the resume test fails with
  `download incomplete: got 262144 of 400000 bytes`; with it, the resumed bytes
  are byte-identical to the pinned archive.

## Still open, and why an agent cannot close it

Issue #1 item I05's timing bullets stay unchecked: "fresh-artifact install timed
separately from resume and compile", "interrupted installs leave no false
Installed state" as observed in the shipped artifact, and "displayed
percentages/ETAs use real progress with modest-device budgets measured" need the
published artifact plus the device tiers `PERF-002` freezes — both owner-gated
(D2 publication, PERF-002 blocked). The pre-archived bundle question stays an
owner decision; nothing here builds toward a bundle format.
