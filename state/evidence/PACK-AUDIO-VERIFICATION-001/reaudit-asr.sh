#!/bin/sh
# PACK-AUDIO-VERIFICATION-001 - full-corpus ASR re-audit under THIS box's
# shipping gate (the last open certification obligation).
#
# Why: every voice line must carry a cert produced by the recognizer that will
# judge it at release. The 9,758 rows of ja-JP + ru-RU were ASR-audited across
# several runs and builds; round 2 re-certified only the 382-clip residue, and
# `regate-harvest.sh` re-certifies only the 1,101 round-1 winners. The remaining
# rows (the clips that passed ASR on their original baked take) still carry a
# cert from a different whisper.cpp build. `gate-identity-2026-10-27.txt`
# measured 119/120 agreement between those builds, so this is expected to be a
# small delta - but "expected small" is not a cert.
#
#   sh reaudit-asr.sh                 both packs, workers clamped by MemAvailable
#   PACKS=ja-JP sh reaudit-asr.sh    one pack
#
# Cost at the measured 510-580 clips/h per worker-set of 4: ~5 h per pack.
# `qa-asr.py` checkpoints every verdict as it settles (pinned by
# `scripts/test_qa_asr.py`), so a stop costs the unfinished clips only, and a
# restart resumes inside the same pack.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="/home/hunter/game-dev/LTS"
PY="$HOME/.venvs/qwen-tts/bin/python"
[ -x "$PY" ] || PY=python3
TURBO="$HOME/.cache/lts-bench/ggml-large-v3-turbo.bin"
WHISPER="$HERE/whisper-gate.sh"
DATE="${DATE:-$(date +%F)}"
OUTDIR="${OUTDIR:-$HERE/full-audit-$DATE}"
PACKS="${PACKS:-ja-JP ru-RU}"
WANTED="${WORKERS:-4}"
FORCE=${1:-}
cd "$HERE" || exit 1

if [ "$FORCE" != "--force" ] && pgrep -f "bake-bestof.py" >/dev/null 2>&1; then
  echo "a bake is running; the audit competes for the same cores." >&2
  exit 1
fi
mkdir -p "$OUTDIR"

# Same guard the bake chain uses: one live whisper tree + driver peaks near 8 GB.
avail_gb=$(awk '/MemAvailable/{print int($2/1048576)}' /proc/meminfo)
cap=$(( (avail_gb - 6) / 8 )); [ "$cap" -lt 1 ] && cap=1
[ "$WANTED" -gt "$cap" ] && WORKERS=$cap || WORKERS=$WANTED
echo "workers=$WORKERS (requested $WANTED, MemAvailable ${avail_gb} GB)"

for pack in $PACKS; do
  lang=$([ "$pack" = ja-JP ] && echo ja || echo russian)
  echo "-- $pack: ASR round-trip over every manifest row"
  "$PY" "$REPO/scripts/qa-asr.py" --pack "$REPO/languages/$pack" --model "$TURBO" \
      --whisper "$WHISPER" --lang "$lang" --workers "$WORKERS" \
      --out "$OUTDIR/asr-$pack.jsonl" > "$OUTDIR/asr-$pack.log" 2>&1
  tail -1 "$OUTDIR/asr-$pack.log"
done

echo "-- reconciliation against the campaign sets"
"$PY" - "$HERE" "$OUTDIR" "$DATE" <<'PYEOF'
import glob, json, os, sys
here, outdir, date = sys.argv[1], sys.argv[2], sys.argv[3]
def load(p):
    return [json.loads(l) for l in open(p, encoding="utf-8", errors="replace") if l.strip()]
certified, exhausted = {}, {}
for pack, lang in (("ja-JP", "ja"), ("ru-RU", "ru")):
    certified[pack], exhausted[pack] = set(), set()
    for f in [f"{here}/bestof-{lang}.jsonl"] + sorted(glob.glob(f"{here}/bestof-{lang}-r2-*.jsonl")):
        for r in load(f):
            (exhausted if r["result"] == "exhausted" else certified)[pack].add(r["id"])
rows, fails = 0, []
for pack in ("ja-JP", "ru-RU"):
    seg = {r["id"]: r.get("verdict") for r in load(f"{outdir}/segments-{pack}.jsonl")} \
        if os.path.exists(f"{outdir}/segments-{pack}.jsonl") else {}
    p = f"{outdir}/asr-{pack}.jsonl"
    if not os.path.exists(p):
        print(f"{pack}: no audit output")
        continue
    for r in load(p):
        rows += 1
        bad_asr = r["status"] != "ok"
        bad_seg = seg.get(r["id"]) == "FLAG"
        if bad_asr or bad_seg:
            fails.append({"id": r["id"], "pack": pack, "asr_status": r["status"],
                          "asr_ratio": r.get("ratio"), "heard": r.get("heard"),
                          "segments": seg.get(r["id"]),
                          "in_bestof_certified": r["id"] in certified[pack],
                          "in_disposition_packet": r["id"] in exhausted[pack]})
open(f"{outdir}/audit-fails.jsonl", "w", encoding="utf-8").write(
    "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in fails))
fresh = [x for x in fails if not x["in_bestof_certified"] and not x["in_disposition_packet"]]
print(f"{rows} rows audited | {len(fails)} fail the current gate | "
      f"{len(fresh)} that no campaign record explains")
for x in fresh[:25]:
    print(f"  {x['id']}  asr={x['asr_status']} ratio={x['asr_ratio']} "
          f"segments={x['segments']} heard={x['heard']!r}")
PYEOF
echo "fails list: $OUTDIR/audit-fails.jsonl"
