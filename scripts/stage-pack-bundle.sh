#!/usr/bin/env bash
# Pack-bundle staging (K-59, owner decision 2026-10-08: the merged
# resources-overlay route).
#
# A release bundle is not self-contained for CONTENT: bundled_packs() in
# apps/desktop/src-tauri/src/lib.rs resolves pack candidates through the
# compile-time CARGO_MANIFEST_DIR, so the shipped deb finds a language pack
# only on the machine whose tree built it. This script stages the pack
# SOURCE DIRECTORY itself into a gitignored staging root and emits a Tauri
# config overlay mapping it into bundle resources, so one artifact (this
# overlay merged with dist/variants/tauri.aligner.json) carries the pack AND
# the whisper sidecar and is testable on a machine with no repo tree.
#
# The gate is `validate --mode install` — the pack must be INSTALLABLE,
# including the ADR-0016 media pairing gate. Any validate error refuses the
# stage outright; nothing partial is ever written. Note for the default
# locale ja-JP: a fresh checkout FAILS install mode with `media_unbuilt`
# because the committed media/manifest.jsonl declares .wav bytes that are
# gitignored and regenerated — run scripts/generate-pack-audio.py before
# staging ja-JP (ADR-0016). This is the gate working, not a script defect.
#
# The base apps/desktop/src-tauri/tauri.conf.json stays payload-free on
# purpose (bare/dev builds must abstain honestly), so bundle resources for
# packs exist ONLY in builds that pass this overlay — the same opt-in
# pattern as scripts/stage-aligner-sidecar.sh — the TTS variant it also
# pointed at was removed with runtime TTS (K-90, ADR-0024).
set -euo pipefail

cd "$(dirname "$0")/.."

DEFAULT_PACK_ROOT="dist/variants/packs/resources/packs"
ALIGNER_OVERLAY="dist/variants/tauri.aligner.json"
STAGE_BY="scripts/stage-pack-bundle.sh"

LOCALE="ja-JP"
PACK_DIR=""
PACK_ROOT="$DEFAULT_PACK_ROOT"
OUT=""
MATURITY="experimental"
ACTION=""
TMP_OUT=""

usage() {
  cat <<'TEXT'
usage: scripts/stage-pack-bundle.sh <stage|overlay> [options]

  stage    Validate a pack with `cargo run -q -p lts-langpack-cli --
           validate <dir> --mode install` (the installable gate, incl. the
           ADR-0016 media pairing gate) and REFUSE on any error; then stage
           the pack SOURCE DIRECTORY into
           dist/variants/packs/resources/packs/<pack-id> (gitignored;
           dist/ already is). The pack id is read from the pack's own
           manifest.yaml. Idempotent: a re-run verifies and keeps an
           already-staged copy instead of re-copying.
           Default source: languages/<locale> (default locale ja-JP),
           override with --locale or --pack-dir.
           ja-JP note: on a fresh checkout stage refuses with
           `media_unbuilt` — the committed media/manifest.jsonl declares
           .wav bytes that are gitignored and regenerated (ADR-0016). Run
           scripts/generate-pack-audio.py first; the refusal is the gate
           working.
           Runtime sidecar: `stage` records each staged pack in
           <pack-root>/BUNDLED.yaml (schema_version 1; pack_id, locale,
           maturity per entry). A pack-bundled build reads locale and
           maturity for display from that file and refuses to guess
           them: a root without a readable sidecar offers no pack
           candidates at all. Set --locale/--maturity when staging a
           non-default pack.
  overlay  Run the same install-mode validation gate over every staged pack
           under the staging root, then write dist/variants/
           tauri.pack.json: a Tauri config overlay whose bundle.resources
           maps each staged absolute pack dir to packs/<pack-id>. Tauri
           JSON-merge-patches each --config over the base tauri.conf.json
           and over other overlays, so pack and aligner resources compose
           when both overlays are passed:
             cargo tauri build --config dist/variants/tauri.pack.json \
               --config dist/variants/tauri.aligner.json
           Refuses to emit without staged+validated content (nothing
           staged, or a staged copy that fails validation); writes
           atomically (temp + mv), so a failed run leaves no partial
           overlay a build could pick up.

Bundle resources are only present in builds that pass the overlay: the base
config carries no pack resources on purpose, and bare/dev builds keep
resolving packs from the repo tree (or abstain) exactly as today.

Runtime resolution contract, matching the docs/13 table row (the lib.rs
side is implemented; the sidecar this script writes is its input):

  | pack-bundled (tauri.pack.json overlay) | `packs/<pack-id>/` under the resource dir, named by `packs/BUNDLED.yaml` (schema_version 1) | at startup `BUNDLED_PACKS: OnceLock<PathBuf>` is set from `app.path().resource_dir().join("packs")` (same pattern as `BUNDLED_TTS`/`BUNDLED_SIDECAR`); `bundled_packs()` prefers the repo tree when present (dev), else reads the sidecar and its `<pack-id>/` directories, fail-closed; a bare build without the resource dir keeps today's behavior |

options:
  --locale LOCALE      Pack source language/<locale>. Default: ja-JP.
  --maturity M         Maturity recorded in the BUNDLED.yaml sidecar (the
                       word a shipped build displays). Default: experimental.
  --locale LOCALE      Pack source language/<locale>, and the locale the
                       sidecar records. Default: ja-JP.
  --pack-root DIR      Staged-pack root (default
                       dist/variants/packs/resources/packs). `stage` refuses
                       roots outside the git work tree and requires any root
                       inside it to be gitignored.
  --out FILE           Overlay output path for `overlay` (default
                       dist/variants/tauri.pack.json).
  -h, --help           This text.

Dependencies: git, cargo (the workspace CLI, nothing else), rsync,
realpath, coreutils.
TEXT
}

