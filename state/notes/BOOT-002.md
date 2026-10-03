# BOOT-002 — Tauri desktop shell and shared UI skeleton

## Delivered

- `apps/desktop/src-tauri`: Tauri 2.12.1 shell (`lts-desktop`), least-privilege
  `capabilities/default.json` (`core:default` only — no fs/shell/network from the web layer),
  strict CSP in `tauri.conf.json`, two validated native commands (`app_mode`, `smoke_ack`).
- Shared UI: `@openlang/ui` `AppShell` (landmarks + skip link; all labels caller-supplied),
  hosted by `apps/desktop` React app.
- Automated smoke: `scripts/smoke-desktop.sh` builds the native binary (`tauri build --debug
  --no-bundle`), launches under Xvfb, and requires the home route to complete the
  `app_mode -> smoke_ack` IPC handshake before exit 0. Proves launch + webview + bundle load +
  React mount + IPC.
- CI: `desktop-smoke` job (Ubuntu runner with system webkit2gtk) + rust job now installs Tauri
  system deps.
- Component tests: `packages/ui/src/AppShell.test.tsx` — landmarks present, caller labels only,
  no Japanese script in core components.

## Environment workaround (Linux reference machine, no sudo)

`webkit2gtk-4.1` is not installed system-wide. `scripts/setup-tauri-sysroot.sh` extracts the Arch
packages (+5 missing deps) into `~/.local/opt/tauri-sysroot`, patches .pc prefixes/libdirs, and
in-place patches WebKitGTK 2.52's compiled-in helper dir (`/usr/lib/webkit2gtk-4.1`, which ignores
`WEBKIT_EXEC_PATH`) to `~/.wk41` (symlinked helpers). `scripts/tauri-env.sh` exports
`PKG_CONFIG_PATH`/`LD_LIBRARY_PATH`. Owner note: installing `webkit2gtk-4.1` system-wide makes all
of this unnecessary; the scripts self-skip when the system package exists.

## Acceptance mapping

1. Desktop app launches and renders a keyboard-navigable shell: smoke run wrote
   `smoke-ok home-rendered` (see `state/evidence/BOOT-002/smoke-2026-10-02.txt`); shell landmarks
   tested.
2. No Japanese-specific hardcoding in core UI components: `AppShell` takes all strings as props;
   test asserts no Japanese script in rendered shell.
3. Automated smoke test covers launch/home route: `scripts/smoke-desktop.sh` + CI job.

## Evidence

- `state/evidence/BOOT-002/smoke-2026-10-02.txt` (SMOKE OK)
- `state/evidence/BOOT-002/ci-2026-10-02.txt` (full CI incl. 44 validator tests, exit 0)

## Validator test maintenance

`tools/test_validate_handoff.py::test_ready_task_requires_done_dependencies` hardcoded BOOT-002 as
a dep-incomplete example; completing BOOT-001 made that fixture stale. Retargeted to ADV-001
(depends on REL-001, incomplete until release). Validator behavior unchanged.

## Next

BOOT-003 (quality/lint/CI conventions).
