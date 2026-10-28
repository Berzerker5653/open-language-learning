#!/bin/sh
# PACK-AUDIO-VERIFICATION-001 - round 4: repair the clips the whole-corpus ASR
# re-audit caught that no campaign record explains.
#
# The re-audit (`reaudit-asr.sh`) re-listens to every manifest row with the
# pinned recognizer build. Its failures split into three kinds, and only one
# kind is new work:
#   * already in the disposition packet  -> the owner's to decide, no bake;
#   * certified by rounds 1-3            -> a contradiction: the gate that
#                                           installed the clip now rejects it
#                                           (this has not happened: 0 so far);
#   * neither                            -> THIS round bakes those.
#
# Same discipline as round 2: 25-id batches, per-id checkpoints inside
# bake-bestof.py, one git commit per settled batch, `--skip-done` so a stop
# costs one batch and never the run. It waits for the re-audit to finish rather
# than competing with it for cores.
#
#   setsid nohup sh round4-chain.sh > round4.log 2>&1 < /dev/null &
#   Stop: pkill -f round4-chain.sh, then pkill -f bake-bestof.py
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="/home/hunter/game-dev/LTS"
PY="$HOME/.venvs/qwen-tts/bin/python"
[ -x "$PY" ] || PY=python3
BAKE="$REPO/scripts/bake-bestof.py"
TURBO="$HOME/.cache/lts-bench/ggml-large-v3-turbo.bin"
WHISPER="$HERE/whisper-gate.sh"
DATE="${DATE:-$(date +%F)}"
AUDIT="$HERE/full-audit-$DATE"
K_JA=6
K_RU=8
BATCH=25
LOG="$HERE/round4.log"
say() { echo "[$(date -Is)] $*" >> "$LOG"; }

cd "$HERE" || exit 1

# ---- wait for the re-audit to finish --------------------------------------
while pgrep -f "reaudit-asr.sh" >/dev/null 2>&1; do sleep 60; done
say "re-audit finished; selecting round-4 candidates"

# ---- candidates: fails no campaign record explains -------------------------
"$PY" - "$HERE" "$AUDIT" "$BATCH" <<'PYEOF' || { say "candidate selection failed"; exit 1; }
import glob, json, os, sys
here, audit, batch = sys.argv[1], sys.argv[2], int(sys.argv[3])
def load(p):
    return [json.loads(l) for l in open(p, encoding="utf-8", errors="replace") if l.strip()]
cert, pkt = {}, {}
for lang, pack in (("ja", "ja-JP"), ("ru", "ru-RU")):
    cert[pack], pkt[pack] = set(), set()
    for f in [f"{here}/bestof-{lang}.jsonl"] + sorted(glob.glob(f"{here}/bestof-{lang}-r[234]-*.jsonl")):
        if not os.path.exists(f):
            continue
        for r in load(f):
            (pkt[pack] if r["result"] == "exhausted" else cert[pack]).add(r["id"])
os.makedirs(f"{here}/retry-batches", exist_ok=True)
for pack, lang in (("ja-JP", "ja"), ("ru-RU", "ru")):
    p = f"{audit}/asr-{pack}.jsonl"
    if not os.path.exists(p):
        print(f"{pack}: no audit output, skipping")
        continue
    ids = sorted(r["id"] for r in load(p)
                 if r.get("status") != "ok"
                 and r["id"] not in cert[pack] and r["id"] not in pkt[pack])
    n = 0
    for i in range(0, len(ids), batch):
        f = f"{here}/retry-batches/{lang}-r4-b{n:02d}.txt"
        open(f, "w", encoding="utf-8").write("".join(x + "\n" for x in ids[i:i + batch]))
        n += 1
    print(f"{pack}: {len(ids)} unexplained failures -> {n} batch files")
PYEOF

settled() { grep -c . "$1" 2>/dev/null || echo 0; }
tally() { "$PY" -c "
import json,sys
c=[json.loads(l) for l in open(sys.argv[1],encoding='utf-8') if l.strip()]
print(f'{sum(1 for r in c if r[\"result\"]!=\"exhausted\")} solved / {sum(1 for r in c if r[\"result\"]==\"exhausted\")} exhausted')" "$1"; }

batch_run() {   # $1=pack dir  $2=batch file  $3=K  $4=language  $5=lang code  $6=label
  total=$(grep -c . "retry-batches/$2" 2>/dev/null || echo 0)
  [ "${total:-0}" -eq 0 ] && return 0
  out="bestof-${2%.txt}.jsonl"
  before=$(settled "$out")
  [ "$before" -ge "$total" ] && { say "$6: already complete ($before/$total)"; return 0; }
  avail_gb=$(awk '/MemAvailable/{print int($2/1048576)}' /proc/meminfo)
  cap=$(( (avail_gb - 6) / 8 )); [ "$cap" -lt 1 ] && cap=1
  jobs=$cap; threads=$(( 32 / jobs )); [ "$threads" -lt 2 ] && threads=2
  say "$6: $before/$total settled, baking (K=$3, jobs=$jobs, threads/job=$threads)"
  env OMP_NUM_THREADS=$threads MKL_NUM_THREADS=$threads OPENBLAS_NUM_THREADS=$threads \
      "$PY" "$BAKE" --pack "$REPO/$1" --ids "$HERE/retry-batches/$2" --k "$3" \
      --language "$4" --lang "$5" --asr-model "$TURBO" --whisper "$WHISPER" \
      --jobs "$jobs" --out "$out" --skip-done >> "${out%.jsonl}.log" 2>&1
  after=$(settled "$out")
  say "$6: settled $after/$total -> $(tally "$out")"
  ( cd "$REPO" && git add "$1/media/manifest.jsonl" \
      "state/evidence/PACK-AUDIO-VERIFICATION-001/$out" \
      "state/evidence/PACK-AUDIO-VERIFICATION-001/${out%.jsonl}.log" \
      "state/evidence/PACK-AUDIO-VERIFICATION-001/retry-batches/$2" \
      && git commit -q -m "fix(PACK-AUDIO-VERIFICATION-001): round-4 bake $(basename "${2%.txt}") $(tally "$out")" ) \
    && say "$6: committed" || say "$6: git commit failed (nothing staged?)"
}

# ---- bake, ja then ru ------------------------------------------------------
for p in retry-batches/ja-r4-b*.txt; do
  [ -f "$p" ] || continue
  f=${p#retry-batches/}
  batch_run languages/ja-JP "$f" "$K_JA" japanese ja "ja $f" || exit 1
done
for p in retry-batches/ru-r4-b*.txt; do
  [ -f "$p" ] || continue
  f=${p#retry-batches/}
  batch_run languages/ru-RU "$f" "$K_RU" russian ru "ru $f" || exit 1
done

# ---- re-prove and re-package the evidence ----------------------------------
say "round 4 done; re-running close-out"
sh close-round2.sh >> "$LOG" 2>&1
say "round 4 complete"
echo "next: sh reaudit-asr.sh   (re-listen to the changed rows under the pinned build)"
echo "then: the owner packet (EXHAUSTED-*.md / disposition-*.csv) is regenerated by close-round2.sh"
