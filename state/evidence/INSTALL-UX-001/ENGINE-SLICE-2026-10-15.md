# INSTALL-UX-001 — engine/UI install slice integrated (2026-10-15)

Executed as a remote job on **Hermes worker** (pnpm is only installed there);
the patch was reviewed, applied to the GamingPC working tree with `git apply`,
and **re-verified locally**. Remote output is evidence, not acceptance.

## What the slice changes

- `apps/desktop/src-tauri/src/progress.rs:55-60` — a new `engine-progress`
  event channel, emitted by pack install so the UI can show real progress.
- `apps/desktop/src-tauri/src/packs.rs:63` — the percent is **measured**: the
  download loop (`read_capped`, 64 KiB chunks) divides delivered bytes by the
  pinned `PackEntry.size_bytes`. The `verify` and unpack phases are announced
  as phases without a percentage instead of inventing one.
- `apps/desktop/src-tauri/src/lib.rs` — `INSTALL_CANCEL` registry and
  `cancel_pack_install(pack_id) -> bool` (481-493); cancellation is checked at
  chunk, redirect and phase boundaries, and the engine error string is
  `install cancelled`. Store consistency is structural rather than hopeful:
  `archive::install` unpacks into a staging tempdir and renames, so a cancelled
  install cannot leave a half-written pack.
- `apps/desktop/src-tauri/src/packs.rs` — `InstallReceipt {pack_id, version,
  source_url, source_host, sha256, size_bytes, capabilities}` returned inside
  `InstallResult {installed, receipt}`.
- `apps/desktop/src/language.tsx` — Cancel and Retry controls plus the receipt
  surface; `apps/desktop/src/progress.ts` and `language.test.tsx` carry the
  frontend half.

## Measured, on GamingPC

- `cargo test -q -p lts-desktop --lib -- packs::tests` → **17 passed; 0 failed;
  1 ignored**.
- Workspace suite and `cargo clippy --workspace --all-targets -- -D warnings`:
  recorded with the rest of the batch in `state/evidence/GATE-2026-10-15/`
  (clippy initially failed on `lib.rs:483` `unnecessary_map_or` from this patch;
  rewritten with `let Ok(..) = .. else` and now clean).
- Frontend type/lint checks: `npx tsc --noEmit` and `npx eslint src` clean;
  desktop `npx vitest run` 26 files / 239 tests.

## What is **not** implemented, stated plainly

1. **No resume-as-continuation.** A cancelled or failed install restarts from
   byte zero. The UI does not claim otherwise; the roadmap bullet says
   "cancel/retry/resume" and what ships is cancel + retry, with restart
   disclosed. Byte-range resume against the pinned GitHub assets is unproven
   work, not a flag.
2. **Cancel is not honoured *inside* unpacking.** The archive crate exposes no
   progress/callback hook, so cancellation takes effect between phases, not
   mid-extraction. The staging-tempdir + rename design means the pack store
   still ends up either complete or untouched.
3. **The pre-archived pack bundle is an open owner decision** — recorded as the
   "Pre-archived pack bundle — OPEN (owner decision)" subsection in
   `docs/13_RELEASE_AND_DISTRIBUTION.md`, not as an implemented feature.

## What the card still needs before it can be reviewed

- Owner decision on shipping packs pre-archived with the installer (bandwidth
  vs. install-time download), and on whether byte-range resume is worth its
  complexity.
- A human pass on the install UI itself (progress legibility, retry wording);
  the automated tests pin the payloads and state machine, not the experience.
