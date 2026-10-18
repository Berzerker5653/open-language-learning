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

## 2026-10-16 re-scan and owner acceptance (queue item D8)

`cargo audit` at `e18c9df` (Rust 1.97.1, 562 crate dependencies):
`warning: 4 allowed warnings found`, exit 0. The audit step is wired in CI
at `.github/workflows/ci.yml:230` and carries **no** allow-list file, so
warnings exit 0 by design — this note, not the exit code, is the record that
a human read them.

The owner accepted the three advisory-bearing warnings on 2026-10-16.

| id | package | class | disposition |
| --- | --- | --- | --- |
| RUSTSEC-2024-0429 | glib 0.18.5 | unsoundness (see above) | accepted; upstream-owned, unpatchable under tauri 2.12 / gtk 0.18 |
| RUSTSEC-2024-0370 | proc-macro-error 1.0.4 | unmaintained (see above) | accepted; compile-time only |
| RUSTSEC-2024-0449 | unsafe-libyaml 0.2.11 | unmaintained | accepted with the reachability note below |

### unsafe-libyaml 0.2.11 / RUSTSEC-2024-0449 — reachable, and still not a vulnerability

The 2026-10-10 note did not cover this one, and the honest reading is
**reachable**, unlike glib:

- `cargo tree -i unsafe-libyaml -e normal --workspace`: unsafe-libyaml 0.2.11
  has exactly one consumer, `serde_yaml 0.9.34+deprecated`, which is a normal
  (runtime) dependency of `lts-langpack`, `lts-langpack-cli`, `lts-learner-model`
  and `lts-desktop`.
- The live call path is `parse_document` (`crates/langpack/src/pack.rs:1372`),
  which parses **pack** documents, so a third-party pack's YAML does reach this
  parser. That is untrusted input by the security boundary in AGENTS.md.

- No advisory exists: the warning class is `unmaintained`, not a defect, and
  nothing in the RustSec database names a flaw in unsafe-libyaml. The crate is
  a thin unsafe wrapper around the libyaml parser, so "unmaintained" means no
  future fixes will land, not that a known fix is being withheld.
- No in-tree upgrade path: `cargo update -p unsafe-libyaml --dry-run` and
  `cargo update -p serde_yaml --dry-run` both report `Locking 0 packages` —
  0.2.11 and 0.9.34 are already the newest resolvable versions, and the
  `serde_yaml` line itself is published as `0.9.34+deprecated`.
- Mitigating structure: pack YAML is parsed into a `serde_yaml::Value`, then
  re-serialised through a JSON-compatibility gate before anything is read, and
  the pack is schema-validated under size caps before install.
- Residual risk: the wrapper we depend on is deprecated upstream, so this
  surface ages badly. Replacing `serde_yaml` (not just unsafe-libyaml) is a
  candidate card — **owner decision, no card opened**.

### zip 9.0.4 — the fourth warning: bump executed 2026-10-16

Not an advisory: `cargo audit` prints `Crate: zip, Version: 8.6.0,
Warning: yanked`. It was absent from the 2026-10-10 scan because the pin came
later, and it is a **direct** dependency — `Cargo.toml:33`
(`zip = { version = "8.6.0", default-features = false, features = ["deflate"] }`),
used by `lts-langpack` for `.lpk` read/write and by `lts-desktop` for pack
validation and export.

Measured 2026-10-16:

- crates.io lists the whole `8.x` line (`8.3.0`…`8.6.0`) and `9.0.0`–`9.0.3`
  as yanked; only **9.0.4**, published 2026-10-16, is installable. The
  upstream changelog (`zip-rs/zip2`) gives no reason for the yanks.
- `cargo update -p zip` refuses with "version 8.6.0 is yanked". The committed
  `Cargo.lock` still builds — a yanked version installs when it is pinned —
  but no lock regeneration can select it again, and 8.x gets no further fixes.
- Bump cost, measured 2026-10-16 and executed the same day: with `zip = "9.0.4"` the workspace
  compiles after **three one-line changes**, because `name()` now returns
  `Result<Cow<str>, ZipError>` (`crates/langpack/src/archive.rs:269`,
  `crates/langpack/tests/archive.rs:207`, `crates/langpack/tests/archive.rs:280`).
  `cargo check --workspace --all-targets` exit 0, `cargo test -p lts-langpack`
  green, and `cargo audit` then reports 3 allowed warnings.
- Release reproducibility: the same pack built with 8.6.0 and with 9.0.4 is
  **byte-identical** — example pack, 3976 B,
  sha256 `7938e5fba60e3ceffdf7e796c229b29f3ec57493a959dc35ac53a92ad9434bcc`
  either way — so the 0.4.1 pack digests survive a bump.
