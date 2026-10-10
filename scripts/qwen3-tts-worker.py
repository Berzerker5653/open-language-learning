"""Persistent Qwen3-TTS worker for scripts/generate-pack-audio.py.

Runs inside the dedicated qwen venv (torch + qwen-tts), loads the model
once, then consumes one JSON request per stdin line and answers with one
JSON line:

  request  {"id": str, "text": str, "out": path,
            "language": "Japanese", "speaker": "Ono_Anna"}
  answer   {"id": str, "ok": true, "sample_rate": int}
        or {"id": str, "ok": false, "error": str}

Kept separate from generate-pack-audio.py because the model must stay
resident: loading per asset (4,614 of them) would dominate the run.
CPU-only defaults (float32/sdpa); the 5090 path is a GPU bake decision,
not this script's concern.
"""

import argparse
import json
import sys
from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, type=Path)
    args = ap.parse_args()

    model = Qwen3TTSModel.from_pretrained(
        str(args.model), device_map="cpu", dtype=torch.float32,
        attn_implementation="sdpa")
    speakers = set(model.get_supported_speakers() or [])
    languages = set(model.get_supported_languages() or [])

    print(json.dumps({"ready": True}), flush=True)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req = json.loads(line)
        try:
            speaker, language = req["speaker"], req["language"]
            if speakers and speaker not in speakers:
                raise ValueError(f"speaker {speaker!r} not in {sorted(speakers)}")
            if languages and language not in languages:
                raise ValueError(f"language {language!r} unsupported")
            wavs, sr = model.generate_custom_voice(
                text=req["text"], language=language, speaker=speaker)
            out = Path(req["out"])
            out.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(out), wavs[0], sr, subtype="PCM_16")
            answer = {"id": req["id"], "ok": True, "sample_rate": sr}
        except Exception as exc:  # keep the worker alive for the next asset
            answer = {"id": req.get("id", "?"), "ok": False, "error": str(exc)[:400]}
        print(json.dumps(answer, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
