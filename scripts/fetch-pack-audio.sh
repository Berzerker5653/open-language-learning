#!/usr/bin/env bash
# CI-AUDIO (2026-10-13): restore the gitignored pack audio into a fresh
# checkout from the pack's PUBLISHED archive, so `cargo test --workspace`
# (reference-pack installs) and scripts/smoke-desktop.sh (archive build)
# have the .wav bytes a bare checkout does not carry.
#
# Reference packs commit languages/<pack>/media/manifest.jsonl but never the
# .wav bytes (.gitignore: languages/*/media/*.wav, ADR-0016). The silent-
# archive guard in crates/langpack/src/archive.rs refuses to build an audio-
# less pack (ADR-0024 removed the synthesis fallback that used to make one
# survivable) — that guard stays exactly as it is; this script supplies the
# bytes instead of weakening it.
#
# Flow: read pack_id+version from <pack-dir>/manifest.yaml, resolve the
# pinned entry (url/size_bytes/sha256) in catalog/packs.json, download the
# archive (file:// URLs are local copies — offline mirrors and hermetic
# tests only), verify exact size + SHA-256 against the catalog pin, unpack
# through the langpack CLI's install gate into a throwaway store, then copy
# the manifest's media/*.wav rows into <pack-dir>/media/. A .wav whose hash
# already matches its manifest row is never deleted or overwritten, so the
# script is idempotent. Nothing here enters git: the restored .wav files
# remain gitignored.
#
# --verify-only makes NO network calls and runs NO cargo: it only checks
# every manifest row (file present, sha256 match, byte length match) and
# names the offending ids. The archive in a reused --work-dir is re-verified
# against the catalog pins on every run, so --work-dir doubles as a download
# cache (CI wraps it in actions/cache).
#
# Paths are resolved from the repo root (the script cd's there first, like
# the other scripts). LTS_LANGPACK_CLI overrides the install command
# (whitespace-split; for hermetic tests only — the default is the workspace
# CLI via cargo).
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf 'fetch-pack-audio: %s\n' "$*" >&2; }
fail() { local step=$1; shift; printf 'fetch-pack-audio: %s: %s\n' "$step" "$*" >&2; exit 1; }

CATALOG="catalog/packs.json"
PACK_DIR="languages/ja-JP"
WORK_DIR=""
VERIFY_ONLY=0
TMP_WORK=""
RESTORED=0
ALREADY_VALID=0

