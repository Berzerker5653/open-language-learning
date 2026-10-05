#!/usr/bin/env bash
# Score an LLM-authored pack against the real toolchain gates.
# Usage: ./experiments/llm-pack-authoring/score.sh <pack-dir> [run-label]
# Writes per-gate output under experiments/llm-pack-authoring/results/<label>/
# and prints a PASS/FAIL summary. Exit 0 only if every gate passes.
set -uo pipefail
cd "$(dirname "$0")/../.."

PACK="${1:?usage: score.sh <pack-dir> [label]}"
LABEL="${2:-$(date +%Y%m%d-%H%M%S)}"
OUT="experiments/llm-pack-authoring/results/$LABEL"
mkdir -p "$OUT"

CLI=(cargo run -q -p lts-langpack-cli --)
STATUS=0

run_gate() {
  local name="$1"; shift
  if "${CLI[@]}" "$@" "$PACK" > "$OUT/$name.txt" 2>&1; then
    echo "PASS  $name"
  else
    echo "FAIL  $name"
    STATUS=1
  fi
}

echo "== scoring $PACK (label: $LABEL) =="
run_gate validate          validate
run_gate lint              lint
run_gate audit-curriculum  audit-curriculum
run_gate audit-sources     audit-sources
run_gate audit-lexicon    audit-lexicon
run_gate audit-licenses    audit-licenses
run_gate test              test
if "${CLI[@]}" build "$PACK" -o "$OUT/pack.lpk" > "$OUT/build.txt" 2>&1; then
  echo "PASS  build"
  "${CLI[@]}" inspect "$OUT/pack.lpk" > "$OUT/inspect.txt" 2>&1
else
  echo "FAIL  build"; STATUS=1
fi

echo "== details in $OUT =="
exit $STATUS
