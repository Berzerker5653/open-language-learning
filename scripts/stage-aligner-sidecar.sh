#!/usr/bin/env bash
# Aligner sidecar staging (owner decision 2026-10-08, packaging half).
#
# The aligner (lts_speech_runtime::alignment::WhisperConstrainedAligner) shells
# out to a `whisper-cli` built with -oj. In development that binary is resolved
# from $LTS_BENCH_VENDOR/whisper.cpp/build/bin/whisper-cli; shipped builds have
# no such cache, so they carry no ASR at all. This script stages a
# self-contained sidecar payload for the desktop bundle:
#
#   apps/desktop/sidecar/<platform>/
#     bin/whisper-cli
#     bin/libwhisper.so.1  bin/libggml.so.0  bin/libggml-cpu.so.0
#     bin/libggml-base.so.0  bin/libgomp.so.1
#     model/ggml-tiny.bin
#     SIDECAR.yaml
#
# The payload root is generated and gitignored; model weights never enter git
# (repo rule: never commit model binaries). Manifest provenance: the runtime
# block records the pinned upstream commit and the cmake flags actually used;
# `runtime.files` lists every runtime binary (bytes + sha256, paths relative to
# the platform dir) and the `model` block pins the weights by bytes + sha256.
# `verify` recomputes every one of those against the payload on disk. No
# platform-testing claim is emitted here: per ADR-0015 platform claims come only
# from human runtime reports.
#
# GGML_NATIVE=OFF is REQUIRED. -march=native (the upstream default) bakes the
# build host's ISA extensions into the shipped object code, so the bundle would
# crash on older CPUs than the build machine.
#
# Upstream: whisper.cpp, MIT-licensed. Pinned commit
# 60c0be6ac8fa71b1a2ae2dd938a31a34a508e774 (release 1.9.4, ggml 0.25.1).
# Caveat measured at this ref: cmake reports WHISPER_BUILD_CLI as unused
# (whisper-cli comes from WHISPER_BUILD_EXAMPLES, default ON), and with
# GGML_NATIVE=OFF ggml still fixes the x86-64 baseline at SSE4.2/F16C/FMA/
# BMI2/AVX/AVX2, so the shipped bundle needs an AVX2-capable CPU. See --help.
set -euo pipefail

cd "$(dirname "$0")/.."

UPSTREAM_REPO="https://github.com/ggml-org/whisper.cpp"
PINNED_REF="60c0be6ac8fa71b1a2ae2dd938a31a34a508e774"
UPSTREAM_VERSION="1.9.4"
LICENSE_SPDX="MIT"
# Explicit, host-independent instruction-set floor: x86-64-v3.
# GGML_NATIVE=ON would bake the build host's own ISA (AVX-512 on some CPUs), and
# GGML_NATIVE=OFF alone does NOT give plain x86-64 either — ggml's INS_ENB
# defaults fix the baseline at SSE4.2/F16C/FMA/BMI2/AVX/AVX2 when NATIVE is
# explicitly off (ggml/CMakeLists.txt:141-158). So each level is stated here,
# which makes the payload identical in ISA on any build machine, and the
# requirement is written into the manifest as requires_cpu.
# Why not plain x86-64: measured on the same 2.6 s Japanese sample, a scalar
# build (every SIMD level off, 0 %ymm in libggml-cpu.so.0) took 3.6 s per
# utterance against 0.40 s for the v3 build — 9x, far outside any interactive
# budget. The app therefore checks the CPU before using this sidecar and says
# plainly when the host CPU is too old, instead of shipping a runtime that
# faults or crawls.
BUILD_FLAGS="-DGGML_NATIVE=OFF -DGGML_SSE42=ON -DGGML_F16C=ON -DGGML_FMA=ON -DGGML_BMI2=ON -DGGML_AVX=ON -DGGML_AVX2=ON -DGGML_AVX512=OFF -DCMAKE_BUILD_TYPE=Release"
REQUIRES_CPU="x86-64-v3 (SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no AVX-512)"

MODEL_ID="ggml-tiny"
MODEL_FILE="ggml-tiny.bin"
MODEL_UPSTREAM="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin"
MODEL_SHA256="be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21"
MODEL_BYTES=77691713

