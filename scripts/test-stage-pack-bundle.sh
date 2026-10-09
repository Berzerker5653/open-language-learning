#!/usr/bin/env bash
# Hermetic regression test for scripts/stage-pack-bundle.sh (K-59).
#
# That script is the only gate between a release bundle and an unvalidated
# or absent language pack, so its stage/overlay gates need a gate of their
# own. This test proves: staging a BROKEN pack (one corrupt unit YAML) fails
# and stages nothing; stage refuses a pack root git cannot prove ignored; a
# VALID fixture pack (tests/fixtures/packs/ja-demo) stages; the overlay
# emits valid JSON (parsed with python3 json.load) whose resources map ends
# with packs/<pack-id>; a re-run of stage is idempotent (verifies and
# keeps); stage writes a BUNDLED.yaml runtime sidecar (schema_version 1)
# naming each staged pack with its locale/maturity, upserting without
# duplicates; the overlay refuses when the staged copy is broken or when
# nothing is staged, and leaves no overlay file behind.
#
# The only cargo use is the workspace's own `langpack validate` (no test
# builds, no tauri); no network; the real staging root dist/variants/packs/
# is never touched: staged packs go to dist/variants/packs-test/
# (gitignored) and broken sources to /tmp, all removed by the EXIT trap.
set -euo pipefail
cd "$(dirname "$0")/.."

SCRIPT="scripts/stage-pack-bundle.sh"
FIXTURE="tests/fixtures/packs/ja-demo"
TEST_PACK_ROOT="dist/variants/packs-test"
PACK_ROOT="$TEST_PACK_ROOT/resources/packs"
STAGED="$PACK_ROOT/org.openlanguage.ja-demo"
BROKEN_SRC="/tmp/lts-pack-broken-$$"
BAD_ROOT="/tmp/lts-pack-root-not-ignored-$$"
OVERLAY_OUT="/tmp/lts-pack-overlay-$$.json"
OVERLAY_BAD="/tmp/lts-pack-overlay-bad-$$.json"

CHECKS=0

cleanup() {
  rm -rf "$TEST_PACK_ROOT" "$BROKEN_SRC" "$BAD_ROOT" "$OVERLAY_OUT" "$OVERLAY_BAD"
  # rmdir only: never removes a dist/ that holds a real build's output.
  rmdir dist/variants dist 2>/dev/null || true
}
trap cleanup EXIT

fail_test() { printf 'test-stage-pack-bundle: FAIL: %s\n' "$*" >&2; exit 1; }

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
# output (the failure must name the offending path, not just fail).
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

# 1: staging a broken pack fails — one corrupt unit YAML — and NOTHING is
# staged: the validate gate runs before the first byte is written.
rm -rf "$BROKEN_SRC"
cp -r "$FIXTURE" "$BROKEN_SRC"
printf 'id: "broken: [\n' >>"$BROKEN_SRC/curriculum/units/010-kana-hiragana.yaml"
expect_fail "1a broken pack refused by install-mode validate" \
  "010-kana-hiragana.yaml" \
  "$SCRIPT" stage --pack-dir "$BROKEN_SRC" --pack-root "$PACK_ROOT"
if [[ -e $STAGED ]]; then
  fail_test "1b broken pack staged at $STAGED"
fi
CHECKS=$((CHECKS + 1))

# 2: stage refuses a /tmp pack root it cannot prove gitignored, BEFORE any
# validate work: nothing may be created at that path.
expect_fail "2a stage refuses non-ignored pack root" "ignored" \
  "$SCRIPT" stage --pack-dir "$FIXTURE" --pack-root "$BAD_ROOT"
if [[ -e $BAD_ROOT ]]; then
  fail_test "2b stage created $BAD_ROOT before refusing"
fi
CHECKS=$((CHECKS + 1))

# 3: the valid fixture pack stages under <pack-root>/<pack-id>, id read
# from the pack's own manifest.yaml.
check "3a valid fixture pack stages" "staged pack org.openlanguage.ja-demo" \
  "$SCRIPT" stage --pack-dir "$FIXTURE" --pack-root "$PACK_ROOT"
[[ -f $STAGED/manifest.yaml ]] || fail_test "3b staged copy missing manifest.yaml"
grep -q '^schema_version: 1$' "$PACK_ROOT/BUNDLED.yaml" &&
  grep -q 'pack_id: org.openlanguage.ja-demo' "$PACK_ROOT/BUNDLED.yaml" &&
  grep -q 'maturity: experimental' "$PACK_ROOT/BUNDLED.yaml" ||
  fail_test "3c stage did not record the pack in a schema-1 BUNDLED.yaml sidecar"

