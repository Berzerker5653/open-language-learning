#!/usr/bin/env bash
# Local desktop bundle build attempt, recorded 2026-10-15.
# Runs in the clean worktree so the frontend deps come from a real
# `pnpm install --frozen-lockfile`, not a symlinked shared node_modules.
set -u
WT=/home/hunter/game-dev/LTS/tmp/wt-clean
MAIN=/home/hunter/game-dev/LTS
OUT=$MAIN/state/evidence/BUNDLE-LOCAL-2026-10-15
mkdir -p "$OUT"
export PATH=/home/hunter/.local/opt/pnpm-12.8.1:$PATH
export CARGO_TARGET_DIR=$MAIN/apps/desktop/src-tauri/target
cd "$WT" || exit 1

echo "### stage: web test (clean worktree)"
pnpm -r test 2>&1 | tail -40
echo "WEBTEST_EXIT=${PIPESTATUS[0]}"

echo "### stage: web build (clean worktree)"
pnpm -r build 2>&1 | tail -25
echo "WEBBUILD_EXIT=${PIPESTATUS[0]}"

source "$MAIN/scripts/tauri-env.sh"
echo "### pkg-config webkit2gtk-4.1: $(pkg-config --modversion webkit2gtk-4.1)"
cd "$WT/apps/desktop" || exit 1

echo "### stage: tauri build --no-bundle"
timeout 1500 pnpm tauri build --no-bundle 2>&1 | tail -25
echo "NOBUNDLE_EXIT=${PIPESTATUS[0]}"

echo "### stage: tauri build --bundles appimage"
timeout 1500 pnpm tauri build --bundles appimage 2>&1 | tail -30
echo "APPIMAGE_EXIT=${PIPESTATUS[0]}"

echo "### stage: tauri build --bundles deb"
timeout 900 pnpm tauri build --bundles deb 2>&1 | tail -30
echo "DEB_EXIT=${PIPESTATUS[0]}"

echo "### artifacts"
find "$CARGO_TARGET_DIR/release/bundle" -type f 2>/dev/null | while read -r f; do
  printf "%s  %s  %s\n" "$(stat -c%s "$f")" "$(sha256sum "$f" | cut -c1-64)" "$f"
done
ls -la "$CARGO_TARGET_DIR/release/open-language-learning-platform" 2>/dev/null
