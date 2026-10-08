#!/usr/bin/env bash
# Hermetic regression test for scripts/stage-aligner-sidecar.sh (ADR-0019).
#
# That script is the only gate between a release build and a corrupt or
# unverifiable shipped payload, so its verify/overlay gates need a gate of
# their own. This test hand-builds a small synthetic payload (text stubs
# instead of binaries) whose SIDECAR.yaml carries REAL stat sizes and REAL
# sha256 hashes for the bytes on disk, then proves the gates reject: a
# truncated file, a same-size content change, an unlisted file, a symlink
# entry, a wrong platform, an unstaged/failed payload, and a stage root git
# cannot prove is ignored.
#
# No network, no cmake, no cargo, and the real payload is never touched:
# everything is written under apps/desktop/sidecar-test/ (gitignored) and a
# few /tmp files, all removed by the EXIT trap. Runs in a few seconds.
set -euo pipefail
cd "$(dirname "$0")/.."

SCRIPT="scripts/stage-aligner-sidecar.sh"
TEST_ROOT="apps/desktop/sidecar-test"
PLAT_DIR="$TEST_ROOT/linux-x64"
OVERLAY_OUT="/tmp/lts-aligner-overlay-$$.json"
OVERLAY_BAD="/tmp/lts-aligner-overlay-bad-$$.json"
STAGE_TMP="/tmp/lts-sidecar-not-ignored-$$"

CHECKS=0

cleanup() {
  rm -rf "$TEST_ROOT" "$OVERLAY_OUT" "$OVERLAY_BAD" "$STAGE_TMP"
}
trap cleanup EXIT

fail_test() { printf 'test-stage-aligner-sidecar: FAIL: %s\n' "$*" >&2; exit 1; }

# check DESC PATTERN CMD...: run CMD, capture combined output, require exit
# 0 and PATTERN in the output.
check() {
  local desc=$1 pattern=$2 out status=0
  shift 2
  out=$("$@" 2>&1) || status=$?
  if (( status != 0 )); then
    fail_test "$desc: expected exit 0, got $status. output: $out"
  fi
  if [[ $out != *"$pattern"* ]]; then
    fail_test "$desc: output lacks '$pattern'. output: $out"
  fi
  CHECKS=$((CHECKS + 1))
}

# expect_fail DESC PATTERN CMD...: require non-zero exit and PATTERN in the
# output (the mismatch must name the offending path, not just fail).
expect_fail() {
  local desc=$1 pattern=$2 out status=0
  shift 2
  out=$("$@" 2>&1) || status=$?
  if (( status == 0 )); then
    fail_test "$desc: expected non-zero exit, got 0. output: $out"
  fi
  if [[ $out != *"$pattern"* ]]; then
    fail_test "$desc: output lacks '$pattern'. output: $out"
  fi
  CHECKS=$((CHECKS + 1))
}

# write_manifest: same schema stage-aligner-sidecar.sh's write_manifest emits
# (schema 1, component whisper.cpp-aligner, runtime.files[] with
# path/bytes/sha256, a model block whose id maps to model/<id>.bin, quoted
# staged.date), generated from the actual files on disk with real
# `stat -c%s` sizes and real `sha256sum` hashes.
write_manifest() {
  local e
  {
    printf 'schema_version: 1\n'
    printf 'component: whisper.cpp-aligner\n'
    printf 'built_for: linux-x64\n'
    printf 'runtime:\n'
    printf '  upstream: https://github.com/ggml-org/whisper.cpp\n'
    printf '  ref: 60c0be6ac8fa71b1a2ae2dd938a31a34a508e774\n'
    printf '  version: 1.9.4\n'
    printf '  license: MIT\n'
    printf '  build_flags: -DGGML_NATIVE=OFF -DCMAKE_BUILD_TYPE=Release\n'
    printf '  requires_cpu: x86-64-v3\n'
    printf '  files:\n'
    for e in bin/whisper-cli bin/libwhisper.so.1 bin/libggml.so.0; do
      printf '    - path: %s\n' "$e"
      printf '      bytes: %s\n' "$(stat -c'%s' "$PLAT_DIR/$e")"
      printf '      sha256: %s\n' "$(sha256sum "$PLAT_DIR/$e" | cut -d' ' -f1)"
    done
    printf 'model:\n'
    printf '  id: ggml-tiny\n'
    printf '  upstream: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin\n'
    printf '  license: MIT\n'
    printf '  bytes: %s\n' "$(stat -c'%s' "$PLAT_DIR/model/ggml-tiny.bin")"
    printf '  sha256: %s\n' "$(sha256sum "$PLAT_DIR/model/ggml-tiny.bin" | cut -d' ' -f1)"
    printf 'staged:\n'
    printf '  date: "%s"\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    printf '  by: scripts/test-stage-aligner-sidecar.sh\n'
    printf '  host: %s\n' "$(uname -srm)"
  } >"$PLAT_DIR/SIDECAR.yaml"
}

