# ADR 0004: Initial development stack and pinned versions

Status: Accepted
Date: 2026-10-02

## Context

BOOT-001 requires choosing the initial monorepo toolchain. `docs/07_TECHNICAL_ARCHITECTURE.md`
recommends React + TypeScript, Vite-class tooling, Tauri 2, Rust services, SQLite, pnpm-class
workspaces, and GitHub Actions CI, and instructs bootstrap to pin current stable versions rather
than versions written into the spec.

## Decision

Adopt the recommended stack. Versions verified on the Linux reference environment on 2026-10-02:

| Component | Version | Pin location |
| --- | --- | --- |
| OS reference | CachyOS (Arch-based), Linux 7.2.8, x86-64 | — |
| Node.js | 26.10.0 | `engines` in root `package.json` |
| pnpm | 12.8.1 | `packageManager` in root `package.json` |
| Rust | 1.97.1 (edition 2024, rust-version 1.85) | `rust-toolchain.toml`, workspace manifest |
| TypeScript | 7.0.2 | package devDependencies |
| Vite | 8.3.2 | `apps/desktop` devDependencies |
| @vitejs/plugin-react | 6.1.1 | `apps/desktop` devDependencies |
| React / React DOM | 19.3.0 | `apps/desktop` dependencies |
| Vitest | 5.0.3 | package devDependencies |
| Prettier | 3.9.9 | root devDependencies |
| Tauri (planned, BOOT-002) | 2.12.1 (`tauri`, `@tauri-apps/cli`, `@tauri-apps/api`) | to be pinned in `apps/desktop/src-tauri` |
| serde / serde_json / thiserror | 1.0.229 / 1.0.151 / 2.0.21 | `[workspace.dependencies]` |
| Python validator tooling | 3.14.7 runtime; deps pinned in `tools/requirements.txt` | `tools/requirements.txt` |

Lockfiles: `pnpm-lock.yaml` and `Cargo.lock` are committed. CI (`.github/workflows/ci.yml`)
enforces formatting, clippy, typecheck, unit tests, web build, and schema/handoff validation;
`scripts/ci.sh` mirrors it locally.

Workspace layout follows `docs/19_PROJECT_FILE_ARCHITECTURE.md`: `apps/desktop` (Vite React host;
Tauri shell arrives in BOOT-002), `packages/{shared,schemas,ui,learner-ui,scenario-ui}`, and
`crates/{domain,learner-model,scheduler,langpack,langpack-cli,storage,speech-api,speech-runtime,audio,security}`.
Internal TS packages are consumed as TypeScript sources via `exports` pointing at `src/`
(no pre-build step); Vite/Vitest/tsc all resolve them directly.

## Consequences

- One language (TypeScript) for UI, one (Rust) for native/domain services; no second runtime.
- Rust 1.97.1 is pinned via `rust-toolchain.toml`; rustup users get it automatically.
- TypeScript 7 (native port) is the current stable `tsc`; it typechecks this workspace cleanly.
  If a needed tooling ecosystem gap appears, downgrading to the last 5.x line is a recorded,
  reversible choice.
- Linux system packages required later for the Tauri native build (`webkit2gtk-4.1` and
  dependencies) are **not installed** on the reference machine and `sudo` is unavailable.
  This gates BOOT-002 native packaging only; the web UI path is unaffected.

## Alternatives considered

- **npm workspaces**: adequate, but the spec recommends pnpm-class tooling and pnpm gives strict
  dependency resolution and workspace linking without phantom dependencies.
- **Bun**: faster, but weaker Tauri ecosystem alignment and not the spec's recommendation.
- **Cargo-only UI (Leptos/Dioxus)**: rejected; the spec mandates a shared web-technology UI for
  cross-platform reuse including later mobile.
- **Pre-building `packages/*` to `dist/`**: adds a build-graph step for no benefit at this size;
  source-export packages work with all chosen tools.
