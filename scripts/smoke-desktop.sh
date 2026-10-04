#!/usr/bin/env bash
# BOOT-002 automated smoke test: build the native shell, launch it under a
# virtual X server, and require the launch handshake plus the POLISH-001
# full-route walkthrough (every route nav button clicked, each acked from
# the UI). Proves: binary builds, window/webview starts, frontend bundle
# loads, onboarding IPC completes, React mounts every route, and
# native<->web IPC works. Exits non-zero on failure.
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
DATA=$(mktemp -d /tmp/lts-smoke-data.XXXXXX)
trap 'rm -f "$MARKER"; rm -rf "$DATA"' EXIT

echo "== launch under Xvfb =="
# With webkit2gtk in the user-local sysroot, WebKitGTK still resolves helper
# processes from its compiled-in dir; scripts/setup-tauri-sysroot.sh patches
# that string to ~/.wk41, a symlink dir to the sysroot helpers.
# LTS_DATA_DIR keeps the walkthrough's profile/pack install out of the
# developer's real data directory.
STATUS=0
LTS_DATA_DIR="$DATA" LTS_SMOKE_FILE="$MARKER" timeout 90 xvfb-run -a -s "-screen 0 1280x800x24" "./$BIN" || STATUS=$?

if [ ! -f "$MARKER" ]; then
  echo "FAIL: smoke marker not written (exit $STATUS)" >&2
  exit 1
fi
cat "$MARKER"
if grep -q 'walkthrough-error' "$MARKER"; then
  echo "FAIL: walkthrough reported an error" >&2
  exit 1
fi
if ! grep -q 'routes-complete' "$MARKER"; then
  echo "FAIL: walkthrough never completed (exit $STATUS)" >&2
  exit 1
fi
NROUTES=$(grep -c '^smoke-ok route:' "$MARKER")
if [ "$NROUTES" -lt 11 ]; then
  echo "FAIL: only $NROUTES route acks; expected at least 11" >&2
  exit 1
fi
echo "SMOKE OK ($NROUTES routes walked)"
