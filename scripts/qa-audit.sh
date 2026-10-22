#!/usr/bin/env bash
# Full-corpus audio audit driver (PACK-AUDIO-VERIFICATION-001).
# Runs the three gates over a pack and writes JSONL records + a union of
# FAIL ids for the repair loop. CPU-only; safe to run while the GPU is
# booked. Usage:
#   ASR_MODEL=<ggml.bin> WHISPER=<whisper-cli> bash scripts/qa-audit.sh \
#       languages/ru-RU ru [ids-file]
set -u
pack=${1:?pack dir}
asr_lang=${2:?asr lang (ru|ja)}
ids=${3:-}
repo=$(cd "$(dirname "$0")/.." && pwd)
out_dir=${OUT_DIR:-state/evidence/PACK-AUDIO-VERIFICATION-001}
mkdir -p "$out_dir"
name=$(basename "$pack")
idargs=()
[ -n "$ids" ] && idargs=(--ids-file "$ids")

fail_total=0
echo "[qa-audit] $name: qa-segments"
"$repo/.venv/bin/python" "$repo/scripts/qa-segments.py" --pack "$pack" \
    "${idargs[@]}" --out "$out_dir/segments-$name.jsonl" \
    >"$out_dir/segments-$name.log" 2>&1; rc=$?
echo "  segments rc=$rc"

echo "[qa-audit] $name: qa-asr"
    asrargs=()
    [ -n "$ids" ] && asrargs=(--ids "$ids")
    "$repo/.venv/bin/python" "$repo/scripts/qa-asr.py" --pack "$pack" \
        --model "$ASR_MODEL" --lang "$asr_lang" --whisper "$WHISPER" \
        --workers 6 "${asrargs[@]}" --out "$out_dir/asr-$name.jsonl" \
    >"$out_dir/asr-$name.log" 2>&1; rc2=$?
echo "  asr rc=$rc2"

echo "[qa-audit] $name: qa-pron"
HF_HUB_OFFLINE=1 OMP_NUM_THREADS=${QA_THREADS:-8} \
    ~/.venvs/qwen-tts/bin/python "$repo/scripts/qa-pron.py" --pack "$pack" \
    "${idargs[@]}" --out "$out_dir/pron-$name.jsonl" \
    >"$out_dir/pron-$name.log" 2>&1; rc3=$?
echo "  pron rc=$rc3"

"$repo/.venv/bin/python" - "$out_dir" "$name" <<'EOF'
import json, sys
out_dir, name = sys.argv[1], sys.argv[2]
bad = set()
for gate in ("segments", "asr", "pron"):
    p = f"{out_dir}/{gate}-{name}.jsonl"
    try:
        for line in open(p):
            r = json.loads(line)
            if r.get("verdict") == "FLAG":
                bad.add(r["id"])
    except FileNotFoundError:
        print(f"[qa-audit] missing {p}")
with open(f"{out_dir}/repair-ids-{name}.txt", "w") as f:
    f.write("\n".join(sorted(bad)) + ("\n" if bad else ""))
print(f"[qa-audit] {name}: {len(bad)} clips flagged by >=1 gate "
      f"-> {out_dir}/repair-ids-{name}.txt")
EOF
