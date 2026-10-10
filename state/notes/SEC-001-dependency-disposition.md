# SEC-001-dependency-disposition — cargo-audit warning dispositions (input to the owner security gate)

Recorded 2026-10-10 from the 2026-10-09 project-sweep audit. This note is
evidence for SEC-001, not a self-certification: the security review remains
owner work (AGENTS.md: AI cannot self-certify human gates). SEC-001 stays
open on the board.

Toolchain at scan: cargo-audit (installed), Rust 1.97.1 pinned (CI parity),
Cargo.lock at afbe550. Raw JSON:
`.project-sweep/runs/2026-10-09-deep/evidence/scanners/cargo-audit.json`.

## Result

`found: false, count: 0` — zero advisory vulnerabilities in the workspace
dependency graph. Two non-vulnerability warnings:

| id | package | class | disposition |
| --- | --- | --- | --- |
| RUSTSEC-2024-0429 | glib 0.18.5 | unsoundness in `VariantStrIter` `Iterator` impls (UB when iterating a malformed Variant) | not reachable from this workspace; pinned by the tauri stack |
| RUSTSEC-2024-0370 | proc-macro-error 1.0.4 (+ -attr) | unmaintained (maintainer unreachable) | build-time proc-macro dependency only; no runtime surface |

## glib 0.18.5 / RUSTSEC-2024-0429 — why "not reachable, cannot patch" is the honest state

- The advisory's affected surface is `glib::VariantStrIter` (iterating
  string arrays out of a GLib `Variant`). `grep -rn 'glib' crates/*/src
  apps/desktop/src-tauri/src` → 0 hits; `VariantStrIter` → 0 hits. No crate
  in this workspace names glib directly (Cargo.lock: one glib entry,
  0.18.5).
- Reverse tree (normal edges, `cargo tree -i glib@0.18.5 --workspace`):
  glib is pulled only by `atk/gtk 0.18.2` under `tauri 2.12.1`,
  `tao 0.37.1`, `webkit2gtk 2.0.2`, `muda 0.20.0` — i.e. GTK integration,
  Linux-only. Whether tauri internals construct a `VariantStrIter` was NOT
  verified upstream; treat residual exposure as upstream-owned.
- Not patchable inside our control: `cargo update -p glib --dry-run` locks
  0 packages — glib 0.18.5 is already the newest version the tauri 2.12 /
  gtk 0.18 stack accepts. The fixed glib line (0.19+) requires the tauri
  stack to move to gtk 0.20, which is a tauri release decision.
- Action: track tauri's stack bump at release-candidate time (REL-001 gate
  re-runs cargo-audit; if tauri has moved, the warning should disappear).

## proc-macro-error 1.0.4 / RUSTSEC-2024-0370 — why unmaintained is acceptable here

- `cargo tree -i proc-macro-error@1.0.4 -e normal --workspace` prints
  nothing (Linux target: only `(proc-macro)` build edges, via
  `glib-macros 0.18.5`). It executes only at compile time on the build
  machine, never in the shipped binary.
- Action: none; re-check at release gates. It disappears when the
  glib-macros chain moves to syn 2 only.

## Re-check command

`cargo audit --json` from repo root (the CI `security`-adjacent step is
not yet wired; adding machete/audit gating was recorded as backlog-only in
the sweep — owner decision).
