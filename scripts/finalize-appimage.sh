#!/usr/bin/env bash
# K-59-follow: make the AppImage portable by dropping the bundled WebKit.
#
# Why: linuxdeploy collects every NEEDED library the binary links, which
# includes the tauri-sysroot libwebkit2gtk/libjavascriptcoregtk. WebKitGTK
# bakes its helper-process dir (WebKitWebProcess, WebKitNetworkProcess,
# injected-bundle) into the .so at compile time — on the build machine
# that is a $HOME path (e.g. ~/.wk41) — so a bundled copy cannot find its
# other machine and the app SIGABRTs at webview spawn. AppImages mount at
# / but can never provide a private /home path. The deb does not have
# this problem: it declares system libraries as package dependencies.
#
# The fix mirrors the deb: the AppImage uses the TARGET's system
# webkit2gtk-4.1 (the documented Tauri runtime dependency). We drop those
# two libraries from the AppDir and repack with linuxdeploy, excluding
# them so the dependency scan cannot re-add them.
#
# Usage: scripts/finalize-appimage.sh [AppDir]   (default: the pack-bundle
# variant's AppDir under target/release/bundle/appimage)
set -euo pipefail
cd "$(dirname "$0")/.."

APPDIR="${1:-}"
if [[ -z "$APPDIR" ]]; then
  APPDIR=$(find target/release/bundle/appimage -maxdepth 1 -name '*.AppDir' | head -1)
fi
[[ -d "$APPDIR" ]] || { echo "FAIL: no AppDir at '$APPDIR' (run the tauri bundle build first)" >&2; exit 1; }

LINUXDEPLOY=$(ls "$HOME"/.cache/tauri/linuxdeploy-*-x86_64.AppImage 2>/dev/null | head -1)
[[ -n "$LINUXDEPLOY" ]] || { echo "FAIL: linuxdeploy not found under ~/.cache/tauri (a tauri linux bundle build downloads it)" >&2; exit 1; }

EXCLUDES=(libwebkit2gtk-4.1.so.0 libjavascriptcoregtk-4.1.so.0)
args=()
for lib in "${EXCLUDES[@]}"; do
  args+=(--exclude-library "$lib")
  find "$APPDIR" -name "${lib}*" -delete
done
# Leftover symlinks/dupes anywhere in the AppDir:
find "$APPDIR" \( -name 'libwebkit2gtk-4.1.so*' -o -name 'libjavascriptcoregtk-4.1.so*' \) -delete

# linuxdeploy refuses to run when the desktop file or AppRun is missing;
# the tauri bundle leaves both in place, so no --create flags here.
out_dir=$(cd "$(dirname "$APPDIR")" && pwd)
TMPLOG=$(mktemp)
( cd "$out_dir" && LINUXDEPLOY_PLUGIN_PATH="$HOME/.cache/tauri" \
    "$LINUXDEPLOY" --appimage-extract-and-run \
    --appdir "$(basename "$APPDIR")" "${args[@]}" --output appimage ) >"$TMPLOG" 2>&1 \
  || { echo "FAIL: linuxdeploy repack failed:" >&2; cat "$TMPLOG" >&2; exit 1; }
rm -f "$TMPLOG"

# linuxdeploy names output <binary>-x86_64.AppImage; restore the tauri
# naming convention so downstream paths (docs, CI artifacts) are stable.
rebuilt="$out_dir/$(basename "$APPDIR" .AppDir)-x86_64.AppImage"
[[ -f "$rebuilt" ]] || { echo "FAIL: expected $rebuilt after repack" >&2; exit 1; }

for lib in "${EXCLUDES[@]}"; do
  if find "$APPDIR" -name "${lib}*" | grep -q .; then
    echo "FAIL: $lib is still present in $APPDIR after repack" >&2
    exit 1
  fi
done

target_name=$(basename "$rebuilt")
# Keep the tauri artifact name if that AppImage existed before the repack
# (real builds); fixture/first runs keep linuxdeploy's own name.
existing=$(ls "$out_dir"/*.AppImage 2>/dev/null | grep -v -- '-x86_64.AppImage$' | head -1 || true)
if [[ -n "$existing" ]]; then
  mv -f "$rebuilt" "$existing"
  target_name=$(basename "$existing")
fi
echo "ok: $target_name repacked without bundled WebKit ($(du -h "$out_dir/$target_name" | cut -f1)); the AppImage now requires the target system's webkit2gtk-4.1, exactly like the deb does"