DEFAULT_PAYLOAD_ROOT="apps/desktop/sidecar"
NOTICE_FILE="third-party/notices/whisper-cpp-MIT.txt"
# The .so.1/.so.0 names in a cmake build dir are symlinks to versioned files;
# the payload must contain the real bytes under the SONAME name, so every copy
# below follows symlinks (cp -L) and verify rejects symlink payload entries.
RUNTIME_LIBS=(libwhisper.so.1 libggml.so.0 libggml-cpu.so.0 libggml-base.so.0)
STAGE_BY="scripts/stage-aligner-sidecar.sh"

PIN_SHORT="${PINNED_REF:0:7}"
CACHE_DIR="${LTS_BENCH_VENDOR:-$HOME/.cache/lts-bench}"
PAYLOAD_ROOT="$DEFAULT_PAYLOAD_ROOT"
PLATFORM=""
FROM_MODEL=""
ACTION=""
STAGING=""
OUT=""

usage() {
  cat <<'TEXT'
usage: scripts/stage-aligner-sidecar.sh <stage|verify|overlay> [options]

  stage    Clone/build the pinned whisper.cpp aligner runtime, download the
           pinned model, and stage the sidecar payload under
           apps/desktop/sidecar/<platform>/ (gitignored, generated).
           Idempotent: an already-valid payload is reported and kept, with no
           rebuild and exit 0.
  verify   Recompute every bytes/sha256 entry in SIDECAR.yaml against the
           payload on disk. Exit 0 and print the manifest if all match;
           otherwise list every mismatch and exit 1.

  overlay  Run the same integrity gate over every staged platform payload
           under the payload root (sizes, hashes, no symlinks, unlisted-file
           rejection), then write a tauri config overlay mapping each staged
           platform dir to aligner/<platform> in bundle resources, plus
           third-party/notices/whisper-cpp-MIT.txt to
           aligner/LICENSE.whisper-cpp.txt (the payload-scoped MIT
           obligation; the overlay refuses to emit without it). The base
           apps/desktop/src-tauri/tauri.conf.json stays payload-free on
           purpose: bare and dev builds never require the payload, and a
           release build opts in with `cargo tauri build --config <overlay>`
           (ADR-0019; this is the only staged-payload variant since K-90).
           If nothing is staged or any payload fails, overlay exits
           non-zero: run `stage` first.

options:
  --platform PLATFORM   Target platform dir. Default: from `uname -m`
                        (x86_64 -> linux-x64). Only linux-x64 is built and
                        tested; any other platform exits non-zero.
  --cache-dir DIR       Cache for the whisper.cpp checkout and the model file.
                        Default: $LTS_BENCH_VENDOR, else ~/.cache/lts-bench.
                        Existing valid artifacts are reused. Nothing is ever
                        written outside the cache dir and the payload root.
  --from-model FILE     Stage this local model copy instead of downloading.
                        Its sha256 and size are still checked against the
                        pinned values and a mismatch is refused.
  --payload-root DIR    Override the payload root (default
                        apps/desktop/sidecar). For mirrors and tests only;
                        `stage` refuses roots outside the git work tree and
                        requires any root inside it to be gitignored.
  --out FILE            Overlay output path for `overlay` (default
                        dist/variants/tauri.aligner.json).
  -h, --help            This text.

Only platforms that are actually staged get an aligner in the bundle.
Unstaged platforms (windows-x64, macos today) ship without one and the app
abstains honestly rather than claiming support (ADR-0015).

Build provenance: the runtime is configured with
  -DGGML_NATIVE=OFF -DGGML_SSE42=ON -DGGML_F16C=ON -DGGML_FMA=ON
  -DGGML_BMI2=ON -DGGML_AVX=ON -DGGML_AVX2=ON -DGGML_AVX512=OFF
  -DCMAKE_BUILD_TYPE=Release
so the payload has an explicit, host-independent x86-64-v3 instruction-set
floor, recorded in SIDECAR.yaml as requires_cpu. GGML_NATIVE=ON (upstream's
default) would add -march=native and bake the build host's own ISA (AVX-512 on
some CPUs) into shipped object code; GGML_NATIVE=OFF alone would quietly keep
the v3 default via ggml's INS_ENB (ggml/CMakeLists.txt:141-158). Naming every
level makes the ISA the same wherever it is staged.
The floor is stated rather than assumed away: a scalar build of the same commit
(0 %ymm in libggml-cpu.so.0) aligned the same 2.6 s sample in 3.6 s against
0.40 s here — 9x, so the app checks the CPU before using the sidecar and says
plainly when the host is too old instead of crawling or faulting.

