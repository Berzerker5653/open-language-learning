#!/usr/bin/env python3
"""Apply graded Piper candidate wavs into the pack (media + manifest).

Copies each passing piper-candidates/<id>.wav over media/<id>.wav and
rewrites its manifest row (sha256/bytes/sample_rate/channels/seconds +
synthesizer runtime piper) atomically (tmp + os.replace). Only ids
passed on the command line are touched.
"""
import hashlib, json, os, sys, wave
from pathlib import Path

REPO = Path("/home/hunter/game-dev/LTS")
PACK = REPO / "languages/ru-RU"
MANIFEST = PACK / "media/manifest.jsonl"
CAND = REPO / "state/evidence/PACK-AUDIO-VERIFICATION-001/piper-candidates"
REPORTS = ["piper-bestof-r1.jsonl", "piper-bestof-r2.jsonl", "piper-bestof-final.jsonl"]


def main():
    ids = sys.argv[1:]
    voice_of = {}
    for rep in REPORTS:
        p = REPO / "state/evidence/PACK-AUDIO-VERIFICATION-001" / rep
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            r = json.loads(line)
            if r.get("result"):
                voice_of[r["id"]] = r["result"].split("@")[1]

    lines = MANIFEST.read_text(encoding="utf-8").splitlines()
    out = []
    applied = 0
    for line in lines:
        if not line.strip():
            continue
        row = json.loads(line)
        if row["id"] in ids:
            wav = CAND / f"{row['id']}.wav"
            if not wav.exists():
                print(f"SKIP {row['id']}: no candidate wav")
                out.append(line)
                continue
            with wave.open(str(wav)) as w:
                sr, ch, frames = w.getframerate(), w.getnchannels(), w.getnframes()
            data = wav.read_bytes()
            dest = PACK / row["file"]
            tmp = dest.with_suffix(".wav.tmp")
            tmp.write_bytes(data)
            os.replace(tmp, dest)
            row["sha256"] = hashlib.sha256(data).hexdigest()
            row["bytes"] = len(data)
            row["sample_rate"] = sr
            row["channels"] = ch
            row["seconds"] = round(frames / sr, 3)
            row["provenance"] = "model-output"
            # Media schema: synthesizer allows runtime/model/model_sha256/voice
            # ONLY (voice required; extra keys fail `pack has N validation
            # error(s)` at build — regression of 2026-11-05 applies, fixed 2026-11-06).
            voice = voice_of.get(row["id"], "piper-ru")
            row["synthesizer"] = {"runtime": "piper", "model": voice, "voice": voice}
            row["notes"] = (row.get("notes", "").rstrip(". ") +
                            ". best-of voice pass (multi-voice owner-approved)").lstrip(". ")
            out.append(json.dumps(row, ensure_ascii=False))
            applied += 1
        else:
            out.append(line)
    tmpm = MANIFEST.with_suffix(".jsonl.tmp")
    tmpm.write_text("\n".join(out) + "\n", encoding="utf-8")
    os.replace(tmpm, MANIFEST)
    print(f"applied {applied}/{len(ids)} candidates")


if __name__ == "__main__":
    main()
