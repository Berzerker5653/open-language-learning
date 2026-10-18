# SEC-001 — the Rust advisory gate fails closed (measured on GamingPC, 2026-10-17)

Execution host: GamingPC, this checkout's `Cargo.lock`. Toolchain: `cargo-audit` 0.22.2 and
`cargo` 1.97.1 (both `~/.cargo/bin`); the advisory database is fetched live over the network,
which is why the scan is 1.5–3 s and reproducible here. `state/notes/SEC-001-dependency-disposition.md`
is D8, the per-dependency disposition the owner accepted 2026-10-16; this file records the gate
change and the measurements behind `.cargo/audit.toml`.

## What changed

| place | before | after |
| --- | --- | --- |
| `.github/workflows/ci.yml`, security job ▸ `Rust advisory audit` | `cargo audit` | `cargo audit --deny warnings` |
| `scripts/ci.sh` security block | `cargo audit` | `cargo audit --deny warnings` |
| allow-list | none | `.cargo/audit.toml` at the repo root, six ids with per-dependency comments |

Flag spelling: cargo-audit 0.22.2 offers `-D, --deny <DENY>` and no `--deny-warnings`;
`cargo audit --deny-warnings` exits **2** with `error: unexpected argument '--deny-warnings' found`.

## Fail-closed proof

The printed summary is not the evidence; only the exit code is. Measured pairs:

| run | stdout/stderr | rc |
| --- | --- | --- |
| `.cargo/audit.toml` moved aside, `cargo audit --deny warnings` | `error: 6 denied warnings found!` | **1** |
| file restored, same command | `Scanning Cargo.lock for vulnerabilities (564 crate dependencies)` | **0** |
| same pair after the config-comment edits | `error: 6 denied warnings found!` / clean | **1** / **0** |
| plain `cargo audit`, config aside | `warning: 6 allowed warnings found` | 0 |
| plain `cargo audit`, config in place | `warning: 6 allowed warnings found` | 0 |

Those last two rows are the whole reason for the change: the previous CI step exited 0 in both
cases while printing the allowed-warning count, so the "green audit" badge asserted nothing about
whether the dependency scan had run. `--deny warnings` makes the six ignores the only thing
standing between a clean build and a failing one, and any new advisory flips the build.
`--severity critical,high --deny warnings` also exits 0 (no findings in those bands) — the ignored
set contains only the six categories below, so an advisory in those severities still fails.

## The six ignores, with chains from `cargo tree --workspace -i <crate>`
| advisory | crate | category | published | dependent chain | why it is not actionable |
| --- | --- | --- | --- | --- | --- |
| RUSTSEC-2024-0370 | `proc-macro-error 1.0.4` | unmaintained | 2024-09-01 | `← glib-macros 0.18.5 (proc-macro) ← glib 0.18.5 ← {atk, cairo-rs, gdk, gdk-pixbuf, gdkx11, gio, javascriptcore-rs, pango, soup3, webkit2gtk} ← gtk 0.18.2 ← muda 0.20.0 (← tauri 2.12.1), tao 0.37.1 (← tauri-runtime-wry 2.12.1), tauri 2.12.1, wry 0.57.0, webkit2gtk 2.0.2 ← lts-desktop` | build-time derive-macro code only; `glib-macros` is itself pinned by the GTK stack |
| RUSTSEC-2024-0449 | `unsafe-libyaml 0.2.11` | unmaintained | 2024-03-25 | `← serde_yaml 0.9.34+deprecated ← {lts-desktop, lts-langpack, lts-langpack-cli, lts-learner-model, lts-speech-api, lts-speech-runtime}` | the 0.9 line's vendored YAML reader; `cargo update -p serde_yaml --dry-run` and `-p unsafe-libyaml --dry-run` both print `Locking 0 packages`, so there is no newer release inside the same major to move to |
| RUSTSEC-2026-0370 | `zvariant 5.15.0` | unmaintained | 2026-10-16 | `← {zbus 5.19.0, zbus_macros 5.19.0, zbus_names 4.3.4} ← tauri-plugin-single-instance 2.5.2 ← lts-desktop` | the only version bump cargo offers for this crate (5.15.0 → 5.15.1) does **not** clear it — the re-scan after the bump still reports it |
| RUSTSEC-2026-0371 | `zbus_names 4.3.4` | unmaintained | 2026-10-16 | `← zbus 5.19.0 ← tauri-plugin-single-instance 2.5.2 ← lts-desktop` | `zbus` is pinned inside the plugin's own manifest (`[target.'cfg(target_os = "linux")'.dependencies.zbus] version = "5.9"`); `cargo update -p zbus --dry-run` → `Locking 0 packages` |
| RUSTSEC-2026-0372 | `zvariant_derive 5.15.0` | unmaintained | 2026-10-16 | `← zvariant 5.15.0 ← {zbus 5.19.0, zbus_macros 5.19.0, zbus_names 4.3.4} ← tauri-plugin-single-instance 2.5.2 ← lts-desktop` | proc-macro crate inside the same plugin-pinned subtree |
| RUSTSEC-2024-0429 | `glib 0.18.5` | unsound | 2024-03-30 | `← {atk, cairo-rs, gdk, gdk-pixbuf, gdkx11, gio, javascriptcore-rs, pango, soup3, webkit2gtk} ← gtk 0.18.2 ← muda 0.20.0 (← tauri 2.12.1), tao 0.37.1 (← tauri-runtime-wry 2.12.1), tauri 2.12.1, wry 0.57.0, webkit2gtk 2.0.2 ← lts-desktop` | advisory title: "Unsoundness in `Iterator` and `DoubleEndedIterator` impls for `glib::VariantStrIter`"; the raw scan prints **no patched-version line for any of the six**, and `cargo update -p glib --dry-run` → `Locking 0 packages` |