# 4: re-running stage is idempotent: it verifies and KEEPS the staged copy
# (no error, and the copy is still intact).
check "4a stage re-run verifies and keeps" "already staged" \
  "$SCRIPT" stage --pack-dir "$FIXTURE" --pack-root "$PACK_ROOT"
[[ -f $STAGED/manifest.yaml ]] || fail_test "4b staged copy lost after re-run"
[[ $(grep -c 'pack_id: org.openlanguage.ja-demo' "$PACK_ROOT/BUNDLED.yaml") == 1 ]] ||
  fail_test "4c sidecar entry duplicated by a re-stage"

# 5: overlay passes the same gate over the staged copy and writes JSON
# (parses with json.load) whose resources map the absolute staged dir to
# packs/<pack-id>.
check "5a overlay succeeds for staged+validated content" "cargo tauri build --config" \
  "$SCRIPT" overlay --pack-root "$PACK_ROOT" --out "$OVERLAY_OUT"
python3 -c \
  'import json,sys
r = json.load(open(sys.argv[1]))["bundle"]["resources"]
ok = any(k.endswith("/dist/variants/packs-test/resources/packs/org.openlanguage.ja-demo") and
         r[k] == "packs/org.openlanguage.ja-demo" for k in r)
sys.exit(0 if ok else 1)' "$OVERLAY_OUT" ||
  fail_test "5b overlay at $OVERLAY_OUT is not valid JSON with the expected resource entry"
CHECKS=$((CHECKS + 1))

# 5c: the sidecar itself must be a resource: bundled_packs() reads
# resource_dir/packs/BUNDLED.yaml first and fails closed without it.
python3 -c \
  'import json,sys
r = json.load(open(sys.argv[1]))["bundle"]["resources"]
ok = any(k.endswith("/packs/BUNDLED.yaml") and r[k] == "packs/BUNDLED.yaml" for k in r)
sys.exit(0 if ok else 1)' "$OVERLAY_OUT" ||
  fail_test "5c overlay does not bundle the BUNDLED.yaml sidecar the runtime loader requires"
CHECKS=$((CHECKS + 1))

# 6: with the STAGED copy corrupted (valid file, invalid pack content),
# overlay re-validates, refuses, and leaves NO overlay file at the output
# path.
printf 'bogus_unit_id_violation: "@@"\n' >>"$STAGED/curriculum/units/010-kana-hiragana.yaml"
expect_fail "6a overlay refuses an unvalidated staged copy" \
  "010-kana-hiragana.yaml" \
  "$SCRIPT" overlay --pack-root "$PACK_ROOT" --out "$OVERLAY_BAD"
if [[ -e $OVERLAY_BAD ]]; then
  fail_test "6b overlay left an overlay file at $OVERLAY_BAD"
fi
CHECKS=$((CHECKS + 1))

# 7: overlay refuses when nothing is staged.
rm -rf "$PACK_ROOT"
expect_fail "7a overlay refuses when nothing staged" "nothing staged" \
  "$SCRIPT" overlay --pack-root "$PACK_ROOT" --out "$OVERLAY_BAD"
if [[ -e $OVERLAY_BAD ]]; then
  fail_test "7b overlay left an overlay file at $OVERLAY_BAD"
fi
CHECKS=$((CHECKS + 1))

# 8: a second pack stages with an explicit maturity and upserts beside the
# first: the sidecar the shipped app reads lists both, each once, with the
# locale/maturity it was given — the runtime refuses to guess these.
check "8a second pack stages with explicit maturity" "staged pack org.openlanguage.ja-demo" \
  "$SCRIPT" stage --pack-dir "$FIXTURE" --pack-root "$PACK_ROOT" --locale xx-XX --maturity community
python3 -c \
  'import sys,re
t = open(sys.argv[1]).read()
if not t.startswith("schema_version: 1"): sys.exit(1)
entries = re.findall(r"pack_id: (\S+)\n    locale: (\S+)\n    maturity: (\S+)", t)
ids = [e[0] for e in entries]
ok = ids.count("org.openlanguage.ja-demo") == 1
e = [x for x in entries if x[0] == "org.openlanguage.ja-demo"][0]
ok = ok and e[1] == "xx-XX" and e[2] == "community"
sys.exit(0 if ok else 1)' "$PACK_ROOT/BUNDLED.yaml" ||
  fail_test "8b sidecar lost entries or guessed locale/maturity"
CHECKS=$((CHECKS + 1))

printf 'OK: %d checks passed\n' "$CHECKS"
