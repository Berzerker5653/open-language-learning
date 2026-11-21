#!/usr/bin/env python3
# JA-B2-002 fix lane: content half of the ja ASR gate on the 3 re-baked clips.
# Same method as JA-B2-001 content-check.py (whisper large-v3-turbo, kana-fold compare).
import json, subprocess, difflib, re, sys
import pykakasi
k = pykakasi.Kakasi()
WG = "/home/hunter/game-dev/LTS/state/evidence/PACK-AUDIO-VERIFICATION-001/whisper-gate.sh"
MODEL = "/home/hunter/.cache/lts-bench/ggml-large-v3-turbo.bin"
PACK = "/home/hunter/game-dev/LTS/languages/ja-JP"
OUT = "/home/hunter/game-dev/LTS/state/evidence/JA-B2-002/asr-content.jsonl"
IDS = ["ja.sent.b2reg-soncho-okaeshi", "ja.sent.b2reg-wake-da-saiban", "ja.sent.b2reg-ashita-itsudemo-gozaimasu"]

def fold(s):
    s = re.sub(r"[^\u3041-\u309f\u30a1-\u30ff\u4e00-\u9fff]", "", s)
    return "".join(m["hira"] for m in k.convert(s))

texts = {}
for line in open(f"{PACK}/sentences/b2-register-2026-11-20.jsonl"):
    d = json.loads(line)
    if d["id"] in IDS:
        texts[d["id"]] = d["text"]

rows = []
for sid in IDS:
    text = texts[sid]
    wav = f"{PACK}/media/{sid}.wav"
    try:
        r = subprocess.run([WG, "-m", MODEL, "-l", "ja", "-np", "-nt", wav],
                           capture_output=True, text=True, timeout=180)
        heard = r.stdout.strip()
        rc = 0 if fold(heard) == fold(text) else round(1 - difflib.SequenceMatcher(None, fold(heard), fold(text)).ratio(), 3)
        rows.append({"id": sid, "text": text, "heard": heard, "rc": rc, "err": "" if r.returncode == 0 else r.stderr[:200]})
    except Exception as e:
        rows.append({"id": sid, "text": text, "heard": "", "rc": -1, "err": str(e)[:200]})
    print(rows[-1]["id"], "rc=", rows[-1]["rc"], flush=True)

with open(OUT, "w") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
bad = [r["id"] for r in rows if r["rc"] != 0]
print("SUMMARY rows=", len(rows), "exact-fold=", len(rows) - len(bad), "mismatch=", bad)
sys.exit(1 if bad else 0)
