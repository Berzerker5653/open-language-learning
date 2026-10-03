#!/usr/bin/env python3
"""Generate the ja-onramp-synth-0.1.0 fixture wavs deterministically.

Pinned: sherpa-onnx v1.13.8 offline TTS, kokoro-multi-lang-v1_0,
voice sid 37 (jf_alpha), lang ja, default noise scales. Re-running with
the same inputs reproduces the fixtures (model checksums recorded in the
run summary).

Usage: LTS_BENCH_VENDOR=~/.cache/lts-bench ./gen_fixtures.py
"""

import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
VENDOR = Path(__import__("os").environ.get("LTS_BENCH_VENDOR", Path.home() / ".cache/lts-bench"))
DATASET = REPO / "benchmarks/speech/datasets/ja-onramp-synth-0.1.0/manifest.yaml"
OUT = VENDOR / "fixtures-ja-onramp-synth-0.1.0"
SHERPA = VENDOR / "sherpa-onnx-v1.13.8-linux-x64-shared"
MODEL = VENDOR / "kokoro-multi-lang-v1_0"


def load_utterances():
    utts, cur = [], None
    for line in DATASET.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\s*- id: \"?([^\"\n]+)\"?", line)
        if m:
            cur = {"id": m.group(1).strip()}
            utts.append(cur)
            continue
        m = re.match(r"\s*text: \"?([^\"\n]+)\"?", line)
        if m and cur is not None:
            cur["text"] = m.group(1).strip()
    return utts


def main() -> int:
    import os

    env = dict(os.environ, LD_LIBRARY_PATH=str(SHERPA / "lib"))
    OUT.mkdir(parents=True, exist_ok=True)
    for u in load_utterances():
        out = OUT / f"{u['id']}.wav"
        cmd = [
            str(SHERPA / "bin/sherpa-onnx-offline-tts"),
            f"--kokoro-model={MODEL / 'model.onnx'}",
            f"--kokoro-voices={MODEL / 'voices.bin'}",
            f"--kokoro-tokens={MODEL / 'tokens.txt'}",
            f"--kokoro-data-dir={MODEL / 'espeak-ng-data'}",
            "--kokoro-lang=ja",
            "--sid=37",
            f"--output-filename={out}",
            u["text"],
        ]
        p = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=120)
        if p.returncode != 0 or not out.exists():
            print(f"FAILED {u['id']}: {p.stderr[-300:]}", file=sys.stderr)
            return 1
        print(f"generated {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
