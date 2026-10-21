#!/usr/bin/env bash
# D12: make the generated .deb installable on current LTS distros.
#
# Why: tauri-cli writes `Depends: libwebkit2gtk-4.1-0, libgtk-3-0` from the build
# host's package names, and `libgtk-3-0` stopped being a package name in Debian 13
# (trixie) and Ubuntu 24.04 (noble) — the runtime there is `libgtk-3-0t64`. So
# `apt install ./lts-desktop_*.deb` fails by metadata there even though the
# shipped binary needs nothing that is missing. `bundle.linux.deb.depends` cannot
# fix it: measured append-only, the auto-detected `libgtk-3-0` stays in the list.
# This post-processes the control file the way `scripts/finalize-appimage.sh`
# post-processes the AppImage.
#
# The rule: a dependency named exactly `libgtk-3-0` becomes
# `libgtk-3-0t64 | libgtk-3-0`, satisfiable on 22.04/bookworm (the old name
# exists) and on 24.04/trixie (the t64 name exists). Everything else in the
# control file and the payload member is carried over unchanged.
#
# No dpkg on the build host (this is Arch): a .deb is an `ar` archive of
# `debian-binary`, `control.tar.<ext>` and `data.tar.<ext>`, so the rewrite is
# ar + tar + the matching compressor, with the original member names preserved.
#
# Usage: scripts/finalize-deb.sh [path/to/package.deb]
#        (default: the single .deb under target/release/bundle/deb)
# Prints the resulting Depends line plus the new sha256 and size.
set -euo pipefail
cd "$(dirname "$0")/.."

deb="${1:-}"
if [[ -z "$deb" ]]; then
  mapfile -t debs < <(find target/release/bundle/deb -maxdepth 2 -name '*.deb' | sort)
  [[ ${#debs[@]} -eq 1 ]] || { echo "FAIL: expected exactly one .deb under target/release/bundle/deb, found ${#debs[@]}" >&2; exit 1; }
  deb="${debs[0]}"
fi
[[ -f "$deb" ]] || { echo "FAIL: no .deb at '$deb' (run the tauri deb bundle build first)" >&2; exit 1; }
deb=$(realpath "$deb")

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir "$work/orig" "$work/new" "$work/check"
if [[ "$(head -c 8 "$deb")" != '!<arch>' ]]; then
  echo "FAIL: '$deb' is not an ar archive, so it cannot be a .deb" >&2
  exit 1
fi
( cd "$work/orig" && ar x "$deb" )
[[ -f "$work/orig/debian-binary" ]] || { echo "FAIL: '$deb' is not a .deb (no debian-binary member)" >&2; exit 1; }
ctrl=$(ls "$work"/orig/control.tar.* 2>/dev/null | head -1)
data=$(ls "$work"/orig/data.tar.* 2>/dev/null | head -1)
[[ -n "$ctrl" && -n "$data" ]] || { echo "FAIL: '$deb' is missing a control or data member" >&2; exit 1; }
ext=${ctrl##*control.tar.}
[[ "$data" == *"data.tar.$ext" ]] || { echo "FAIL: control uses '$ext' but data does not; refusing to mix compressors" >&2; exit 1; }
case "$ext" in
  gz)  pack() { gzip -n -c "$1" > "$2"; } ;;
  xz)  pack() { xz -c "$1" > "$2"; } ;;
  zst) pack() { zstd -q -c "$1" > "$2"; } ;;
  *) echo "FAIL: unsupported member compression '$ext'" >&2; exit 1 ;;
esac

mkdir "$work/orig/ctrl"
tar -xf "$ctrl" -C "$work/orig/ctrl"
[[ -f "$work/orig/ctrl/control" ]] || { echo "FAIL: no control file inside $(basename "$ctrl")" >&2; exit 1; }
before=$(sed -n 's/^Depends: //p' "$work/orig/ctrl/control")
had_bare=$(printf '%s\n' "$before" | tr ',' '\n' | grep -cE '^[[:space:]]*libgtk-3-0[[:space:]]*$' || true)
[[ -n "$before" ]] || { echo "FAIL: '$deb' declares no Depends" >&2; exit 1; }

