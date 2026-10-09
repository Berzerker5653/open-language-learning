#!/usr/bin/env bash
# K-59-follow regression: finalize-appimage must remove the bundled WebKit
# from an AppDir whose binary *depends on it*, and the repack must not
# re-add it. This pins the exact failure that killed the first AppImage
# run on any foreign machine (WebKitGTK helpers live at a compile-time
# absolute path the target cannot have).
set -uo pipefail
cd "$(dirname "$0")/.."

LINUXDEPLOY=$(ls "$HOME"/.cache/tauri/linuxdeploy-*-x86_64.AppImage 2>/dev/null | head -1)
command -v gcc >/dev/null || { echo "SKIP test-finalize-appimage: no gcc"; exit 0; }
[[ -n "$LINUXDEPLOY" ]] || { echo "SKIP test-finalize-appimage: no linuxdeploy in ~/.cache/tauri"; exit 0; }
WK=$(ls "$HOME"/.local/opt/tauri-sysroot/usr/lib/libwebkit2gtk-4.1.so.0 2>/dev/null)
JC=$(ls "$HOME"/.local/opt/tauri-sysroot/usr/lib/libjavascriptcoregtk-4.1.so.0 2>/dev/null)
[[ -n "$WK" && -n "$JC" ]] || { echo "SKIP test-finalize-appimage: no sysroot webkit to link against"; exit 0; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
APPDIR="$WORK/finfixture.AppDir"
mkdir -p "$APPDIR/usr/bin" "$APPDIR/usr/lib"

# A binary that genuinely NEEDs the sysroot WebKit, like lts-desktop does.
cat > "$WORK/mini.c" <<'EOF'
int main(void){return 0;}
EOF
gcc "$WORK/mini.c" -o "$APPDIR/usr/bin/mini" \
  -L "$HOME/.local/opt/tauri-sysroot/usr/lib" \
  -Wl,-rpath-link,"$HOME/.local/opt/tauri-sysroot/usr/lib" \
  -Wl,--allow-shlib-undefined \
  -l:libwebkit2gtk-4.1.so.0 || { echo "FAIL: fixture build"; exit 1; }

# Mimic the tauri AppDir: linuxdeploy already copied the libs in.
cp "$WK" "$JC" "$APPDIR/usr/lib/"

# linuxdeploy + appimagetool demand a desktop file with Categories and a
# matching icon; tauri ships both, so the fixture carries the minimum.
mkdir -p "$APPDIR/usr/share/icons/hicolor/scalable/apps"
printf '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"/>' \
  > "$APPDIR/usr/share/icons/hicolor/scalable/apps/finfixture.svg"
cat > "$APPDIR/finfixture.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=finfixture
Exec=mini
Terminal=false
Icon=finfixture
Categories=Utility;
EOF
cp "$APPDIR/usr/share/icons/hicolor/scalable/apps/finfixture.svg" "$APPDIR/finfixture.svg"

./scripts/finalize-appimage.sh "$APPDIR" > "$WORK/out.log" 2>&1
rc=$?
[[ $rc -eq 0 ]] || { echo "FAIL: finalize exited $rc"; sed -n '1,20p' "$WORK/out.log"; exit 1; }

left=$(find "$APPDIR" \( -name 'libwebkit2gtk*' -o -name 'libjavascriptcoregtk*' \) | wc -l)
[[ "$left" -eq 0 ]] || { echo "FAIL: webkit libraries survived the finalize"; find "$APPDIR" -name 'libwebkit*' -o -name 'libjavascriptcore*'; exit 1; }

ls "$APPDIR"/../*.AppImage "$WORK"/*.AppImage >/dev/null 2>&1 || {
  echo "FAIL: no repacked AppImage produced"; exit 1; }

grep -qi "repacked without bundled WebKit" "$WORK/out.log" || {
  echo "FAIL: success line missing"; cat "$WORK/out.log"; exit 1; }

echo ok
