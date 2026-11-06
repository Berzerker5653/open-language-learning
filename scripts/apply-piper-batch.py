#!/usr/bin/env python3
"""Apply a piper-bestof report's winning candidates into a pack.

Usage: apply-piper-batch.py <report.jsonl> <cand-dir> <pack-dir>
Idempotent: skips ids whose manifest sha already matches the candidate file.
"""
import hashlib, json, os, sys, wave
from pathlib import Path

report, cand, pack = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
MAN = pack / "media/manifest.jsonl"
won = {}
exhausted = 0
for line in report.read_text().splitlines():
    r = json.loads(line)
    if (r.get("result") or "").startswith("pass@"):
        won[r["id"]] = r["result"].split("@", 1)[1]
    else:
        exhausted += 1
rows = [json.loads(l) for l in MAN.read_text().splitlines()]
by_id = {r["id"]: r for r in rows}
applied = skipped = missing = 0
for cid, voice in sorted(won.items()):
    src = cand / f"{cid}.wav"
    if not src.exists():
        missing += 1
        continue
    data = src.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    row = by_id.get(cid)
    if row is None:
        missing += 1
        continue
    if row.get("sha256") == sha:
        skipped += 1
        continue
    dst = pack / "media" / f"{cid}.wav"
    tmp = dst.with_suffix(".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, dst)
    w = wave.open(str(dst), "rb")
    sr, ch, fr = w.getframerate(), w.getnchannels(), w.getnframes()
    w.close()
    row.update(sha256=sha, bytes=len(data), sample_rate=sr, channels=ch,
               seconds=round(fr / sr, 3))
    row["synthesizer"] = {"runtime": "piper", "model": voice, "voice": voice}
    row["notes"] = (row.get("notes", "") +
                    "; re-rendered 2026-11-06 via piper " + voice +
                    " (duration/delivery repair after native-speaker review)").lstrip("; ")
    applied += 1
tmpm = MAN.with_suffix(".tmp")
tmpm.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows) + "\n")
os.replace(tmpm, MAN)
print(f"applied={applied} skipped(idempotent)={skipped} missing={missing} exhausted={exhausted} of won={len(won)}")
