#!/usr/bin/env bash
# Reproduce the user-local webkit2gtk sysroot used on the Linux reference
# machine when system install (sudo) is unavailable. Idempotent.
set -euo pipefail
SYSROOT="$HOME/.local/opt/tauri-sysroot"
PKGS=(webkit2gtk-4.1 enchant harfbuzz-icu hyphen libmanette woff2)

if [ -f "$SYSROOT/usr/lib/pkgconfig/webkit2gtk-4.1.pc" ]; then
  echo "sysroot already present at $SYSROOT"
  exit 0
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
pacman -Sp "${PKGS[@]}" > urls.txt
xargs -n1 curl -sfO < urls.txt
mkdir -p "$SYSROOT"
for f in *.pkg.tar.zst; do
  bsdtar -xf "$f" -C "$SYSROOT"
done

# Point pkg-config prefixes/libdirs at the sysroot so the linker finds the libs.
for f in "$SYSROOT"/usr/lib/pkgconfig/*.pc; do
  sed -i -e "s|^prefix=/usr$|prefix=$SYSROOT/usr|" -e 's|^libdir=/usr/lib$|libdir=${exec_prefix}/lib|' "$f"
done

# WebKitGTK 2.52 resolves helper processes from the compiled-in
# /usr/lib/webkit2gtk-4.1 and ignores WEBKIT_EXEC_PATH. Patch that string in
# the sysroot library to a short home-dir path (same byte length) and expose
# the helpers there via symlinks.
WKDIR="$HOME/.wk41"
mkdir -p "$WKDIR"
for p in WebKitNetworkProcess WebKitWebProcess WebKitGPUProcess injected-bundle; do
  ln -sf "$SYSROOT/usr/lib/webkit2gtk-4.1/$p" "$WKDIR/$p"
done
SO=$(ls "$SYSROOT"/usr/lib/libwebkit2gtk-4.1.so.0.*)
python3 - "$SO" "$WKDIR" <<'PY'
import os, sys
lib, wk = sys.argv[1], sys.argv[2]
data = bytearray(open(lib, "rb").read())
old = b"/usr/lib/webkit2gtk-4.1\x00"
new = wk.encode() + b"\x00" * (len(old) - len(wk))
assert len(old) == len(new), "home path too long for in-place patch"
n = data.count(old)
data[:] = data.replace(old, new)
# The injected-bundle path is stored WITHOUT a NUL terminator, so the
# NUL-anchored replacement above misses it; the webview then fails to
# load its bundle. Patch that literal too (same byte length).
old2 = b"/usr/lib/webkit2gtk-4.1/injected-bundle/"
new2 = (wk + "/injected-bundle/").encode()
new2 += b"\x00" * (len(old2) - len(new2))
assert len(old2) == len(new2), "home path too long for bundle patch"
n2 = data.count(old2)
data[:] = data.replace(old2, new2)
print(f"patched {n} helper-dir + {n2} bundle-dir occurrence(s) in {lib}")
tmp = lib + ".tmp"
open(tmp, "wb").write(data)
os.replace(tmp, lib)
print(f"patched {n} helper-dir occurrence(s) in {lib}")
PY

echo "sysroot ready at $SYSROOT; source scripts/tauri-env.sh before building"
