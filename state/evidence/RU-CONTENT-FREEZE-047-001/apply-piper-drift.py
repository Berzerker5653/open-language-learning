#!/usr/bin/env python3
"""Apply piper-bestof winners to languages/ru-RU/media (inline, proven recipe).

Copies each winning candidate wav over media/<id>.wav and rewrites the
manifest row in place: sha256/size/seconds from the new bytes, synthesizer
restricted to schema-legal {runtime,model,voice} (voice=model for piper),
prior notes folded with the apply record. Manifest order preserved.
"""
import hashlib, json, os, sys, wave
from pathlib import Path

REPO = Path("/home/hunter/game-dev/LTS")
MEDIA = REPO / "languages/ru-RU/media"
MANIFEST = MEDIA / "manifest.jsonl"
E = REPO / "state/evidence/RU-CONTENT-FREEZE-047-001"

recs = [json.loads(l) for l in (E / "piper-bestof.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
winners = {}
for r in recs:
    if (r.get("result") or "").startswith("pass@"):
        winners[r["id"]] = r["result"].split("@", 1)[1]
print(f"winners to apply: {len(winners)}")

rows = [json.loads(l) for l in MANIFEST.read_text(encoding="utf-8").splitlines() if l.strip()]
applied = 0
for i, row in enumerate(rows):
    rid = row["id"]
    if rid not in winners:
        continue
    voice = winners[rid]
    src = E / "piper-candidates" / f"{rid}.wav"
    dst = MEDIA / f"{rid}.wav"
    data = src.read_bytes()
    tmp = dst.with_suffix(".wav.tmp")
    tmp.write_bytes(data)
    os.replace(tmp, dst)
    with wave.open(str(dst), "rb") as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        secs = round(n / sr, 3)
    old_notes = row.get("notes")
    new = dict(row)
    new["sha256"] = hashlib.sha256(data).hexdigest()
    new["size_bytes"] = len(data)
    new["seconds"] = secs
    new["sample_rate"] = sr
    new["synthesizer"] = {"runtime": "piper", "model": voice, "voice": voice}
    note = f"RU-CONTENT-FREEZE-047-001 drift repair: gate-v5 fail -> piper {voice} first-pass take, gated via production qa-asr re-audit"
    if old_notes:
        new["notes"] = f"{old_notes} | {note}" if isinstance(old_notes, str) else old_notes
    else:
        new["notes"] = note
    rows[i] = new
    applied += 1

assert applied == len(winners), f"applied {applied} != winners {len(winners)}"
tmp = MANIFEST.with_suffix(".jsonl.tmp")
with open(tmp, "w", encoding="utf-8") as f:
    for row in rows:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
os.replace(tmp, MANIFEST)
print(f"applied {applied}/{len(winners)}; manifest rows total {len(rows)}")