say() { printf 'stage-pack-bundle: %s\n' "$*" >&2; }

# fail <step> <message...> : name the failing step and exit non-zero.
fail() {
  local step=$1
  shift
  printf 'stage-pack-bundle: %s: %s\n' "$step" "$*" >&2
  exit 1
}

cleanup() {
  if [[ -n $TMP_OUT && -f $TMP_OUT ]]; then
    rm -f "$TMP_OUT"
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

# validate_pack DIR STEP: the install-mode gate. Any non-zero exit (load
# error or validation errors) fails the run under its own step name.
validate_pack() {
  local dir=$1 step=$2
  resolve_cargo
  say "validating $dir in install mode (installable gate, incl. ADR-0016 media pairing)"
  cargo run -q -p lts-langpack-cli -- validate "$dir" --mode install ||
    fail "$step" "$dir is not installable per validate --mode install: refusing to proceed"
}

# pack_id_of DIR: read pack_id from the pack's own manifest.yaml.
pack_id_of() {
  local id
  id=$(sed -n 's/^pack_id:[[:space:]]*"\{0,1\}\([^"]*\)"\{0,1\}[[:space:]]*$/\1/p' "$1/manifest.yaml" |
    head -n1)
  [[ -n $id ]] || fail manifest "no pack_id in $1/manifest.yaml"
  printf '%s\n' "$id"
}

# record_sidecar ID: upsert one entry in <pack-root>/BUNDLED.yaml.
# Atomic (temp + mv); the runtime loader is fail-closed, so the file
# keeps one stable shape however many packs get staged.
record_sidecar() {
  local id=$1 file="$PACK_ROOT/BUNDLED.yaml"
  local ids=() locs=() mats=()
  if [[ -f $file ]]; then
    local cur_id=""
    while IFS= read -r line; do
      case $line in
        "  - pack_id: "*) cur_id=${line#  - pack_id: } ;;
        "    locale: "*) [[ -n $cur_id ]] && ids+=("$cur_id") && locs+=("${line#    locale: }") ;;
        "    maturity: "*) [[ -n $cur_id ]] && mats+=("${line#    maturity: }") ;;
      esac
    done <"$file"
  fi
  local found=0 i
  for i in "${!ids[@]}"; do
    if [[ ${ids[$i]} == "$id" ]]; then
      locs[$i]=$LOCALE mats[$i]=$MATURITY found=1
    fi
  done
  if (( found == 0 )); then
    ids+=("$id") locs+=("$LOCALE") mats+=("$MATURITY")
  fi
  local tmp="$file.tmp.$$"
  {
    printf 'schema_version: 1\n'
    printf '# written by %s; consumed by bundled_packs() in a pack-bundled build\n' "$STAGE_BY"
    printf 'packs:\n'
    for i in "${!ids[@]}"; do
      printf '  - pack_id: %s\n    locale: %s\n    maturity: %s\n' "${ids[$i]}" "${locs[$i]}" "${mats[$i]}"
    done
  } >"$tmp"
  mv "$tmp" "$file"
  say "recorded $id (locale $LOCALE, maturity $MATURITY) in $file"
}

# Refuse to write a staging root that could be committed (aligner pattern).
assert_pack_root_untracked() {
  local repo_abs root_abs
  repo_abs=$(git rev-parse --show-toplevel 2>/dev/null) ||
    fail git "not inside a git work tree; cannot assert $PACK_ROOT is untracked"
  root_abs=$(realpath -m "$PACK_ROOT")
  if [[ $root_abs != "$repo_abs/"* ]]; then
    fail git "$PACK_ROOT resolves outside the git work tree ($root_abs); refusing to stage a pack root that git cannot prove is ignored"
  fi
  # check-ignore needs a file-shaped probe: the dist/ rule covers anything
  # under it, and that is the property we need.
  if ! git check-ignore -q "$PACK_ROOT/probe.yaml"; then
    fail git "$PACK_ROOT is not ignored by git; stage only under a gitignored root (dist/ covers the default)"
  fi
}