usage() {
  cat <<'EOF'
usage: scripts/fetch-pack-audio.sh [options]

Restore one pack's gitignored media/*.wav from its published archive
(catalog-pinned size + SHA-256), or verify the tracked media manifest.

options:
  --pack-dir DIR    pack source directory (default languages/ja-JP)
  --catalog FILE    pack catalog (default catalog/packs.json)
  --work-dir DIR    download/unpack directory; reuse it as a cache
  --verify-only     offline manifest verification only (no network, no cargo)
  -h, --help        this help
EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --pack-dir) [[ $# -ge 2 ]] || { usage >&2; fail args "--pack-dir needs a value"; }; PACK_DIR=$2; shift 2 ;;
    --catalog) [[ $# -ge 2 ]] || { usage >&2; fail args "--catalog needs a value"; }; CATALOG=$2; shift 2 ;;
    --work-dir) [[ $# -ge 2 ]] || { usage >&2; fail args "--work-dir needs a value"; }; WORK_DIR=$2; shift 2 ;;
    --verify-only) VERIFY_ONLY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; fail args "unknown argument: $1" ;;
  esac
done

cleanup() {
  if [[ -n $TMP_WORK ]]; then
    rm -rf "$TMP_WORK"
  fi
  if [[ -n $WORK_DIR ]]; then
    rm -rf "${WORK_DIR:?}/store"
  fi
}
trap cleanup EXIT

require_tool() {
  command -v "$1" >/dev/null 2>&1 || fail deps "required tool not found: $1"
}

# cargo is not always on a non-login shell's PATH; rustup installs it here.
resolve_cargo() {
  command -v cargo >/dev/null 2>&1 && return 0
  if [[ -x $HOME/.cargo/bin/cargo ]]; then
    export PATH="$HOME/.cargo/bin:$PATH"
    return 0
  fi
  fail deps "required tool not found: cargo"
}

# manifest_field KEY DIR: first top-level scalar of manifest.yaml, unquoted.
manifest_field() {
  local value
  value=$(sed -n "s/^$1:[[:space:]]*\"\{0,1\}\([^\"]*\)\"\{0,1\}[[:space:]]*\$/\1/p" \
    "$PACK_DIR/manifest.yaml" | head -n1)
  [[ -n $value ]] || fail manifest "no $1 in $PACK_DIR/manifest.yaml"
  printf '%s\n' "$value"
}

sha_of() { sha256sum < "$1" | cut -d' ' -f1; }
size_of() { wc -c < "$1" | tr -d '[:space:]'; }

# manifest_rows: TSV "id<TAB>file<TAB>sha256<TAB>bytes" per manifest row,
# A malformed row aborts the pass (jq error), never a silent skip.
manifest_rows() {
  jq -r '[.id, .file, .sha256, (.bytes|tostring)] | @tsv' \
    "$PACK_DIR/media/manifest.jsonl"
}

# safe_row_path FILE: manifest rows may only name a flat media/<name>.wav.
safe_row_path() {
  local f=$1
  [[ $f == media/*.wav && $f != *..* && $f != /* ]]
}

# verify_pack: check EVERY tracked manifest row — file present, sha256
# match, byte length match. Prints the summary line, then the offenders,
# and returns non-zero if any row failed.
verify_pack() {
  local manifest="$PACK_DIR/media/manifest.jsonl"
  if [[ ! -f $manifest ]]; then
    say "no media manifest at $manifest; nothing to verify"
    return 0
  fi
  local rows=0 valid=0 bad=0
  local rows_tsv
  rows_tsv=$(manifest_rows) || fail verify "cannot parse $manifest"
  while IFS=$'\t' read -r id file want_sha want_bytes; do
    [[ -n ${id:-} ]] || continue
    rows=$((rows + 1))
    local target="$PACK_DIR/$file"
    if [[ -z $file || $file == null || -z $want_sha || $want_sha == null \
        || -z $want_bytes || $want_bytes == null || $want_bytes =~ [^0-9] ]]; then
      bad=$((bad + 1)); printf 'fetch-pack-audio: %s: %s: row is missing required keys (file/sha256/bytes)\n' "$PACK_DIR" "$id" >&2
      continue
    fi
    if ! safe_row_path "$file"; then
      bad=$((bad + 1)); printf 'fetch-pack-audio: %s: %s: refusing unsafe manifest path "%s"\n' "$PACK_DIR" "$id" "$file" >&2
      continue
    fi
    if [[ ! -f $target ]]; then
      bad=$((bad + 1)); printf 'fetch-pack-audio: %s: %s: file missing (%s)\n' "$PACK_DIR" "$id" "$file" >&2
      continue
    fi
    if [[ $(size_of "$target") -ne $want_bytes ]]; then
      bad=$((bad + 1)); printf 'fetch-pack-audio: %s: %s: byte length %s != manifest %s (%s)\n' \
        "$PACK_DIR" "$id" "$(size_of "$target")" "$want_bytes" "$file" >&2
      continue
    fi
    if [[ $(sha_of "$target") != "$want_sha" ]]; then
      bad=$((bad + 1)); printf 'fetch-pack-audio: %s: %s: sha256 does not match manifest (%s)\n' "$PACK_DIR" "$id" "$file" >&2
      continue
    fi
    valid=$((valid + 1))
  done <<< "$rows_tsv"
  if [[ $VERIFY_ONLY -eq 1 && $ALREADY_VALID -eq 0 ]]; then
    ALREADY_VALID=$valid
  fi
  say "summary $PACK_DIR: rows checked=$rows files valid=$valid files restored=$RESTORED files already valid=$ALREADY_VALID rows failing=$bad"
  [[ $bad -eq 0 ]]
}

# download URL DEST: fetch with curl (fail on HTTP error), or copy for
# file:// URLs (offline mirror / hermetic tests).
download() {
  local url=$1 dest=$2
  case $url in
    file://*)
      [[ -f ${url#file://} ]] || fail download "local archive not found: ${url#file://}"
      cp "${url#file://}" "$dest" ;;
    https://*|http://*)
      curl -fL --retry 3 --silent --show-error --output "$dest.part" "$url" ||
        fail download "HTTP fetch failed for $url"
      mv "$dest.part" "$dest" ;;
    *)
      fail download "unsupported URL scheme in catalog entry: $url" ;;
  esac
}

# ------------------------------------------------------------------- verify
require_tool jq
require_tool sha256sum

if [[ $VERIFY_ONLY -eq 1 ]]; then
  verify_pack
  exit $?
fi

# ------------------------------------------------------------------ restore
PACK_ID=$(manifest_field pack_id)
VERSION=$(manifest_field version)
require_tool curl

[[ -f $CATALOG ]] || fail catalog "no catalog at $CATALOG"
entry_count=$(jq --arg id "$PACK_ID" --arg v "$VERSION" \
  '[.packs[]? | select(.pack_id==$id and .version==$v)] | length' "$CATALOG")
if [[ $entry_count -ne 1 ]]; then
  fail catalog "no single $CATALOG entry for $PACK_ID $VERSION — the pack archive must be published (owner gate O-05) before its audio can be restored into a checkout"
fi
url=$(jq -r --arg id "$PACK_ID" --arg v "$VERSION" \
  '.packs[] | select(.pack_id==$id and .version==$v) | .url // ""' "$CATALOG")
want_sha=$(jq -r --arg id "$PACK_ID" --arg v "$VERSION" \
  '.packs[] | select(.pack_id==$id and .version==$v) | .sha256 // ""' "$CATALOG")
want_size=$(jq -r --arg id "$PACK_ID" --arg v "$VERSION" \
  '.packs[] | select(.pack_id==$id and .version==$v) | .size_bytes // ""' "$CATALOG")
[[ $want_sha =~ ^[0-9a-f]{64}$ ]] || fail catalog "$CATALOG entry for $PACK_ID $VERSION is missing (or does not pin) sha256"
[[ $want_size =~ ^[0-9]+$ ]] || fail catalog "$CATALOG entry for $PACK_ID $VERSION is missing (or does not pin) size_bytes"

if [[ -z $WORK_DIR ]]; then
  TMP_WORK=$(mktemp -d -t pack-audio-XXXXXX)
  WORK_DIR=$TMP_WORK
fi
mkdir -p "$WORK_DIR"
archive_name=${url##*/}
[[ -n $archive_name ]] || archive_name="$PACK_ID-$VERSION.lpk"
archive="$WORK_DIR/$archive_name"

say "restoring $PACK_ID $VERSION audio into $PACK_DIR (archive $archive_name)"
if [[ -f $archive ]]; then
  say "archive already present in $WORK_DIR; re-verifying before use"
else
  download "$url" "$archive"
fi
# The catalog pins are the trust anchor; re-verify even a cached archive.
if [[ $(size_of "$archive") -ne $want_size ]]; then
  rm -f "$archive"
  fail archive "archive size $(size_of "$archive") != catalog size_bytes $want_size ($archive_name); refusing to use it"
fi
if [[ $(sha_of "$archive") != "$want_sha" ]]; then
  rm -f "$archive"
  fail archive "archive sha256 $(sha_of "$archive") != catalog sha256 $want_sha ($archive_name); refusing to use it"
fi

# Unpack through the install gate (it enforces archive integrity + pack
# validation; a bad archive never reaches the working tree).
if [[ -n ${LTS_LANGPACK_CLI:-} ]]; then
  read -r -a CLI <<< "$LTS_LANGPACK_CLI"
else
  resolve_cargo
  CLI=(cargo run -q -p lts-langpack-cli --)
fi
store="$WORK_DIR/store"
rm -rf "$store"
say "unpacking through: ${CLI[*]} install"
"${CLI[@]}" install --store "$store" "$archive" ||
  fail unpack "the langpack install gate refused $archive_name"
media_dir="$store/$PACK_ID/$VERSION/media"
if [[ ! -d $media_dir ]]; then
  media_dir=$(find "$store" -type d -name media | head -n1)
fi
[[ -n $media_dir && -d $media_dir ]] ||
  fail unpack "no media/ directory in the unpacked pack ($archive_name)"

# Copy exactly the rows the tracked manifest demands. A row already
# satisfied in place is left byte-for-byte untouched.
copy_fail=0
mkdir -p "$PACK_DIR/media"
copy_rows=$(manifest_rows) || fail copy "cannot parse $PACK_DIR/media/manifest.jsonl"
while IFS=$'\t' read -r id file want_sha want_bytes; do
  [[ -n ${id:-} ]] || continue
  if [[ -z $file || $file == null || -z $want_sha || $want_sha == null \
      || -z $want_bytes || $want_bytes == null || $want_bytes =~ [^0-9] ]] ||
     ! safe_row_path "$file"; then
    copy_fail=$((copy_fail + 1))
    printf 'fetch-pack-audio: copy: %s: manifest row is malformed (file/sha256/bytes)\n' "$id" >&2
    continue
  fi
  target="$PACK_DIR/$file"
  if [[ -f $target ]] && [[ $(size_of "$target") -eq $want_bytes ]] &&
     [[ $(sha_of "$target") == "$want_sha" ]]; then
    ALREADY_VALID=$((ALREADY_VALID + 1))
    continue
  fi
  src="$media_dir/${file##*/}"
  if [[ -f $src ]] && [[ $(size_of "$src") -eq $want_bytes ]] &&
     [[ $(sha_of "$src") == "$want_sha" ]]; then
    cp "$src" "$target"
    RESTORED=$((RESTORED + 1))
  else
    copy_fail=$((copy_fail + 1))
    printf 'fetch-pack-audio: copy: %s: the archive carries no %s matching the manifest row\n' "$id" "${file##*/}" >&2
  fi
done <<< "$copy_rows"
if [[ $copy_fail -gt 0 ]]; then
  fail copy "$copy_fail manifest row(s) could not be restored from $archive_name (see above)"
fi

# Final audit: every tracked manifest row must now be satisfied.
verify_pack
