#!/usr/bin/env bash
# Open the local-first language learning preview (debug build).
# Double-clickable via the desktop entry; also runnable from a terminal.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/tauri-env.sh
# WebKitGTK 2.44+ defaults to the DMABUF/GBM renderer, which fails on
# software/virtual GPUs ("Failed to create GBM buffer ... Invalid argument")
# and leaves the window blank. Force the fallback renderer.
export WEBKIT_DISABLE_DMABUF_RENDERER=1
BIN="target/debug/lts-desktop"
if [ ! -x "$BIN" ]; then
  echo "First run: building the preview (a few minutes)... press Ctrl+C to cancel."
  pnpm --filter @openlang/desktop exec tauri build --debug --no-bundle
fi

# The debug build loads build.devUrl, so something has to be serving it or the
# window opens blank. Bring our own and take it down with us: an orphaned vite
# from an earlier run is how a preview ends up quietly serving yesterday's UI.
DEV_URL=$(python3 -c 'import json;print(json.load(open("apps/desktop/src-tauri/tauri.conf.json"))["build"]["devUrl"])')
VITE=""
if ! curl -sf -o /dev/null "$DEV_URL"; then
  (cd apps/desktop && exec ./node_modules/.bin/vite) >/tmp/lts-preview-vite.log 2>&1 &
  VITE=$!
  for _ in $(seq 1 40); do
    curl -sf -o /dev/null "$DEV_URL" && break
    sleep 0.5
  done
fi
cleanup() {
  if [ -n "$VITE" ]; then kill "$VITE" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

# Not `exec`: the trap above has to run, and it cannot if the app replaces us.
"$BIN"
