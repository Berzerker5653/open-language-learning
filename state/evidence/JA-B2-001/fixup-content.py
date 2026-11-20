#!/usr/bin/env python3
# JA-B2-001: refresh asr-content.jsonl row for the re-taken clip + adjudicate fold artifacts.
import json, subprocess, re, difflib, wave
import pykakasi
k = pykakasi.Kakasi()
REPO = "/home/hunter/game-dev/LTS"
WG = f"{REPO}/state/evidence/PACK-AUDIO-VERIFICATION-001/whisper-gate.sh"
MODEL = "/home/hunter/.cache/lts-bench/ggml-large-v3-turbo.bin"

def fold(s):
    s = re.sub(r"[^\u3041-\u309f\u30a1-\u30ff\u4e00-\u9fff]", "", s)
    return "".join(m["hira"] for m in k.convert(s))

p = f"{REPO}/state/evidence/JA-B2-001/asr-content.jsonl"
rows = [json.loads(l) for l in open(p)]
sid = "ja.sent.b2reg-shinjitsu-toiu-mono"
r = subprocess.run([WG, "-m", MODEL, "-l", "ja", "-np", "-nt",
                    f"{REPO}/languages/ja-JP/media/{sid}.wav"], capture_output=True, text=True)
heard = r.stdout.strip()
for r_ in rows:
    if r_["id"] == sid:
        exp = r_["text"]
        r_["heard"] = heard
        r_["rc"] = round(1 - difflib.SequenceMatcher(None, fold(exp), fold(heard)).ratio(), 3)
        r_["note"] = "re-taken: first take lost the topic は (whisper heard no は in two transcriptions); retake heard complete"
    if r_["id"] == "ja.sent.b2reg-jouhou-dake-dewa":
        r_["adjudication"] = "content correct: whisper heard 情報だけでは反応が不足です; fold diff is pykakasi dictionary reading 不足->ふそく vs pack kana ぶそく"
    if r_["id"] == "ja.sent.b2reg-anou-mouichido-onegai":
        r_["adjudication"] = "content correct: heard あのー vs written あのう is the same interjection (long-vowel spelling variant)"
with open(p, "w") as fh:
    for r_ in rows:
        fh.write(json.dumps(r_, ensure_ascii=False) + "\n")
print("rebaked row rc:", next(x["rc"] for x in rows if x["id"] == sid))

def mora(s): return len(re.sub(r"[\s、。？?]", "", s))
vals = []
for l in open(f"{REPO}/languages/ja-JP/sentences/b2-register-2026-11-20.jsonl"):
    d = json.loads(l)
    with wave.open(f"{REPO}/languages/ja-JP/media/{d['id']}.wav") as wf:
        dur = wf.getnframes() / wf.getframerate()
    vals.append(round(dur / mora(d["text"]), 3))
print("s/mora n=%d min=%.3f mean=%.3f max=%.3f" % (len(vals), min(vals), sum(vals)/len(vals), max(vals)))
