#!/usr/bin/env bash
# BOOT-002 automated smoke test: build the native shell, launch it under a
# virtual X server, and require the home route to complete the IPC handshake.
# Proves: binary builds, window/webview starts, frontend bundle loads, React
# mounts the home route, and native<->web IPC works. Exits non-zero on failure.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/tauri-env.sh

echo "== build frontend + native binary (debug, no bundle) =="
pnpm --filter @openlang/desktop exec tauri build --debug --no-bundle

BIN="target/debug/lts-desktop"
if [ ! -x "$BIN" ]; then
  echo "FAIL: $BIN not found after build" >&2
  exit 1
fi

MARKER=$(mktemp -u /tmp/lts-smoke.XXXXXX)
trap 'rm -f "$MARKER"' EXIT

echo "== launch under Xvfb =="
# With webkit2gtk in the user-local sysroot, WebKitGTK still resolves helper
# processes from its compiled-in dir; scripts/setup-tauri-sysroot.sh patches
# that string to ~/.wk41, a symlink dir to the sysroot helpers.
STATUS=0
LTS_SMOKE_FILE="$MARKER" timeout 90 xvfb-run -a -s "-screen 0 1280x800x24" "./$BIN" || STATUS=$?

if [ ! -f "$MARKER" ]; then
  echo "FAIL: smoke marker not written (exit $STATUS)" >&2
  exit 1
fi
cat "$MARKER"
echo "SMOKE OK"
