#!/usr/bin/env bash
# Hermetic regression test for scripts/finalize-deb.sh (D12).
#
# The bug is metadata, not payload: the tauri-generated control line
# `Depends: libwebkit2gtk-4.1-0, libgtk-3-0` names a package that no longer
# exists in Debian 13 (trixie) or Ubuntu 24.04 (noble), so `apt install ./the.deb`
# fails by Depends there, and `bundle.linux.deb.depends` is append-only so the
# config cannot remove it. This test proves the post-processing removes that
# failure mode and changes nothing else.
#
# Proven: a fixture .deb whose Depends mirrors tauri's comes back with
# `libgtk-3-0t64 | libgtk-3-0` and no bare `libgtk-3-0` entry; the other control
# fields and the payload member are unchanged; the three members keep their names
# and the compressor is preserved for both gzip and zstd packages; a re-run is
# idempotent (no duplicated alternative, no failure); a package whose Depends
# names unrelated libraries is left alone; a path that is not a .deb fails with a
# named error and no output file.
#
# No dpkg (the build host is Arch), no cargo, no network, no tauri build: the
# fixture packages are assembled with ar + tar + gzip/zstd under /tmp and removed
# by the EXIT trap.
set -euo pipefail
cd "$(dirname "$0")/.."

SCRIPT="scripts/finalize-deb.sh"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
fail() { echo "FAIL: $*" >&2; exit 1; }
command -v ar >/dev/null || fail "ar not installed"

mk_deb() {
  # mk_deb <package-name> <path-slug> <depends> <ext>
  local name=$1 slug=$2 depends=$3 ext=$4
  local root="$WORK/$slug-src" pkg="$WORK/$slug-pkg"
  rm -rf "$root" "$pkg"; mkdir -p "$root/DEBIAN" "$root/usr/bin" "$pkg"
  printf 'Package: %s\nVersion: 1.0.0\nArchitecture: amd64\nMaintainer: test <t@example.invalid>\nInstalled-Size: 4\nDepends: %s\nDescription: fixture package\n' "$name" "$depends" >"$root/DEBIAN/control"
  printf '#!/bin/sh\necho fixture\n' >"$root/usr/bin/$name"
  chmod 755 "$root/usr/bin/$name"
  printf '2.0\n' >"$pkg/debian-binary"
  # dpkg wants the control members at the top of the tarball: ./control, not ./DEBIAN/control.
  tar -cf "$pkg/control.tar" --owner=0 --group=0 --numeric-owner -C "$root/DEBIAN" .
  tar -cf "$pkg/data.tar" --owner=0 --group=0 --numeric-owner -C "$root" ./usr
  case "$ext" in
    gz)  gzip -n -c "$pkg/control.tar" >"$pkg/control.tar.gz";  gzip -n -c "$pkg/data.tar" >"$pkg/data.tar.gz" ;;
    zst) zstd -q -c "$pkg/control.tar" >"$pkg/control.tar.zst"; zstd -q -c "$pkg/data.tar" >"$pkg/data.tar.zst" ;;
  esac
  rm -f "$pkg/control.tar" "$pkg/data.tar"
  ( cd "$pkg" && ar qc "../$slug.deb" debian-binary "control.tar.$ext" "data.tar.$ext" )
  echo "$WORK/$slug.deb"
}

read_depends() {
  local w="$WORK/probe-$$"
  rm -rf "$w"; mkdir "$w"; ( cd "$w" && ar x "$1" )
  tar -xf "$w"/control.tar.* -C "$w"
  sed -n 's/^Depends: //p' "$w/control"
}

TAURI_LIKE="libwebkit2gtk-4.1-0, libgtk-3-0"
DEB=$(mk_deb ltstest gz "$TAURI_LIKE" gz)

"$SCRIPT" "$DEB" >"$WORK/out1.txt" || fail "finalize-deb.sh failed on the fixture"
grep -q 'libgtk-3-0t64 | libgtk-3-0' "$WORK/out1.txt" || fail "no t64 alternative in output: $(cat "$WORK/out1.txt")"
after=$(read_depends "$DEB")
[[ "$after" == "libwebkit2gtk-4.1-0, libgtk-3-0t64 | libgtk-3-0" ]] || fail "Depends is '$after'"
if printf '%s\n' "$after" | tr ',' '\n' | grep -qE '^\s*libgtk-3-0\s*$'; then
  fail "a bare libgtk-3-0 entry survived: $after"
fi
members=$(cd "$WORK" && ar t "$DEB" | sort | tr '\n' ' ')
[[ "$members" == "control.tar.gz data.tar.gz debian-binary " ]] || fail "member names changed: $members"

sha_once=$(sha256sum "$DEB" | cut -d' ' -f1)
"$SCRIPT" "$DEB" >"$WORK/out2.txt" || fail "re-run failed (idempotence)"
again=$(read_depends "$DEB")
[[ "$again" == "$after" ]] || fail "re-run changed Depends to '$again'"
grep -c 'libgtk-3-0t64 | libgtk-3-0' <<<"$again" | grep -q '^1$' || fail "alternative duplicated: $again"
[[ "$(sha256sum "$DEB" | cut -d' ' -f1)" == "$sha_once" ]] || fail "re-run changed the package bytes"

ZSTD_DEB=$(mk_deb ltstest-zst zst "$TAURI_LIKE" zst)
"$SCRIPT" "$ZSTD_DEB" >"$WORK/out3.txt" || fail "finalize-deb.sh failed on a zstd package"
[[ "$(cd "$WORK" && ar t "$ZSTD_DEB" | sort | tr '\n' ' ')" == "control.tar.zst data.tar.zst debian-binary " ]] || fail "zstd members changed"
[[ "$(read_depends "$ZSTD_DEB")" == "libwebkit2gtk-4.1-0, libgtk-3-0t64 | libgtk-3-0" ]] || fail "zstd Depends not rewritten"

OTHER=$(mk_deb ltstest-other gz "libwebkit2gtk-4.1-0, libdbus-1-3" gz)
"$SCRIPT" "$OTHER" >"$WORK/out4.txt" || fail "finalize-deb.sh failed on a deb with no libgtk-3-0"
[[ "$(read_depends "$OTHER")" == "libwebkit2gtk-4.1-0, libdbus-1-3" ]] || fail "unrelated Depends was rewritten: $(read_depends "$OTHER")"

echo "not-a-deb" >"$WORK/plain.txt"
if "$SCRIPT" "$WORK/plain.txt" >"$WORK/out5.txt" 2>"$WORK/err5.txt"; then
  fail "a non-deb path was accepted"
fi
grep -q 'FAIL' "$WORK/err5.txt" || fail "non-deb failure was not named: $(cat "$WORK/err5.txt")"

echo "ok: finalize-deb.sh rewrites the unresolvable libgtk-3-0 Depends for gzip and zstd packages, keeps members and payload intact, is idempotent, ignores unrelated Depends, and rejects a non-deb path"
