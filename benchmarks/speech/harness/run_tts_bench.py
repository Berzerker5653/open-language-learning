#!/usr/bin/env python3
"""TTS-001 benchmark: local Japanese TTS wall time / RTF (protocol tts-0.1.0).

Stdlib only. Vendor artifacts under $LTS_BENCH_VENDOR (default
~/.cache/lts-bench): sherpa-onnx bin + kokoro-multi-lang-v1_0.
Writes results/<UTC>/summary.json. Audio is generated per run and NOT
committed.
"""
import json
import os
import subprocess
import sys
import time
import wave
from datetime import datetime, timezone

VENDOR = os.environ.get("LTS_BENCH_VENDOR", os.path.expanduser("~/.cache/lts-bench"))
BIN = os.path.join(VENDOR, "sherpa-onnx-v1.13.8-linux-x64-shared", "bin", "sherpa-onnx-offline-tts")
KOKORO = os.path.join(VENDOR, "kokoro-multi-lang-v1_0")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
TEXTS = [
    "こんにちは", "はじめまして", "わたしは ハンター です", "お元気ですか",
    "ありがとうございます", "すみません", "これは 何ですか", "駅は どこですか",
    "もう一度 言ってください", "ゆっくり 話してください", "わかりません", "では また明日",
]


def synth(text, out_path):
    t0 = time.perf_counter()
    subprocess.run(
        [
            BIN,
            f"--kokoro-model={os.path.join(KOKORO, 'model.onnx')}",
            f"--kokoro-voices={os.path.join(KOKORO, 'voices.bin')}",
            f"--kokoro-tokens={os.path.join(KOKORO, 'tokens.txt')}",
            f"--kokoro-data-dir={os.path.join(KOKORO, 'espeak-ng-data')}",
            "--kokoro-lang=ja",
            "--sid=37",
            f"--output-filename={out_path}",
            text,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    wall = time.perf_counter() - t0
    with wave.open(out_path) as w:
        dur = w.getnframes() / w.getframerate()
    return wall, dur


def main():
    if not os.path.exists(BIN) or not os.path.exists(KOKORO):
        print(f"vendor artifacts missing under {VENDOR}", file=sys.stderr)
        return 2
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = os.path.join(ROOT, "speech", "results", stamp)
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for i, text in enumerate(TEXTS, 1):
        wav = os.path.join(out_dir, f"t{i:02d}.wav")
        wall, dur = synth(text, wav)
        rows.append({"id": f"t{i:02d}", "text": text, "wall_s": round(wall, 3),
                     "audio_s": round(dur, 3), "rtf": round(wall / dur, 3)})
    walls = sorted(r["wall_s"] for r in rows)
    rtfs = sorted(r["rtf"] for r in rows)
    summary = {
        "protocol": "tts-0.1.0",
        "candidate": "sherpa-onnx-kokoro (kokoro-multi-lang-v1_0, sid 37)",
        "hardware": "dev-desktop CPU, measured",
        "utterances": rows,
        "wall_p50_s": walls[len(walls) // 2],
        "rtf_p50": rtfs[len(rtfs) // 2],
        "note": "synthetic model output; not pronunciation ground truth",
    }
    with open(os.path.join(out_dir, "summary.json"), "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(out_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
