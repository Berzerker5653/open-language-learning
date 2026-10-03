# BOOT-001 — Initialize monorepo and toolchains

## Goal

Workspace layout, pinned toolchains, CI gates, and ADR so a clean checkout installs/builds on the
Linux reference environment (CachyOS, x86-64).

## Decisions

- Stack per docs/07 recommendation; versions verified 2026-10-02 and recorded in
  `docs/adr/0004-initial-stack.md`.
- pnpm workspace (`apps/*`, `packages/*`) + Cargo workspace (`crates/*`).
- Internal TS packages consumed as source via `exports` -> `src/` (no pre-build graph).
- TypeScript 7.0.2 (current stable native `tsc`) typechecks the workspace cleanly; fallback to
  5.x line is recorded in the ADR if ecosystem gaps appear.
- `scripts/ci.sh` mirrors `.github/workflows/ci.yml` for local/reproducible runs.
- Prettier excludes all provenance-tracked handoff data (see `.prettierignore`); never reformat
  files listed in `SHA256SUMS.txt`.

## Layout created

- `apps/desktop`: Vite 8 + React 19 host (Tauri shell itself is BOOT-002).
- `packages/{shared,schemas,ui,learner-ui,scenario-ui}`.
- `crates/{domain,learner-model,scheduler,langpack,langpack-cli,storage,speech-api,speech-runtime,audio,security}`
  with placeholder tests; real types land in ARCH-001.

## Environment blocker noted for BOOT-002

`webkit2gtk-4.1` (and `webkitgtk-6.0`) are NOT installed on this machine and `sudo` requires a
password. Tauri native Linux builds will fail to link until the package is installed. Web UI path
is unaffected. Owner action needed: `sudo pacman -S webkit2gtk-4.1` (plus Tauri sys deps:
`librsvg`, `openssl`, `glib`, etc. mostly present).

## Evidence

- `state/evidence/BOOT-001/ci-2026-10-02.txt`: full `./scripts/ci.sh` run — rust fmt/clippy/test,
  pnpm fmt/typecheck/test/build, handoff schema validation + 44 validator tests. Exit 0.
- Acceptance mapping:
  1. Clean install/build commands documented in `CONTRIBUTING.md`; executed in evidence log.
  2. Lockfiles committed: `pnpm-lock.yaml`, `Cargo.lock`; workspace layout per docs/19.
  3. CI executes formatting, typecheck, unit tests, schema checks (workflow + local mirror).
  4. ADR-0004 records final stack and current stable versions.

## Next

ARCH-001 (domain IDs/versions/provider interfaces) — read docs/03, 04, 05, 07, 08.
