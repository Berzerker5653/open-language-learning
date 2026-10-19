# RELEASE-EVIDENCE-001 — scripted release-artifact evidence pass (2026-10-19)

Agent-run scripted pass. The **owner's hands-on acceptance pass against
this artifact remains open** (O-03, `docs/21_HUMAN_REVIEW_RUNBOOKS.md` §B);
this file is not that acceptance.

## Provenance (final pass)

- Commit: `8b3ec61a6cc4e49b7a1cda0dadc37cb36c02b5ab` (main).
- Host: GamingPC — CachyOS, Linux 7.2.11-1-cachyos, x86_64.
- Toolchain: isolated `pnpm 12.8.1` (`~/.local/opt/pnpm-12.8.1`), tauri CLI
  from the pinned workspace deps; `source scripts/tauri-env.sh`.

## Artifacts (final pass)

- `pnpm tauri build --bundles deb` at the repo root builds into the
  **workspace** target dir:
  `target/release/bundle/deb/open-language-learning-platform_0.4.0-alpha.1_amd64.deb`
  — pre-finalize sha256 `3c67d6b47c2cb901a5230cb03370517cffefff4a1433e9c17b07b80391e7cc49`.
- `./scripts/finalize-deb.sh <deb>` → `ok`, rewrites
  `Depends: libwebkit2gtk-4.1-0, libgtk-3-0` →
  `libwebkit2gtk-4.1-0, libgtk-3-0t64 | libgtk-3-0`;
  post-finalize **12,591,738 B** sha256
  **`a41cf0e0777865aa35423bc2211fddcceba03529a8b88670cabf8d05fe7b5bd1`**.
  (No `dpkg-deb` on this host; the control rewrite is what
  `scripts/test-finalize-deb.sh` pins, run in CI.)
- Release binary: `target/release/lts-desktop` sha256
  `4260fb7f4ec6d88281da528f4d381e49ccdbea00f0517abfe8d1a436d732aed1`.

## Scripted smoke leg

`LTS_SMOKE_TIMEOUT=900 scripts/smoke-desktop.sh` → **SMOKE OK (13 routes
walked)**, exit 0, 149 s wall. The harness runs the **debug** build
(`scripts/smoke-desktop.sh:48,51`), so it proves the current tree boots,
walks all routes and completes the scenario leg; the deb above is the
release build from the same commit — installing and walking the deb itself
is part of the owner's hands-on pass.

Recorded markers: `scenario-started:ja.scenario.first-meeting.greeting`
→ `advanced` → `scenario-support:…:consumed` →
`scenario-transfer:…:done` (the U07 support rung and the U08 transfer
outcome exercised live); `aligner:no:speech-model-off`;
`fresh-plan:5 first-run:3`.

Two smoke-environment traps hit during this pass, both operator-state, not
code: a leftover vite holding `127.0.0.1:1420` (the script's own guard
names it) and a stray debug `lts-desktop` (the single-instance plugin
made the harness exit 0 with no marker). After killing both, the pass was
green.

## Superseded earlier passes (same day)

- `7db96cc`: deb built/finalized (12,589,552 B sha `656423e8…`) and smoke
  OK — but that binary carried the pre-ADR-0038 validator, which refused
  to install the published 0.4.2 catalog packs. Superseded; do not use.
- `b2fc334`: full suite + deb (`a7babe04…` pre-finalize) + smoke OK —
  superseded by the rustdoc-lint fix commit (`8b3ec61`) rebuilt above.
- Stale Oct-15 outputs under `apps/desktop/src-tauri/target/**`
  (`3de3b3bb…` deb) are **not** this pass's artifacts; canonical output
  lives in the workspace `target/`.

## Same-tree closeout suite (commit 8b3ec61, for the record)

`cargo test --workspace`: every `test result: ok`;
`cargo fmt --all --check` clean;
`cargo clippy --workspace --all-targets -- -D warnings` clean;
desktop vitest full suite green; pack gates (validate / lint / **test** =
install-mode for ja-JP and ru-RU, example-pack lint) 7/7 exit 0, 0 errors
0 warnings; `tools/validate_handoff.py --require-explicit-ledger-records`
PASSED (1961 data files); validator unittests 37 OK.
