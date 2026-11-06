#!/usr/bin/env python3
"""Plan B audio repair: Piper multi-voice best-of (2026-11-05).

Completely different engine from Qwen3-TTS for the stubborn ru clips:
piper (espeak-ng phonemizer, ONNX) renders in <1s on CPU and is
deterministic; the phonemizer obeys the pack's lexical stress marks.
Validated 2026-11-05: rayon and metro (laughter clips under Qwen) grade
1.00 under the fixed whisper gate via ruslan; bukva passes via irina.

Strategy: for each failing id, try up to N piper voices; grade each
candidate with the production gate (qa-asr verdict + whisper-gate.sh);
the FIRST passing candidate is written to --out-dir as <id>.wav.
Ids that exhaust all voices are listed in the report for manual review.

Usage:
  ~/.venvs/piper-tts/bin/python scripts/piper-bestof.py \
      --ids state/evidence/PACK-AUDIO-VERIFICATION-001/mismatch-r2.txt \
      --out-dir state/evidence/PACK-AUDIO-VERIFICATION-001/piper-candidates \
      --report state/evidence/PACK-AUDIO-VERIFICATION-001/piper-bestof.jsonl
"""
import argparse, json, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
EV = REPO / "state/evidence/PACK-AUDIO-VERIFICATION-001"
# Piper is NOT bit-deterministic (onnxruntime jitter), and whisper.cpp
# hallucinates freely on ~1s clips (heard "Редактор субтитров А.Семкин" for
# a clean word once). So the voice list deliberately includes second rounds:
# re-rolling the SAME voice is a real second attempt.
VOICES = ["ru_RU-ruslan-medium", "ru_RU-irina-medium",
          "ru_RU-dmitri-medium", "ru_RU-denis-medium",
          "ru_RU-ruslan-medium", "ru_RU-irina-medium"]
GATE = EV / "whisper-gate.sh"
ASR_MODEL = str(Path.home() / ".cache/lts-bench/ggml-large-v3-turbo.bin")
PIPER = str(Path.home() / ".venvs/piper-tts/bin/piper")
VOICE_DIR = str(Path.home() / ".cache/piper-voices")

import importlib.util
spec = importlib.util.spec_from_file_location("qa", str(REPO / "scripts/qa-asr.py"))
assert spec is not None and spec.loader is not None
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def manifest_rows():
    rows = {}
    manifest = REPO / "languages/ru-RU/media/manifest.jsonl"
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if line.strip():
            r = json.loads(line)
            rows[r["id"]] = r
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--voices", default=",".join(VOICES))
    args = ap.parse_args()

    out = Path(args.out_dir); out.mkdir(parents=True, exist_ok=True)
    rows = manifest_rows()
    ids = [l.strip() for l in open(args.ids) if l.strip()]
    voices = args.voices.split(",")
    rep = open(args.report, "w")

    for i, cid in enumerate(ids, 1):
        text = rows[cid]["text"]
        rec = {"id": cid, "text": text, "result": None, "tried": []}
        for v in voices:
            wav = out / f"{cid}.wav"
            p = subprocess.run([PIPER, "-m", f"{VOICE_DIR}/{v}.onnx", "-f", str(wav)],
                               input=text, capture_output=True, text=True, timeout=120)
            if p.returncode != 0:
                rec["tried"].append({"voice": v, "err": p.stderr[-100:]})
                continue
            a = subprocess.run([str(GATE), "-m", ASR_MODEL, "-l", "ru", "-np", "-nt", str(wav)],
                               capture_output=True, text=True, timeout=300)
            heard = a.stdout.strip()
            ok, ratio, reasons, _ = qa.verdict(text, heard, "ru")
            rec["tried"].append({"voice": v, "heard": heard, "ratio": round(ratio, 2)})
            if ok:
                rec["result"] = f"pass@{v}"
                break
            wav.unlink()
        print(f"[{i}/{len(ids)}] {cid}: {rec['result'] or 'ALL VOICES FAILED'}", flush=True)
        rep.write(json.dumps(rec, ensure_ascii=False) + "\n"); rep.flush()
    rep.close()


if __name__ == "__main__":
    main()
