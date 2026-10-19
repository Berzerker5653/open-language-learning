# RELEASE-EVIDENCE-001 — scripted release-artifact evidence pass (2026-10-19)

Agent-run scripted pass. The **owner's hands-on acceptance pass against
this artifact remains open** (O-03, `docs/21_HUMAN_REVIEW_RUNBOOKS.md` §B);
this file is not that acceptance.

## Provenance

- Commit: `7db96ccd2b04d5ca9dea9db38ab52cfdd02218b9` (main).
- Host: GamingPC — CachyOS, Linux 7.2.11-1-cachyos, x86_64.
- Toolchain: isolated `pnpm 12.8.1` (`~/.local/opt/pnpm-12.8.1`), tauri CLI
  from the pinned workspace deps; `source scripts/tauri-env.sh`.

## Artifacts

- `pnpm tauri build --bundles deb` at the repo root builds into the
  **workspace** target dir:
  `target/release/bundle/deb/open-language-learning-platform_0.4.0-alpha.1_amd64.deb`
  — pre-finalize 12,589,502 B sha256
  `a50c2e9ef5243f26de91d62c2abe366fe511ea99d0fb30528231b021962c1b50`.
- `./scripts/finalize-deb.sh <deb>` → `ok`, rewrites
  `Depends: libwebkit2gtk-4.1-0, libgtk-3-0` →
  `libwebkit2gtk-4.1-0, libgtk-3-0t64 | libgtk-3-0`;
  post-finalize 12,589,552 B sha256
  `656423e88ff5d28da8a62921b0c5331d44e7497d62ccb46ecae060f042c0a9d6`.
  (No `dpkg-deb` on this host; the control rewrite is what
  `scripts/test-finalize-deb.sh` pins, run in CI.)
- Release binary: `target/release/lts-desktop` 38,046,608 B sha256
  `98daa06f814a5d0a196b14535ae1980e6312d64281e6587a9dd1225f1769d18a`.
- Beware stale artifacts: `apps/desktop/src-tauri/target/**` still holds
  Oct-15 outputs (`3de3b3bb…` deb); the canonical 2026-10-19 artifacts are
  under the workspace `target/` because the tauri build emits there.

## Scripted smoke leg

`LTS_SMOKE_TIMEOUT=900 scripts/smoke-desktop.sh` → **SMOKE OK (13 routes
walked)**, exit 0, 228 s wall. Note the harness runs the **debug** build
(`scripts/smoke-desktop.sh:48,51`: `cargo build -p lts-desktop`,
`BIN="target/debug/lts-desktop"`), so it proves the current tree boots,
walks all routes and completes the scenario leg — the deb above is the
release build from the same commit; installing and walking the deb itself
is part of the owner's hands-on pass.

Recorded markers: `scenario-started:ja.scenario.first-meeting.greeting`
→ `advanced` → `scenario-support:…:consumed` →
`scenario-transfer:…:done`; `aligner:no:speech-model-off`;
`fresh-plan:5 first-run:3`; route timings Today 80 … Placement 83 ms;
warm command costs incl. `catalog_packs 48`, `scenario_list 24`,
`practice_plan 95`; return-visit Settings 80 ms.

## Same-tree closeout suite (for the record)

`cargo test --workspace --locked`: every `test result: ok`, exit 0;
`cargo fmt --all --check` clean; `cargo clippy -p lts-desktop --lib
--tests` clean; desktop vitest full suite exit 0; pack gates (validate /
lint / test for ja-JP and ru-RU, example-pack lint) 7/7 exit 0;
`tools/validate_handoff.py --require-explicit-ledger-records` PASSED
(1961 data files).