whisper-cli is a target of WHISPER_BUILD_EXAMPLES (default ON); the build step
names `--target whisper-cli` so the other examples are never compiled.
build_flags records exactly what was passed.

Dependencies: git, cmake, cmake's build tool (make or ninja), sha256sum, curl
or wget, coreutils.
TEXT
}

say() { printf 'stage-aligner-sidecar: %s\n' "$*" >&2; }

# fail <step> <message...> : name the failing step and exit non-zero.
fail() {
  local step=$1
  shift
  printf 'stage-aligner-sidecar: %s: %s\n' "$step" "$*" >&2
  exit 1
}

cleanup() {
  if [[ -n $STAGING && -d $STAGING ]]; then
    rm -rf "$STAGING"
  fi
}
trap cleanup EXIT

file_bytes() { stat -c'%s' "$1"; }
file_sha() { sha256sum "$1" | cut -d' ' -f1; }

require_tool() {
  command -v "$1" >/dev/null 2>&1 || fail deps "required tool not found: $1"
}

download() { # download URL DEST
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 --retry-connrefused -o "$2" "$1"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$2" "$1"
  else
    fail deps "neither curl nor wget is available to fetch $1"
  fi
}

# ---------------------------------------------------------------- arguments

case "${1:-}" in
  stage | verify | overlay)
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
    --platform | --cache-dir | --from-model | --payload-root | --out)
      [[ $# -ge 2 ]] || fail args "$1 requires a value"
      case $1 in
        --platform) PLATFORM=$2 ;;
        --cache-dir) CACHE_DIR=$2 ;;
        --from-model) FROM_MODEL=$2 ;;
        --payload-root) PAYLOAD_ROOT=$2 ;;
        --out) OUT=$2 ;;
      esac
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      printf 'stage-aligner-sidecar: args: unknown option: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z $PLATFORM ]]; then
  case $(uname -m) in
    x86_64) PLATFORM="linux-x64" ;;
    *)
      printf 'stage-aligner-sidecar: platform: only linux-x64 is built and tested (host arch is %s)\n' \
        "$(uname -m)" >&2
      exit 1
      ;;
  esac
fi
if [[ $PLATFORM != "linux-x64" ]]; then
  printf 'stage-aligner-sidecar: platform: only linux-x64 is built and tested (requested %s)\n' "$PLATFORM" >&2
  exit 1
fi

PLAT_DIR="$PAYLOAD_ROOT/$PLATFORM"

# --------------------------------------------------------------- verify core