`cargo-audit` 0.22.2 accepts `-d/--db`, `--ignore` and `-D/--deny`, and has **no `--config` flag**
(measured from its `--help`), so the allow-list has to sit where the audit is launched. Both entry
points launch from the repository root — `scripts/ci.sh:4` cds to it, and the security job sets no
`working-directory`, so its default is `${{ github.workspace }}` — which is why one root-level file
serves CI and local runs instead of per-invocation `--ignore` flags.

## These five advisory crates are Linux-only (cross-target resolution)

`cargo tree --workspace -i <crate> --target <triple>` prints `warning: nothing to print.` for
`glib`, `zbus`, `zvariant`, `zbus_names` and `zvariant_derive` (and likewise for `gtk` and
`proc-macro-error`) under both `x86_64-pc-windows-msvc` and `aarch64-apple-darwin`, and resolves
them under `x86_64-unknown-linux-gnu`. Five of the six ignores are therefore absent from the
desktop app's Windows/macOS dependency graphs entirely; only `unsafe-libyaml` ships on every
platform.

## No bump clears any of them (measured, then reverted)

`cargo update -p <crate> --dry-run` reports `Locking 0 packages to latest compatible versions` for
`serde_yaml`, `unsafe-libyaml`, `proc-macro-error`, `zbus` and `glib`. The only two moves available
are `tauri-plugin-single-instance 2.5.2 → 2.5.4` and `zvariant 5.15.0 → 5.15.1`, so both were
applied for real and re-scanned:

- `cargo tree --workspace -i zbus_names` after the bump: `zbus_names v4.3.4 ← zbus v5.19.0 ←
  tauri-plugin-single-instance v2.5.4` — the chain is unchanged, and raw `cargo audit` with the
  config aside still ends `error: 6 denied warnings found!` with RUSTSEC-2026-0370 now printed
  against `zvariant 5.15.1`.
- `Cargo.lock` was restored from the pre-experiment copy and `git status --porcelain -- Cargo.lock`
  is empty in this commit: **no dependency was bumped**, because a bump here is churn, not
  hardening.

## Where the advisory code is actually reachable

- `grep -rn "VariantStrIter" crates apps --include=*.rs` → **no matches**. The advisory is in
  desktop C dependency code, not in ours: `array_iter_str` is defined at
  `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/glib-0.18.5/src/variant.rs:843`.
- `grep -rn "zbus\|zvariant" crates apps --include=*.rs` → **no matches**: no crate of ours links
  either. The D-Bus path is reachable nonetheless — `tauri-plugin-single-instance-2.5.2/src/platform_impl/linux.rs`
  uses `zbus::{blocking::Connection, interface, names::WellKnownName}`, `Builder::session()`,
  `zbus::Error::NameTaken`, and we register the plugin at `apps/desktop/src-tauri/src/lib.rs:7541`.
- `proc_macro_error` is used by `glib-macros-0.18.5/src/{boxed_derive,closure,derived_properties_attribute,enum_derive}.rs`.
  Scope limit, stated honestly: the upstream-reachability greps cover only the crates whose sources
  are vendored locally — `tauri-2.12.1`, `tao-0.37.1`, `wry-0.57.0`, `muda-0.20.0`,
  `webkit2gtk-2.0.2` (all zero hits for `VariantStrIter|array_iter_str|get_str_array`).
  `tauri-runtime-wry` is not on disk, so nothing is claimed about it.
- `unsafe-libyaml` is different: it is on the untrusted-input path. `serde_yaml::from_str` runs
  inside `parse_document` (`crates/langpack/src/pack.rs:1372`, parse at `:1376`) on pack YAML from
  installed third-party packs, and is called from 12 source/test files across the five library
  crates plus the Tauri host. That is why the ignore is recorded with the 2026-10-16 maintenance
  finding rather than as "unreachable".

## What this does not do

Ignoring an advisory is not fixing it: every one of the six still exists in the dependency graph,
and the ignore list is capped at these six ids precisely so that a seventh cannot arrive silently.
`SEC-001` stays **`blocked`** — the audit gate is only its dependency half; the platform parity and
privacy halves are untouched by this change, and D8's open items (the `zbus` family, which post-dates
that acceptance, plus the `serde_yaml` migration and the `glib` soundness watch) remain open.