- Reachability of what 9.x fixed: 9.0.1/9.0.2/9.0.4 harden the crate's own
  extraction (symlink handling, two entries landing on one path, a separator
  inside one verbatim path component). Our install path never calls
  `ZipArchive::extract`; those guards are ours — `safe_rel`, the manifest
  allow-list, symlink rejection via `unix_mode`, `take(size + 1)` plus sha256
  verification, staging directory and rename
  (`crates/langpack/src/archive.rs:245-319`). Staying on 8.6.0 therefore
  leaves no known gap in this code; the cost of staying is reproducibility and
  future fixes only.

Status: **bump executed 2026-10-16** (queue item D8b, option b), immediately after the
0.4.1 packs were published — the publication-window deferral above is history.
`Cargo.toml:33` moved from `zip = "8.6.0"` to `zip = "9.0.4"`, and `cargo update -p zip`
relocked with no collateral: the only lock deltas are the zip entry (new deps `nix 0.31.3`
+ `cfg_aliases 0.2.2`, both pulled in by zip itself) and `tempfile`'s getrandom edge moving
from 0.3.4 to 0.4.3, a version already locked before the bump. The three `name()` changes
listed above are in the tree. `cargo check --workspace --all-targets` exit 0;
`cargo test -p lts-langpack` green; `cargo test --workspace` green. The example pack rebuilt
under 9.0.4 is byte-identical to the pre-bump build — 3976 B, sha256
`7938e5fba60e3ceffdf7e796c229b29f3ec57493a959dc35ac53a92ad9434bcc` — so the published 0.4.1
pack digests stand. `cargo audit` now prints `warning: 3 allowed warnings found`, exit 0:
the yanked-zip warning is gone, leaving only the three accepted warnings above. Until the
relock commit lands, the working tree — not 8.6.0 — is the reproducible state. Board rows:
`zip-bump-9`, owner gate **O-09**.

## 2026-10-17 addendum — the gate now fails closed, and the set is six

Two standing claims in this note are superseded; the reachability findings are not.

- **Superseded (the gate).** "CI runs it at `.github/workflows/ci.yml:230` with no allow-list file"
  is false as of 2026-10-17. CI (`.github/workflows/ci.yml`) and the local mirror
  (`scripts/ci.sh:134`) now run `cargo audit --deny warnings` against the allow-list
  `.cargo/audit.toml`. Measured pair: with that file moved aside the command exits **1**
  (`error: 6 denied warnings found!`); with it in place, **0**. A seventh advisory now fails the
  build instead of printing a warning.
- **Superseded (the count).** "3 allowed warnings" is stale. Three `unmaintained` advisories were
  published 2026-10-16 and appeared in the next scan: RUSTSEC-2026-0371 (`zbus_names 4.3.4`),
  RUSTSEC-2026-0370 (`zvariant`, 5.15.0 in `Cargo.lock`) and RUSTSEC-2026-0372
  (`zvariant_derive 5.15.0`). All three are reached through one edge only:
  `tauri-plugin-single-instance 2.5.2 → zbus 5.19.0`, and that plugin pins
  `zbus = "5.9"` in its own manifest, so `cargo update -p zbus --dry-run` reports
  `Locking 0 packages`. Under `x86_64-pc-windows-msvc` and `aarch64-apple-darwin` the whole
  `zbus`/`glib` subtree resolves to nothing (`cargo tree … --target …` →
  `warning: nothing to print.`), so these five ignores are Linux-only.
- **Not superseded.** `zvariant` is the same code path the 2026-10-16 acceptance already weighed:
  the plugin's Linux D-Bus single-instance check, reachable at startup
  (`apps/desktop/src-tauri/src/lib.rs:7541`), with no crate of ours linking `zbus`/`zvariant`
  (`grep -rn "zbus\|zvariant" crates apps --include=*.rs` → no matches). The unsafe-libyaml
  reachability finding above (untrusted pack YAML through `parse_document`,
  `crates/langpack/src/pack.rs:1372`) and the "no patched 0.18-series glib" position both stand.
- **This is not a fix.** All six entries are ignores, capped at six so a new advisory cannot slip
  in quietly. No dependency was bumped: the only two moves cargo offered
  (`tauri-plugin-single-instance` 2.5.2→2.5.4, `zvariant` 5.15.0→5.15.1) were applied for real and
  re-scanned, cleared none of the six, and `Cargo.lock` was restored. `SEC-001` remains `blocked`.

Per-dependency rationale now sits beside each entry in `.cargo/audit.toml`. Full measurements —
chains, cross-target resolution, `cargo update --dry-run` ceilings, the rc pairs and the
reachability greps — are in `state/evidence/SEC-001/cargo-audit-posture.md`.

## Re-check command

```bash
cargo audit --deny warnings        # allow-list: .cargo/audit.toml, run from the repo root
```

Trust the exit code, not the summary: plain `cargo audit` prints
`warning: 6 allowed warnings found` and exits 0 whether or not the allow-list is present, so the
printed count proves only that the scan ran.