# verify_payload DIR: recompute every hash/size in DIR/SIDECAR.yaml against the
# files on disk. Prints each mismatch to stderr; returns 1 if anything differs.
verify_payload() {
  local dir=$1
  local manifest="$dir/SIDECAR.yaml"
  [[ -f $manifest ]] || fail verify "no manifest at $manifest"

  local line t sect="" in_files=0 cur_path="" cur_bytes="" cur_sha=""
  local built_for="" model_id="" model_bytes="" model_sha=""
  local paths=() bytes=() shas=()

  while IFS= read -r line || [[ -n $line ]]; do
    t=${line#"${line%%[![:space:]]*}"} # left-trim
    [[ -z $t || ${t:0:1} == "#" ]] && continue
    if [[ $line != [[:space:]]* ]]; then # top-level key
      in_files=0
      case $t in
        model:) sect="model" ;;
        files:) sect="files" in_files=1 ;;
        built_for:*)
          sect=""
          built_for=${t#built_for:}
          built_for=${built_for#"${built_for%%[![:space:]]*}"}
          ;;
        *) sect="" ;;
      esac
      continue
    fi
    # `files:` is nested inside the runtime block; enter it from a nested line.
    if [[ $t == "files:" ]]; then
      in_files=1
      continue
    fi
    if ((in_files)); then
      case $t in
        --) ;;
        "- path:"*)
          if [[ -n $cur_path ]]; then
            paths+=("$cur_path")
            bytes+=("$cur_bytes")
            shas+=("$cur_sha")
          fi
          cur_path=${t#- path:}
          cur_path=${cur_path#"${cur_path%%[![:space:]]*}"}
          cur_bytes=""
          cur_sha=""
          ;;
        "bytes:"*)
          cur_bytes=${t#bytes:}
          cur_bytes=${cur_bytes#"${cur_bytes%%[![:space:]]*}"}
          ;;
        "sha256:"*)
          cur_sha=${t#sha256:}
          cur_sha=${cur_sha#"${cur_sha%%[![:space:]]*}"}
          ;;
      esac
      continue
    fi
    if [[ $sect == "model" ]]; then
      case $t in
        "id:") model_id="" ;;
        "id:"*)
          model_id=${t#id:}
          model_id=${model_id#"${model_id%%[![:space:]]*}"}
          ;;
        "bytes:"*)
          model_bytes=${t#bytes:}
          model_bytes=${model_bytes#"${model_bytes%%[![:space:]]*}"}
          ;;
        "sha256:"*)
          model_sha=${t#sha256:}
          model_sha=${model_sha#"${model_sha%%[![:space:]]*}"}
          ;;
      esac
    fi
  done <"$manifest"
  if [[ -n $cur_path ]]; then
    paths+=("$cur_path")
    bytes+=("$cur_bytes")
    shas+=("$cur_sha")
  fi

  if [[ ${#paths[@]} -eq 0 ]]; then
    say "mismatch: $manifest: no runtime.files entries parsed"
    return 1
  fi
  if [[ -z $model_id || -z $model_bytes || -z $model_sha ]]; then
    say "mismatch: $manifest: incomplete model block"
    return 1
  fi
  # Compare built_for against the payload DIR's own name, not the host
  # PLATFORM: `overlay` verifies every staged platform dir, each against
  # the platform it claims. Call sites pass dirs whose basename is the
  # platform, so this is identical for stage/verify.
  local want_plat=${dir%/}
  want_plat=${want_plat##*/}
  if [[ -n $built_for && $built_for != "$want_plat" ]]; then
    say "mismatch: built_for: manifest says $built_for, payload dir is $want_plat"
    return 1
  fi

  # The model block is the model file's hash/size record.
  paths+=("model/$model_id.bin")
  bytes+=("$model_bytes")
  shas+=("$model_sha")

  local bad=0 i p got_bytes got_sha
  for i in "${!paths[@]}"; do
    p="$dir/${paths[$i]}"
    if [[ -L $p ]]; then
      say "mismatch: ${paths[$i]}: payload entry is a symlink, not real bytes"
      bad=1
      continue
    fi
    if [[ ! -f $p ]]; then
      say "mismatch: ${paths[$i]}: missing from payload"
      bad=1
      continue
    fi
    got_bytes=$(file_bytes "$p")
    got_sha=$(file_sha "$p")
    if [[ $got_bytes != "${bytes[$i]}" ]]; then
      say "mismatch: ${paths[$i]}: bytes $got_bytes != ${bytes[$i]} in SIDECAR.yaml"
      bad=1
    fi
    if [[ $got_sha != "${shas[$i]}" ]]; then
      say "mismatch: ${paths[$i]}: sha256 $got_sha != ${shas[$i]} in SIDECAR.yaml"
      bad=1
    fi
  done

  # Anything on disk that the manifest does not account for is a mismatch too.
  local e rel d
  shopt -s nullglob
  for e in "$dir"/*; do
    rel=${e##*/}
    case $rel in bin | model | SIDECAR.yaml) continue ;; esac
    say "mismatch: $rel: unexpected file in payload root (not in SIDECAR.yaml)"
    bad=1
  done
  for d in bin model; do
    for e in "$dir/$d"/*; do
      rel="$d/${e##*/}"
      local listed=0 k
      for k in "${paths[@]}"; do
        [[ $k == "$rel" ]] && listed=1 && break
      done
      if ((listed == 0)); then
        say "mismatch: $rel: present in payload but not in SIDECAR.yaml"
        bad=1
      fi
    done
  done
  shopt -u nullglob

  return "$bad"
}

print_manifest() { cat "$1/SIDECAR.yaml"; }

# ------------------------------------------------------------------ subcmds

do_verify() {
  require_tool sha256sum
  [[ -d $PLAT_DIR ]] || fail verify "no payload at $PLAT_DIR (run: stage --platform $PLATFORM)"
  if ! verify_payload "$PLAT_DIR"; then
    fail verify "payload at $PLAT_DIR failed verification (every mismatch listed above)"
  fi
  print_manifest "$PLAT_DIR"
}

# do_overlay: emit the tauri config overlay that maps staged payload(s) into
# bundle resources. The base tauri.conf.json stays payload-free on purpose
# (bare/dev builds must not require the payload), following the opt-in
# overlay pattern: absolute host paths in the resources map,
# and the build command echoed at the end. Only staged platforms get an
# aligner; unstaged platforms ship without one, they do not claim support.
do_overlay() {
  require_tool sha256sum
  require_tool realpath

  # Every directory under the payload root that carries a SIDECAR.yaml is a
  # staged payload; each gets the SAME gate `verify` applies (sizes, hashes,
  # no symlinks, nothing unlisted).
  local dirs=() d plat names=""
  shopt -s nullglob
  for d in "$PAYLOAD_ROOT"/*/; do
    [[ -f $d/SIDECAR.yaml ]] && dirs+=("${d%/}")
  done
  shopt -u nullglob
  if (( ${#dirs[@]} == 0 )); then
    fail overlay "nothing staged under $PAYLOAD_ROOT: run 'stage' first (needs cmake + network); nothing to overlay"
  fi
  for d in "${dirs[@]}"; do
    if ! verify_payload "$d"; then
      fail overlay "payload at $d failed verification: run 'stage' first; refusing to bundle an unverifiable payload"
    fi
  done

  # Payload-scoped MIT obligation: the shipped whisper-cli copy is MIT, so
  # the license text rides alongside it in the bundle.
  if [[ ! -f $NOTICE_FILE ]]; then
    fail overlay "missing $NOTICE_FILE: the aligner payload may not ship without its MIT notice"
  fi

  local out=${OUT:-dist/variants/tauri.aligner.json}
  local tmp="$out.tmp.$$"
  # Written atomically (temp + mv in the same directory): a failed run must
  # never leave a partial overlay a build could pick up. All failure paths
  # above happen before the first byte is written.
  mkdir -p "$(dirname "$out")"
  {
    printf '{\n  "bundle": {\n    "resources": {\n'
    local entry sep=""
    for d in "${dirs[@]}"; do
      plat=${d##*/}
      names+="${names:+, }$plat"
      entry="\"$(realpath "$d")\": \"aligner/$plat\""
      printf '      %s%s\n' "$sep" "$entry"
      sep=","
    done
    entry="\"$(realpath "$NOTICE_FILE")\": \"aligner/LICENSE.whisper-cpp.txt\""
    printf '      %s%s\n' "$sep" "$entry"
    printf '    }\n  }\n}\n'
  } >"$tmp"
  mv "$tmp" "$out"

  echo "aligner overlay: $out (bundled platforms: $names)"
  echo "aligner-bundled build: cargo tauri build --config $out"
  say "stage must have run first (cmake + network required); only the staged platforms above are bundled"
  say "unstaged platforms (windows-x64, macos today) ship without an aligner rather than claiming support"
}

# Refuse to write a payload that could be committed.
assert_payload_untracked() {
  local repo_abs root_abs
  repo_abs=$(git rev-parse --show-toplevel 2>/dev/null) ||
    fail git "not inside a git work tree; cannot assert $PAYLOAD_ROOT is untracked"
  root_abs=$(realpath -m "$PAYLOAD_ROOT")
  # `stage` refuses outright: outside the work tree, git cannot prove the
  # payload is never committed, and this guard runs at the top of do_stage,
  # before any clone/build/download work.
  if [[ $root_abs != "$repo_abs/"* ]]; then
    fail git "$PAYLOAD_ROOT resolves outside the git work tree ($root_abs); refusing to stage a payload root that git cannot prove is ignored"
  fi
  # Trailing slash matters: the .gitignore rule is directory-only
  # (`apps/desktop/sidecar/`), and check-ignore does not match a bare,
  # not-yet-created directory against one. The nested path proves the contents
  # are ignored, which is the property we actually need.
  if ! git check-ignore -q "$PAYLOAD_ROOT/" ||
    ! git check-ignore -q "$PAYLOAD_ROOT/SIDECAR.yaml"; then
    fail git "$PAYLOAD_ROOT is not ignored by git; add 'apps/desktop/sidecar/' to .gitignore before staging"
  fi
}

SRC_DIR=""
BUILD_DIR=""
CACHE_MAIN="$CACHE_DIR/whisper.cpp"
CACHE_PINNED="$CACHE_DIR/whisper.cpp-$PIN_SHORT"

head_rev() { git -C "$1" rev-parse HEAD 2>/dev/null || true; }

ensure_source() {
  require_tool git
  mkdir -p "$CACHE_DIR"
  if [[ $(head_rev "$CACHE_MAIN") == "$PINNED_REF" ]]; then
    SRC_DIR="$CACHE_MAIN"
    say "reusing checkout at $SRC_DIR ($PIN_SHORT)"
  elif [[ $(head_rev "$CACHE_PINNED") == "$PINNED_REF" ]]; then
    SRC_DIR="$CACHE_PINNED"
    say "reusing checkout at $SRC_DIR ($PIN_SHORT)"
  else
    if [[ -e $CACHE_PINNED ]]; then
      fail checkout "$CACHE_PINNED exists but is not at the pinned ref $PINNED_REF (HEAD $(head_rev "$CACHE_PINNED"))"
    fi
    if [[ -d $CACHE_MAIN && ! -d $CACHE_MAIN/.git ]]; then
      fail checkout "$CACHE_MAIN exists but is not a git checkout"
    fi
    # A cache checkout at some other ref is left untouched; the pinned source
    # gets its own directory (and its own build dir) beside it.
    say "cloning $UPSTREAM_REPO at $PINNED_REF"
    git clone --quiet "$UPSTREAM_REPO" "$CACHE_PINNED" ||
      fail checkout "git clone of $UPSTREAM_REPO failed"
    if ! git -C "$CACHE_PINNED" fetch --quiet --depth 1 origin "$PINNED_REF"; then
      git -C "$CACHE_PINNED" fetch --quiet origin "$PINNED_REF" ||
        fail checkout "git fetch of $PINNED_REF in $CACHE_PINNED failed"
    fi
    git -c advice.detachedHead=false -C "$CACHE_PINNED" checkout --quiet --detach FETCH_HEAD ||
      fail checkout "git checkout $PINNED_REF in $CACHE_PINNED failed"
    if [[ $(head_rev "$CACHE_PINNED") != "$PINNED_REF" ]]; then
      fail checkout "$CACHE_PINNED HEAD is $(head_rev "$CACHE_PINNED"), expected $PINNED_REF"
    fi
    SRC_DIR="$CACHE_PINNED"
  fi
}

ensure_build() {
  require_tool cmake
  require_tool sha256sum
  BUILD_DIR="$SRC_DIR-build"
  local -a flags
  read -r -a flags <<<"$BUILD_FLAGS"
  local jobs
  jobs=$(nproc 2>/dev/null || echo 2)
  say "cmake configure: $SRC_DIR -> $BUILD_DIR ($BUILD_FLAGS)"
  cmake -S "$SRC_DIR" -B "$BUILD_DIR" "${flags[@]}" >/dev/null ||
    fail "cmake configure" "cmake -S $SRC_DIR -B $BUILD_DIR $BUILD_FLAGS failed"
  say "cmake build: whisper-cli (-j$jobs)"
  cmake --build "$BUILD_DIR" --parallel "$jobs" --target whisper-cli >/dev/null ||
    fail "cmake build" "cmake --build $BUILD_DIR --target whisper-cli failed"
}

MODEL_SRC=""
ensure_model() {
  local cached="$CACHE_DIR/$MODEL_FILE"
  if [[ -n $FROM_MODEL ]]; then
    [[ -f $FROM_MODEL ]] || fail model "--from-model file not found: $FROM_MODEL"
    MODEL_SRC=$FROM_MODEL
  elif [[ -f $cached ]]; then
    MODEL_SRC=$cached
    say "reusing model at $MODEL_SRC"
  else
    mkdir -p "$CACHE_DIR"
    local tmp
    tmp=$(mktemp "$CACHE_DIR/.$MODEL_FILE.download.XXXXXX")
    say "downloading $MODEL_UPSTREAM"
    if ! download "$MODEL_UPSTREAM" "$tmp"; then
      rm -f "$tmp"
      fail model "download failed: $MODEL_UPSTREAM"
    fi
    mv "$tmp" "$cached" || {
      rm -f "$tmp"
      fail model "could not write $cached"
    }
    MODEL_SRC=$cached
  fi
  local got_bytes got_sha
  got_bytes=$(file_bytes "$MODEL_SRC")
  got_sha=$(file_sha "$MODEL_SRC")
  if [[ $got_sha != "$MODEL_SHA256" ]]; then
    fail model "sha256 mismatch for $MODEL_SRC: got $got_sha, want $MODEL_SHA256 (refusing)"
  fi
  if [[ $got_bytes != "$MODEL_BYTES" ]]; then
    fail model "size mismatch for $MODEL_SRC: got $got_bytes, want $MODEL_BYTES (refusing)"
  fi
}

# Locate a built artifact by name: cmake keeps the SONAME names as symlinks in
# build/bin, but output directories differ across versions.
find_built() { # find_built NAME -> echo path
  local name=$1 found
  if [[ -e "$BUILD_DIR/bin/$name" ]]; then
    printf '%s\n' "$BUILD_DIR/bin/$name"
    return
  fi
  found=$(find "$BUILD_DIR" -name "$name" -print -quit 2>/dev/null || true)
  if [[ -z $found ]]; then
    fail bundle "built artifact $name not found under $BUILD_DIR"
  fi
  printf '%s\n' "$found"
}

LIBGOMP_SRC=""
locate_libgomp() {
  local cli=$1 candidate=""
  if command -v ldd >/dev/null 2>&1; then
    candidate=$(ldd "$cli" | while IFS= read -r l; do
      case $l in
        *"libgomp.so.1 => "*)
          l=${l#*"libgomp.so.1 => "}
          printf '%s\n' "${l%% *}"
          break
          ;;
      esac
    done)
  fi
  if [[ -z $candidate || ! -f $candidate ]] && command -v gcc >/dev/null 2>&1; then
    candidate=$(gcc -print-file-name=libgomp.so.1 2>/dev/null || true)
  fi
  if [[ -z $candidate || ! -f $candidate ]]; then
    fail bundle "cannot locate libgomp.so.1; the payload would not be self-contained"
  fi
  LIBGOMP_SRC=$(readlink -f "$candidate")
}

stage_payload() {
  local cli lib l
  cli=$(find_built whisper-cli)
  STAGING="$PAYLOAD_ROOT/.staging-$PLATFORM.$$"
  rm -rf "$STAGING"
  mkdir -p "$STAGING/$PLATFORM/bin" "$STAGING/$PLATFORM/model"

  cp -L "$cli" "$STAGING/$PLATFORM/bin/whisper-cli" ||
    fail bundle "copying whisper-cli into the payload failed"
  for l in "${RUNTIME_LIBS[@]}"; do
    lib=$(find_built "$l")
    cp -L "$lib" "$STAGING/$PLATFORM/bin/$l" ||
      fail bundle "copying $l into the payload failed"
  done
  locate_libgomp "$STAGING/$PLATFORM/bin/whisper-cli"
  cp -L "$LIBGOMP_SRC" "$STAGING/$PLATFORM/bin/libgomp.so.1" ||
    fail bundle "copying libgomp.so.1 into the payload failed"
  cp -L "$MODEL_SRC" "$STAGING/$PLATFORM/model/$MODEL_FILE" ||
    fail bundle "copying $MODEL_FILE into the payload failed"
  # Normalize: real bytes, no symlinks, group/world readable, libs + cli usable.
  chmod 0755 "$STAGING/$PLATFORM/bin/"*
  chmod 0644 "$STAGING/$PLATFORM/model/"*

  write_manifest "$STAGING/$PLATFORM"
  if ! verify_payload "$STAGING/$PLATFORM"; then
    fail stage "freshly staged payload failed verification; payload not published"
  fi

  local old=""
  if [[ -d $PLAT_DIR ]]; then
    old="$PAYLOAD_ROOT/.old-$PLATFORM.$$"
    mv "$PLAT_DIR" "$old" || fail stage "could not move the previous payload aside"
  fi
  mv "$STAGING/$PLATFORM" "$PLAT_DIR" || fail stage "could not publish $PLAT_DIR"
  STAGING=""
  if [[ -n $old ]]; then
    rm -rf "$old"
  fi
}

write_manifest() {
  local plat_dir=$1
  local entries=(bin/whisper-cli)
  local l
  for l in "${RUNTIME_LIBS[@]}"; do
    entries+=("bin/$l")
  done
  entries+=(bin/libgomp.so.1)
  {
    printf 'schema_version: 1\n'
    printf 'component: whisper.cpp-aligner\n'
    printf 'built_for: %s\n' "$PLATFORM"
    printf 'runtime:\n'
    printf '  upstream: %s\n' "$UPSTREAM_REPO"
    printf '  ref: %s\n' "$PINNED_REF"
    printf '  version: %s\n' "$UPSTREAM_VERSION"
    printf '  license: %s\n' "$LICENSE_SPDX"
    printf '  build_flags: %s\n' "$BUILD_FLAGS"
    printf '  requires_cpu: %s\n' "$REQUIRES_CPU"
    printf '  files:\n'
    local e
    for e in "${entries[@]}"; do
      printf '    - path: %s\n' "$e"
      printf '      bytes: %s\n' "$(file_bytes "$plat_dir/$e")"
      printf '      sha256: %s\n' "$(file_sha "$plat_dir/$e")"
    done
    printf 'model:\n'
    printf '  id: %s\n' "$MODEL_ID"
    printf '  upstream: %s\n' "$MODEL_UPSTREAM"
    printf '  license: %s\n' "$LICENSE_SPDX"
    printf '  bytes: %s\n' "$(file_bytes "$plat_dir/model/$MODEL_FILE")"
    printf '  sha256: %s\n' "$(file_sha "$plat_dir/model/$MODEL_FILE")"
    printf 'staged:\n'
    # Quoted: an unquoted RFC 3339 scalar is a YAML 1.1 timestamp, not a string.
    printf '  date: "%s"\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    printf '  by: %s\n' "$STAGE_BY"
    printf '  host: %s\n' "$(uname -srm)"
  } >"$plat_dir/SIDECAR.yaml"
}


# A payload may only be reused if this same script version staged it: the pinned
# upstream ref and the exact cmake flags must match what we would pass now.
manifest_provenance_matches() { # DIR
  local m="$1/SIDECAR.yaml"
  [[ -f $m ]] || return 1
  grep -qF "  ref: $PINNED_REF" "$m" || return 1
  grep -qF "  build_flags: $BUILD_FLAGS" "$m" || return 1
  return 0
}

do_stage() {
  require_tool git
  require_tool sha256sum
  require_tool stat
  require_tool realpath

  assert_payload_untracked

  # Idempotent for the same provenance: a valid payload is kept as-is. No clone,
  # no build, no download, and the build toolchain is not even required here.
  # Provenance counts: a payload staged under different cmake flags (e.g. the
  # scalar build before the x86-64-v3 floor) is stale even though its hashes are
  # internally consistent, so it is rebuilt rather than shipped.
  if [[ -d $PLAT_DIR ]]; then
    if verify_payload "$PLAT_DIR" >/dev/null 2>&1 && manifest_provenance_matches "$PLAT_DIR"; then
      say "payload at $PLAT_DIR is already valid; not rebuilding"
      print_manifest "$PLAT_DIR"
      return
    fi
    say "payload at $PLAT_DIR is missing, incomplete, or staged with different provenance; restaging"
  fi

  ensure_source
  ensure_build
  ensure_model
  stage_payload
  say "staged sidecar payload: $PLAT_DIR"
  print_manifest "$PLAT_DIR"
}

case $ACTION in
  stage) do_stage ;;
  verify) do_verify ;;
  overlay) do_overlay ;;
esac