# ---------------------------------------------------------------- arguments

case "${1:-}" in
  stage | overlay)
    ACTION=$1
    shift
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

while [[ $# -gt 0 ]]; do
  case $1 in
    --locale | --maturity | --pack-dir | --pack-root | --out)
      [[ $# -ge 2 ]] || fail args "$1 requires a value"
      case $1 in
        --locale) LOCALE=$2 ;;
        --maturity) MATURITY=$2 ;;
        --pack-dir) PACK_DIR=$2 ;;
        --pack-root) PACK_ROOT=$2 ;;
        --out) OUT=$2 ;;
      esac
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      printf 'stage-pack-bundle: args: unknown option: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

# ------------------------------------------------------------------ subcmds

do_stage() {
  require_tool git
  require_tool rsync
  require_tool realpath

  # Git guard first: before any validate work (aligner pattern).
  assert_pack_root_untracked

  local src=${PACK_DIR:-"languages/$LOCALE"}
  [[ -f $src/manifest.yaml ]] ||
    fail stage "no pack at $src: missing $src/manifest.yaml"

  # The installable gate runs on the SOURCE before anything is staged; a
  # re-run pays it again ("verifies and keeps").
  validate_pack "$src" stage

  local id dest
  id=$(pack_id_of "$src")
  dest="$PACK_ROOT/$id"
  if [[ -d $dest && -f $dest/manifest.yaml ]]; then
    say "pack $id already staged at $dest; kept (source re-validated above)"
  else
    mkdir -p "$PACK_ROOT"
    rsync -a --delete "$src/" "$dest/"
    say "staged pack $id from $src at $dest"
  fi
  record_sidecar "$id"
  say "staged content ships only through a build that passes the overlay: run '$STAGE_BY overlay'"
}

do_overlay() {
  require_tool realpath

  # Every directory under the pack root with a manifest.yaml is a staged
  # pack; each gets the SAME gate `stage` applied to its source.
  local dirs=() d names=""
  shopt -s nullglob
  for d in "$PACK_ROOT"/*/; do
    [[ -f $d/manifest.yaml ]] && dirs+=("${d%/}")
  done
  shopt -u nullglob
  if (( ${#dirs[@]} == 0 )); then
    fail overlay "nothing staged under $PACK_ROOT: run 'stage' first; nothing to overlay"
  fi
  for d in "${dirs[@]}"; do
    if ! validate_pack "$d" overlay; then
      # validate_pack already exits; belt for future refactors.
      fail overlay "staged pack at $d failed validation: refusing to bundle an unvalidated pack"
    fi
  done

  local out=${OUT:-dist/variants/tauri.pack.json}
  local tmp="$out.tmp.$$"
  TMP_OUT=$tmp
  # Written atomically (temp + mv in the same directory): all failure paths
  # above happen before the first byte is written.
  mkdir -p "$(dirname "$out")"
  {
    printf '{\n  "bundle": {\n    "resources": {\n'
    local entry sep="" id
    for d in "${dirs[@]}"; do
      id=$(pack_id_of "$d")
      names+="${names:+, }$id"
      entry="\"$(realpath "$d")\": \"packs/$id\""
      printf '      %s%s\n' "$sep" "$entry"
      sep=","
    done
    # The sidecar itself has to ride along: the runtime loader reads
    # resource_dir/packs/BUNDLED.yaml FIRST and fails closed without it,
    # which would make every mapped pack directory invisible. A build
    # that ships pack bytes but no sidecar is not a pack-bundled build.
    if [[ -f "$PACK_ROOT/BUNDLED.yaml" ]]; then
      printf '      ,\n      "%s": "packs/BUNDLED.yaml"\n' "$(realpath "$PACK_ROOT/BUNDLED.yaml")"
    else
      fail overlay "no BUNDLED.yaml sidecar under $PACK_ROOT: 'stage' writes it; refusing to emit an overlay the runtime would fail closed on"
    fi
    printf '    }\n  }\n}\n'
  } >"$tmp"
  mv "$tmp" "$out"
  TMP_OUT=""

  echo "pack overlay: $out (bundled packs: $names)"
  if [[ -f $ALIGNER_OVERLAY ]]; then
    echo "pack+aligner-bundled build: cargo tauri build --config $out --config $ALIGNER_OVERLAY"
  else
    echo "pack-bundled build: cargo tauri build --config $out"
    say "no aligner overlay at $ALIGNER_OVERLAY: the merged pack+aligner variant also needs scripts/stage-aligner-sidecar.sh stage && scripts/stage-aligner-sidecar.sh overlay"
  fi
  say "bundle resources are only present in builds that pass this overlay; bare/dev builds keep abstaining honestly"
}

case $ACTION in
  stage) do_stage ;;
  overlay) do_overlay ;;
esac
