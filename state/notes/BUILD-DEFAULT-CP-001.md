# BUILD-DEFAULT-CP-001 — notes

Card: default custom-protocol feature so plain `cargo build --release -p lts-desktop`
embeds the UI (owner dogfood 2026-11-21: first screen was "Could not connect to
127.0.0.1:1420").

## Status block — CLEARED (chain landed 2026-11-21 09:3x)

Gate chain `lts-bdcp001b` finished: all cargo/frontend gates PASS; the first
launch spot-check failure was a harness artifact (single-instance plugin vs the
owner's still-open PRE-FIX `target/release/lts-desktop` dogfood instance, which
was showing the connection-error screen; closing it and re-running gave
routes-complete). Logs in `state/evidence/BUILD-DEFAULT-CP-001/`.

## Design (verified against pinned deps, tauri 2.12.1 / tauri-build 2.7.1 / CLI 2.12.1)

- tauri's build.rs: `dev = !custom_protocol` (feature is the single gate for
  codegen dev flag, `#[cfg(custom_protocol)]`, and `tauri::is_dev()`).
- tauri-build codegen → tauri-codegen `context.rs`: with embedding on and
  `frontendDist` directory missing, it **panics** ("`frontendDist` ... doesn't
  exist"). `apps/desktop/dist` is gitignored → every cargo invocation that
  compiles lts-desktop on a fresh checkout must opt out: `--no-default-features`.
- `tauri dev` keeps working with `default = ["custom-protocol"]`: the CLI's
  `dev_options` (crates/tauri-cli/src/interface/rust.rs) auto-passes
  `--no-default-features` and re-enables every default feature EXCEPT ones
  mapping to `tauri/custom-protocol`. Empirically confirmed against the pinned
  CLI binary (verbose dev log shows the flag; see gates evidence).
- lts-desktop is the ONLY workspace crate with `[features]`, so
  `--no-default-features` on workspace-wide cargo calls is a no-op for every
  other crate — CI rust jobs stay byte-identical to the pre-flip graph.

## Touched call sites

- apps/desktop/src-tauri/Cargo.toml — `default = ["custom-protocol"]`.
- .github/workflows/ci.yml — rust-static clippy + doctest, rust-test nextest:
  explicit `--no-default-features` with rationale. Default-ON compile stays
  genuinely gated by platform-compile (pnpm build → cargo check --all-targets)
  and desktop-smoke (embedded tauri build + walkthrough).
- scripts/ci.sh — same flags on clippy + test (local CI mirror).
- scripts/launch-preview.sh + scripts/smoke-desktop.sh — fallback (no-pnpm)
  branches pass `--no-default-features` to keep their documented devUrl
  behavior (those branches never build dist / rely on the vite they start).
