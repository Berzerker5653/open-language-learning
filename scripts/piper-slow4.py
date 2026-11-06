#!/usr/bin/env python3
"""Slow-tempo piper retry for the 4 truly-stubborn ru clips."""
import json, subprocess, importlib.util, itertools
from pathlib import Path

REPO = Path("/home/hunter/game-dev/LTS")
spec = importlib.util.spec_from_file_location("qa", str(REPO / "scripts/qa-asr.py"))
assert spec and spec.loader
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
EV = REPO / "state/evidence/PACK-AUDIO-VERIFICATION-001"
CAND = EV / "piper-candidates"
rows = {}
for line in (REPO / "languages/ru-RU/media/manifest.jsonl").read_text(encoding="utf-8").splitlines():
    r = json.loads(line)
    rows[r["id"]] = r
ids = ["ru.lex.timeplans.iyul", "ru.lex.comparisons.iz-za",
       "ru.lex.synthesis4.kolllazh", "ru.lex.synthesis4.ssuda"]
gate = str(EV / "whisper-gate.sh")
model = str(Path.home() / ".cache/lts-bench/ggml-large-v3-turbo.bin")
PIPER = str(Path.home() / ".venvs/piper-tts/bin/piper")
VD = str(Path.home() / ".cache/piper-voices")

out = []
for cid in ids:
    text = rows[cid]["text"]
    won = None
    for voice, ls in itertools.product(
            ["ru_RU-ruslan-medium", "ru_RU-irina-medium", "ru_RU-denis-medium", "ru_RU-dmitri-medium"],
            [1.0, 1.3, 1.6]):
        wav = CAND / f"{cid}.wav"
        p = subprocess.run([PIPER, "-m", f"{VD}/{voice}.onnx", "--length-scale", str(ls), "-f", str(wav)],
                           input=text, capture_output=True, text=True, timeout=120)
        if p.returncode:
            continue
        a = subprocess.run([gate, "-m", model, "-l", "ru", "-np", "-nt", str(wav)],
                           capture_output=True, text=True, timeout=300)
        ok, ratio, _, _ = qa.verdict(text, a.stdout.strip(), "ru")
        print(f"{cid} {voice} ls{ls} -> {a.stdout.strip()!r} ratio={ratio:.2f} {'PASS' if ok else 'fail'}", flush=True)
        if ok:
            won = f"{voice}@ls{ls}"
            break
    print(f"== {cid}: {won or 'STILL FAILING'}", flush=True)
    if won:
        out.append(cid)
(EV / "slowwin.txt").write_text("\n".join(out) + ("\n" if out else ""))
print("saved winners:", out, flush=True)