python3 - "$work/orig/ctrl/control" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path).read()
def fix(m):
    parts = [p.strip() for p in m.group(2).split(",") if p.strip()]
    out = []
    for p in parts:
        name = re.match(r"^[A-Za-z0-9.+-]+", p).group(0)
        if name == "libgtk-3-0" and "libgtk-3-0t64" not in p:
            out.append("libgtk-3-0t64 | libgtk-3-0")
        else:
            out.append(p)
    return "%s: %s" % (m.group(1), ", ".join(out))
new, n = re.subn(r"(?m)^(Depends):\s*(.+)$", fix, text)
if n != 1:
    sys.exit("FAIL: expected exactly one Depends field, patched %d" % n)
open(path, "w").write(new)
PY

# dpkg expects `./control`-style members owned by root, whatever the build uid is.
# --mtime/--sort make the repack byte-deterministic: re-finalizing must not drift the digest.
tar -cf "$work/control.tar" --owner=0 --group=0 --numeric-owner --mtime=@0 --sort=name -C "$work/orig/ctrl" .
pack "$work/control.tar" "$work/new/control.tar.$ext"
cp "$work/orig/debian-binary" "$work/new/debian-binary"
cp "$data" "$work/new/$(basename "$data")"
( cd "$work/new" && ar qc ../package.deb debian-binary "control.tar.$ext" "$(basename "$data")" )

# Re-read the rebuilt archive and prove what changed: only the Depends line.
( cd "$work/check" && ar x ../package.deb )
tar -xf "$work/check/control.tar.$ext" -C "$work/check"
after=$(sed -n 's/^Depends: //p' "$work/check/control")
[[ -n "$after" ]] || { echo "FAIL: no Depends readable in the rebuilt archive" >&2; exit 1; }
if [[ "$after" == "$before" ]]; then
  # Unchanged is correct in two cases: nothing named libgtk-3-0 to begin with,
  # or a re-run over an already-final package. Anything else is a failed patch.
  if [[ "$had_bare" == "0" || "$before" == *"libgtk-3-0t64 | libgtk-3-0"* ]]; then
    :
  else
    echo "FAIL: Depends unchanged and still names a bare libgtk-3-0 ($before)" >&2
    exit 1
  fi
fi
if [[ "$had_bare" != "0" && "$after" != *"libgtk-3-0t64 | libgtk-3-0"* ]]; then
  echo "FAIL: a bare libgtk-3-0 entry is still unqualified: $after" >&2
  exit 1
fi
if [[ "$after" != *"gstreamer1.0-plugins-good"* ]]; then
  echo "FAIL: Depends lacks gstreamer1.0-plugins-good - the WAV demuxer is a hard runtime requirement (media-first, ADR-0024): libwebkit2gtk only Recommends it, and without it every pack clip fails at the webview ($after)" >&2
  exit 1
fi
if diff <(grep -v '^Depends:' "$work/orig/ctrl/control") <(grep -v '^Depends:' "$work/check/control") >/dev/null; then :; else
  echo "FAIL: control fields other than Depends changed" >&2
  diff <(grep -v '^Depends:' "$work/orig/ctrl/control") <(grep -v '^Depends:' "$work/check/control") >&2
  exit 1
fi
if [[ "$(ar p "$work/package.deb" "$(basename "$data")" | sha256sum | cut -d' ' -f1)" != "$(sha256sum "$data" | cut -d' ' -f1)" ]]; then
  echo "FAIL: the payload member changed" >&2
  exit 1
fi

mv -f "$work/package.deb" "$deb"
echo "ok: $(basename "$deb")"
echo "    Depends was: $before"
echo "    Depends now: $after"
echo "    sha256 $(sha256sum "$deb" | cut -d' ' -f1)  bytes $(stat -c%s "$deb")"
