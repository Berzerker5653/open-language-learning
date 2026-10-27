#!/bin/sh
# PACK-AUDIO-VERIFICATION-001 - re-gate the round-1 harvested winners on THIS
# box's recognizer build (the obligation recorded in gate-identity-2026-10-27.txt
# after the 120-clip recert measured 119/120 agreement across two different
# whisper.cpp builds).
#
# Round 1 certified these ids with Omarchy's whisper.cpp (`7e26d3b`,
# `d9919437…`); the audio now lives here and every later verdict is produced by
# this box's build (`60c0be6`, `79b96a71…`). A cert that cannot be reproduced by
# the shipping gate is not a cert, so every harvested winner gets re-run through
# both certifying gates here and the deltas come out as a named, dispositionable
# list instead of an assumed 0.
#
#   sh regate-harvest.sh                  full set (1,101 ids), after the bake
#   LIMIT=10 OUTDIR=/tmp/regate-smoke sh regate-harvest.sh --force
#                                         small validation run anywhere
#
# Cost: ~2 h CPU at the measured 510-580 clips/h with --workers 4, which is why
# it refuses to run while a bake is alive: the two compete for the same cores
# and the bake is the thing with a queue.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="/home/hunter/game-dev/LTS"
PY="$HOME/.venvs/qwen-tts/bin/python"
[ -x "$PY" ] || PY=python3
TURBO="$HOME/.cache/lts-bench/ggml-large-v3-turbo.bin"
WHISPER="$HERE/whisper-gate.sh"
DATE="${DATE:-$(date +%F)}"
OUTDIR="${OUTDIR:-$HERE/local-regate-$DATE}"
WORKERS="${WORKERS:-4}"
LIMIT="${LIMIT:-0}"
FORCE=${1:-}
cd "$HERE" || exit 1

if [ "$FORCE" != "--force" ] && pgrep -f "bake-bestof.py" >/dev/null 2>&1; then
  echo "a bake is running; the re-gate competes for the same cores. Finish the" >&2
  echo "queue first, or pass --force for a small validation run." >&2
  exit 1
fi
mkdir -p "$OUTDIR"

for lang in ja ru; do
  pack=$([ "$lang" = ja ] && echo ja-JP || echo ru-RU)
  "$PY" - "$HERE" "$lang" "$LIMIT" "$OUTDIR" <<'PYEOF'
import json, os, sys
here, lang, limit, outdir = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
ids = []
for line in open(f"{here}/bestof-{lang}.jsonl", encoding="utf-8"):
    if not line.strip():
        continue
    r = json.loads(line)
    if r["result"] != "exhausted":
        ids.append(r["id"])
if limit:
    ids = ids[:limit]
path = f"{outdir}/ids-{lang}.txt"
open(path, "w", encoding="utf-8").write("".join(i + "\n" for i in ids))
print(f"{lang}: {len(ids)} round-1 certified ids -> {path}")
PYEOF

  echo "-- $pack: ASR round-trip (workers=$WORKERS)"
  "$PY" "$REPO/scripts/qa-asr.py" --pack "$REPO/languages/$pack" --model "$TURBO" \
      --whisper "$WHISPER" --lang "$lang" --workers "$WORKERS" \
      --ids "$OUTDIR/ids-$lang.txt" --out "$OUTDIR/asr-$lang.jsonl" \
      > "$OUTDIR/asr-$lang.log" 2>&1
  tail -1 "$OUTDIR/asr-$lang.log"

  echo "-- $pack: structure gate"
  "$PY" "$REPO/scripts/qa-segments.py" --pack "$REPO/languages/$pack" \
      --ids-file "$OUTDIR/ids-$lang.txt" --out "$OUTDIR/segments-$lang.jsonl" \
      > "$OUTDIR/segments-$lang.log" 2>&1
  tail -1 "$OUTDIR/segments-$lang.log"
done