reset_payload() {
  rm -rf "$TEST_ROOT"
  mkdir -p "$PLAT_DIR/bin" "$PLAT_DIR/model"
  printf '#!/bin/sh\necho whisper-cli test stub\n' >"$PLAT_DIR/bin/whisper-cli"
  printf 'fake libwhisper payload bytes\n' >"$PLAT_DIR/bin/libwhisper.so.1"
  printf 'fake libggml payload bytes\n' >"$PLAT_DIR/bin/libggml.so.0"
  printf 'fake ggml-tiny weights (stub, not 77 MB)\n' >"$PLAT_DIR/model/ggml-tiny.bin"
  chmod 0755 "$PLAT_DIR/bin/"*
  chmod 0644 "$PLAT_DIR/model/"*
  write_manifest
}

reset_payload

# 1: the clean synthetic payload verifies.
check "1 clean payload verifies" "schema_version: 1" \
  "$SCRIPT" verify --payload-root "$TEST_ROOT"

# 2: one byte truncated from the model is caught, naming that path.
truncate -s -1 "$PLAT_DIR/model/ggml-tiny.bin"
expect_fail "2 truncated model rejected" "model/ggml-tiny.bin" \
  "$SCRIPT" verify --payload-root "$TEST_ROOT"

# 3: a same-size content change (one byte flipped) in a declared runtime
# file is caught through the declared sha256, not just the size.
reset_payload
printf 'X' | dd of="$PLAT_DIR/bin/libggml.so.0" bs=1 count=1 seek=2 conv=notrunc status=none
expect_fail "3 same-size content change rejected" "bin/libggml.so.0" \
  "$SCRIPT" verify --payload-root "$TEST_ROOT"

# 4: a file present under bin/ that SIDECAR.yaml does not declare is
# rejected: the manifest is the authoritative list of what ships.
reset_payload
printf 'unlisted extra\n' >"$PLAT_DIR/bin/stray-extra.so"
expect_fail "4 unlisted payload file rejected" "bin/stray-extra.so" \
  "$SCRIPT" verify --payload-root "$TEST_ROOT"

# 5: a declared entry replaced by a symlink is rejected (the Rust resolver
# in crates/speech-runtime/src/sidecar.rs rejects symlinks for the same
# reason).
reset_payload
rm "$PLAT_DIR/bin/libwhisper.so.1"
ln -s whisper-cli "$PLAT_DIR/bin/libwhisper.so.1"
expect_fail "5 symlink payload entry rejected" "libwhisper.so.1" \
  "$SCRIPT" verify --payload-root "$TEST_ROOT"

# 6: --platform windows-x64 is refused: only linux-x64 can be staged here.
expect_fail "6 windows-x64 platform refused" "only linux-x64" \
  "$SCRIPT" verify --payload-root "$TEST_ROOT" --platform windows-x64

# 7: stage refuses a /tmp payload root it cannot prove gitignored, BEFORE
# any clone/build/download work: nothing may be created at that path.
expect_fail "7 stage refuses non-ignored payload root" "ignored" \
  "$SCRIPT" stage --payload-root "$STAGE_TMP"
if [[ -e $STAGE_TMP ]]; then
  fail_test "7 stage created $STAGE_TMP before refusing"
fi
CHECKS=$((CHECKS + 1))

# 8: overlay passes the same gate and writes JSON (parses with json.load)
# whose resources map the absolute staged dir to aligner/linux-x64 and the
# repo's MIT notice to aligner/LICENSE.whisper-cpp.txt.
reset_payload
check "8a overlay succeeds for a verified payload" "cargo tauri build --config" \
  "$SCRIPT" overlay --payload-root "$TEST_ROOT" --out "$OVERLAY_OUT"
python3 -c \
  'import json,sys
r = json.load(open(sys.argv[1]))["bundle"]["resources"]
ok = any(k.endswith("/apps/desktop/sidecar-test/linux-x64") and r[k] == "aligner/linux-x64" for k in r)
ok = ok and any(k.endswith("/third-party/notices/whisper-cpp-MIT.txt") and r[k] == "aligner/LICENSE.whisper-cpp.txt" for k in r)
sys.exit(0 if ok else 1)' "$OVERLAY_OUT" ||
  fail_test "8b overlay at $OVERLAY_OUT is not valid JSON with the expected resource entries"
CHECKS=$((CHECKS + 1))

# 9: with the payload broken again (model re-truncated), overlay refuses and
# leaves NO overlay file at the output path.
truncate -s -1 "$PLAT_DIR/model/ggml-tiny.bin"
expect_fail "9a overlay refuses an unverifiable payload" "failed verification" \
  "$SCRIPT" overlay --payload-root "$TEST_ROOT" --out "$OVERLAY_BAD"
if [[ -e $OVERLAY_BAD ]]; then
  fail_test "9b overlay left an overlay file at $OVERLAY_BAD"
fi
CHECKS=$((CHECKS + 1))

printf 'OK: %d checks passed\n' "$CHECKS"
