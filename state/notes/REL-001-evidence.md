# REL-001 — release-candidate evidence (mechanical gates) + owner checklist

Date: 2026-10-03. This note records only what automated tooling and the
agent could verify on the reference machine. The human gates below are
NOT certified here (AGENTS.md: qualified human review and calibrated
feature eligibility cannot be self-certified by an AI).

## Evidence binding

- Application commit: `0dd6ce49880de795b0070d434108ecd8c38ea424` (main)
- `pnpm-lock.yaml` sha256: `848cb591b4c523fc008ee97b0541d4a5d65f50825de46bfeda2c1be7e4797f78`
- `Cargo.lock` sha256: `3aef17a5ed5c19de596b6fcae00d9a4e1a57c252cb712be0474004478efb8e19`
- Bundles (built from the above commit, release profile):
  - deb 10.12 MiB sha256 `f066c2b5d903294ad845b235d1da2510953f970ba35c270835a2b961b13fa905`
  - AppImage 111.20 MiB sha256 `ddd3080ac24dcd375d4989788981d0aa2dff0b77df10d36c12657073de042a8b`
- Bundled packs: `eo-demo-0.1.0.lpk` sha256 `b8854f05…d6189d`,
  `ja-demo-0.1.0.lpk` sha256 `0a284b46…2edd71` (full values in
  `catalog/preview-entries.json`)
- Platform: Arch/CachyOS `7.2.8-1-cachyos` x86_64, X11, PipeWire;
  webkit2gtk-4.1 user-local sysroot (soname 0.21.10 ≈ 2.44.10) with
  GStreamer 1.28.7 plugins added for audio.
- Any substantive change invalidates this evidence; rerun the gates.
- Rebound 2026-10-03 after UX-003 (first lessons: new-item stream,
  runnable plan, MC runner; planner termination fix) — see
  `state/notes/FIRST-LESSON-2026-10-03.md`.

## Mechanical gates — PASS

1. Full test suite: `cargo test --workspace` 53 suites ok / 0 failures;
   vitest 28 passed; `pnpm typecheck` clean.
2. Packaging: `tauri build` produced both configured targets (deb,
   AppImage) from the release binary.
3. Release-artifact smoke: `LTS_SMOKE_FILE` handshake under Xvfb on
   `target/release/lts-desktop` → `smoke-ok home-rendered`, exit 0
   (binary starts, webview + frontend bundle load, React mounts, IPC
   works). The smoke hook is env-gated (`LTS_SMOKE_FILE`); it is inert
   in normal release runs.
4. Offline-first: with all outbound HTTP blackholed (proxy → closed
   port), profile creation, pack install, onboarding, and the
   Languages page work; the only networked component (catalog) fails
   honestly with a visible status.
5. End-to-end GUI journeys (this session, native binary): onboarding,
   pack install/switch, writing practice with evidence + hint support
   levels, microphone record → native pronunciation check (honest
   abstain), .lpk import (valid installs; corrupt rejected), catalog
   install wiring (honest 404 until releases are published); first
   lesson: fresh profile gets new-material items with word+gloss, MC
   answer records scored evidence + FSRS scheduler row, plan refresh
   rotates the item to weak-skill (see FIRST-LESSON note).
6. Perf (reference machine): debug cold start to mapped window ~280 ms;
   release workspace build 1 m 27 s (incremental).
7. Reflow: 800x600 at 200% text — no horizontal overflow on any route;
   native 1.75x system text scale reflows full-width.

## Owner-only gates — OPEN (cannot be self-certified)

1. Qualified human pedagogical/UI review (docs/15).
2. Calibration evidence for any scored speech/pronunciation claim
   (current build is guided-only and abstains; keep it that way until
   calibrated).
3. ja-JP pack licensing: EDRDG/JMdict attribution terms review before
   public redistribution; final application/original-content license
   choices.
4. Publishing decisions: GitHub release assets for the catalog
   (then set `LTS_PACK_CATALOG_URL`), signing key creation, update
   channel enrollment, store accounts, any public distribution.
5. Screen-reader matrix (NVDA/VoiceOver/Orca) and IME composition
   audit with a human AT user (docs/11).