echo "-- deltas"
"$PY" - "$HERE" "$OUTDIR" "$DATE" <<'PYEOF'
import json, os, re, sys
here, outdir, date = sys.argv[1], sys.argv[2], sys.argv[3]
pin_txt = ""
pins = f"{here}/gate-identity-2026-10-27.txt"
if os.path.exists(pins):
    for line in open(pins, encoding="utf-8"):
        if line.startswith("|") and re.search(r"(GamingPC|Omarchy)", line):
            sha = re.findall(r"`([0-9a-f]{6,})`", line)
            who = re.search(r"(GamingPC|Omarchy)", line).group(1)
            ver = line.rstrip().strip("|").split("|")[-1].strip()
            if len(sha) >= 2:
                pin_txt += (f"* {who}: whisper.cpp build `{sha[0]}`, model sha "
                            f"`{sha[1]}` ({ver})\n")
if not pin_txt:
    pin_txt = "* see gate-identity-2026-10-27.txt\n"
box = {}
for lang in ("ja", "ru"):
    for line in open(f"{here}/bestof-{lang}.jsonl", encoding="utf-8"):
        if line.strip():
            r = json.loads(line)
            box[r["id"]] = r["result"]
recs = []
for lang in ("ja", "ru"):
    seg = {}
    p = f"{outdir}/segments-{lang}.jsonl"
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            if line.strip():
                r = json.loads(line)
                seg[r["id"]] = r.get("verdict")
    a = f"{outdir}/asr-{lang}.jsonl"
    if not os.path.exists(a):
        continue
    for line in open(a, encoding="utf-8"):
        if not line.strip():
            continue
        r = json.loads(line)
        rec = {"id": r["id"], "pack": "ja-JP" if lang == "ja" else "ru-RU",
               "box_result": box.get(r["id"]), "local_asr_status": r["status"],
               "local_asr_ratio": r.get("ratio"), "local_heard": r.get("heard"),
               "local_segments_verdict": seg.get(r["id"])}
        recs.append(rec)
open(f"{outdir}/reconcile.jsonl", "w", encoding="utf-8").write(
    "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in recs))
deltas = [x for x in recs
          if x["local_asr_status"] != "ok" or x["local_segments_verdict"] == "FLAG"]
open(f"{outdir}/deltas.jsonl", "w", encoding="utf-8").write(
    "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in deltas))
print(f"{len(recs)} ids re-gated here | {len(deltas)} that this box's gate will NOT pass")
for x in deltas[:20]:
    print(f"  {x['id']}  box={x['box_result']}  asr={x['local_asr_status']}"
          f" ratio={x['local_asr_ratio']}  segments={x['local_segments_verdict']}"
          f"  heard={x['local_heard']!r}")
md = [f"# Round-1 harvest re-gate on GamingPC ({date})", "",
      "Every round-1 certified winner re-run through both certifying gates with",
      "THIS box's recognizer build: the round-1 certs were made by a different",
      "whisper.cpp build and the recert measured 119/120 agreement, so a cert",
      "this box cannot reproduce is not a cert. A clip listed below is one this",
      "box's shipping gate will not pass; it goes to the same disposition path",
      "as a round-2 exhaustion.", "", "Builds:", pin_txt.rstrip("\n"), "",
      f"**{len(recs)} ids re-gated | {len(deltas)} deltas**", "",
      "| id | pack | round-1 result | local ASR | ratio | local segments |",
      "| --- | --- | --- | --- | --- | --- |"]
md += [f"| {x['id']} | {x['pack']} | {x['box_result']} | {x['local_asr_status']} "
       f"| {x['local_asr_ratio']} | {x['local_segments_verdict']} |" for x in deltas]
open(f"{outdir}/REGATE-{date}.md", "w", encoding="utf-8").write("\n".join(md) + "\n")
PYEOF

printf '\nwrite-up: %s\n' "$OUTDIR/REGATE-$DATE.md"
printf 'pin the build that produced these verdicts (gate-identity-2026-10-27.txt).\n'
