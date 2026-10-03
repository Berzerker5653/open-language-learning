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
exec "$BIN"
