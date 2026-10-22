#!/usr/bin/env python3
"""ML-free acoustic-structure gate for baked pack audio (PACK-AUDIO-VERIFICATION).

Energy-envelope checks on the raw waveform, stdlib only:
  burst   leading click/burst before the main utterance
  gap     internal silence longer than --max-gap (default 0.8 s)
  trail   trailing noise after the last sustained speech
  clip    flat runs at full scale
  nuclei  syllable-nucleus (energy-peak) count vs expected from text:
          ru = vowel letters; ja = morae (table in expected_nuclei_ja).
          Unknown language: this check abstains (never silent-passes);
          the four waveform checks still run.

Per-clip JSONL verdicts PASS/WARN/FLAG with measured numbers; exit 1 on any
FLAG. Calibration and what this gate CANNOT hear: scripts/qa-segments.README.md.

Usage mirrors scripts/qa-asr.py:
  .venv/bin/python scripts/qa-segments.py --pack languages/ru-RU \
      --ids-file ids.txt --out qa-segments.jsonl
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import unicodedata
import wave
from pathlib import Path

HOP = 0.02  # frame length / hop, s

RU_VOWELS = set("аёеиоуыэюя")
JA_SMALL = set("ャュョァィゥェォ")


def db(x: float) -> float:
    return 20 * math.log10(max(x, 1e-9))


def read_pcm(path: Path):
    import array
    with wave.open(str(path)) as w:
        if w.getnchannels() != 1 or w.getsampwidth() != 2:
            raise ValueError(f"{path}: expected mono 16-bit PCM")
        sr = w.getframerate()
        raw = w.readframes(w.getnframes())
    a = array.array("h")
    a.frombytes(raw)
    return sr, a


def frames_db(a, sr: int, hop: float = HOP) -> list[float]:
    n = int(sr * hop)
    out = []
    for i in range(0, len(a) - n + 1, n):
        s = 0.0
        for k in range(i, i + n):
            v = a[k]
            s += v * v
        out.append(db(math.sqrt(s / n) / 32768.0))
    return out


def expected_nuclei_ru(text: str) -> int | None:
    n = sum(1 for c in text.lower() if c in RU_VOWELS)
    return n if n else None  # e.g. interjections without vowel letters: abstain


def expected_nuclei_ja(kana: str) -> int | None:
    """Mora count (expected nuclei): every mora kana = 1; small combo kana
    (ャュョァィゥェォ, either script) merge into the previous mora; っ/ヶ = 1
    (Q mora); ん = 1; ー/〜 prolong = +1 after a mora. Consecutive identical
    vowel kana are two morae (long vowel) — handled by per-kana counting.
    Text containing kanji or latin makes mora counting impossible: abstain."""
    s = unicodedata.normalize("NFC", kana)
    if not any(0x3041 <= ord(c) <= 0x30FF for c in s):
        return None
    small = set("ャュョァィゥェォ" + "ャュョァィゥェォ")
    morae = 0
    for c in s:
        if c in ("ー", "〜"):
            if morae:
                morae += 1
            continue
        o = ord(c)
        if not (0x3041 <= o <= 0x30FF):
            if 0x4E00 <= o <= 0x9FFF or (c.isascii() and c.isalpha()):
                return None
            continue
        base = chr(o - 0x60) if 0x30A1 <= o <= 0x30F6 else c
        if c in small or base in small:
            continue
        morae += 1
    return morae or None


def count_nuclei(frames: list[float], thresh: float) -> int:
    """Coarse envelope nuclei: above-threshold runs merged across valleys
    shorter than 3 frames (60 ms); runs shorter than 3 frames are plosive
    onsets, not nuclei."""
    runs: list[list[int]] = []
    start = None
    for i, d in enumerate(frames):
        if d >= thresh and start is None:
            start = i
        elif d < thresh and start is not None:
            runs.append([start, i])
            start = None
    if start is not None:
        runs.append([start, len(frames)])
    merged: list[list[int]] = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < 3:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return sum(1 for m in merged if m[1] - m[0] >= 3)


def analyze(path: Path, cid: str, text: str, lang: str, max_gap: float,
            sil_db: float) -> dict:
    sr, a = read_pcm(path)
    # clipping: >=2 consecutive full-scale samples
    clip = 0
    run = 0
    for v in a:
        if abs(v) >= 32766:
            run += 1
        else:
            if run >= 2:
                clip += 1
            run = 0
    if run >= 2:
        clip += 1
    fr = frames_db(a, sr)
    peak = max(fr) if fr else -120.0
    thresh = max(sil_db, peak - 30.0)
    speech = [d >= thresh for d in fr]
    runs: list[list] = []
    for i, s in enumerate(speech):
        if runs and runs[-1][2] == s:
            runs[-1][1] = i
        else:
            runs.append([i, i, s])
    dur = lambda r: (r[1] - r[0] + 1) * HOP
    first_speech = next((r for r in runs if r[2] and dur(r) >= 0.1), None)
    last_speech = next((r for r in reversed(runs) if r[2] and dur(r) >= 0.1), None)
    flags: dict = {}
    # leading burst: pre-speech blip separated from the main utterance by
    # >=0.15 s of silence. Calibration: natural onsets dip <0.1 s (five
    # known-good clips show 20-120 ms onset blips with <0.1 s dips); the
    # drink-coffee fixture burst sits before a ~1 s gap.
    if first_speech:
        bursts = []
        for j, r in enumerate(runs[:runs.index(first_speech)]):
            if r[2] and dur(r) < 0.15 and j + 1 < len(runs):
                if not runs[j + 1][2] and dur(runs[j + 1]) >= 0.15:
                    bursts.append(r)
        if bursts:
            flags["burst"] = {"runs": len(bursts),
                              "ms": round(sum(dur(r) for r in bursts) * 1000)}
    # internal gaps: uniform budget - a >0.8 s silence inside ANY clip,
    # word or sentence, was calibrated as a defect (the drink-coffee
    # fixture has 1.06/1.12 s gaps; the flagged probe clips are real
    # artifacts the repair loop must re-take)
    gap_thr = max_gap
    if first_speech and last_speech:
        i0, i1 = runs.index(first_speech), runs.index(last_speech)
        gaps = [round(dur(r), 2) for r in runs[i0 + 1:i1]
                if not r[2] and dur(r) > gap_thr]
        if gaps:
            flags["gap"] = {"s": max(gaps), "count": len(gaps),
                            "threshold": gap_thr}
    # trailing noise: energy above thresh shortly after the last speech
    if last_speech:
        tail = speech[runs.index(last_speech) + 1:]
        if tail and any(tail) and len(tail) <= 8:
            flags["trail"] = {"ms": int(sum(tail) * HOP * 1000)}
    if clip:
        flags["clip"] = {"runs": clip}
    # nuclei count: METRIC ONLY, never a flag. Calibration showed 20 ms
    # energy-envelope runs/peaks are NOT syllable nuclei: >=2 mismatch on
    # two thirds of known-good clips (README table). Recorded as a cheap
    # cross-check and human-review lead only.
    exp_n = None
    if lang == "ru":
        exp_n = expected_nuclei_ru(text)
    elif lang == "ja":
        exp_n = expected_nuclei_ja(text)
    nuc = count_nuclei(fr, thresh) if exp_n is not None else None
    return {"sr": sr, "dur_s": round(len(a) / sr, 2), "peak_db": round(peak, 1),
            "threshold_db": round(thresh, 1),
            "silence_total_s": round(sum(dur(r) for r in runs if not r[2]), 2),
            "nuclei": nuc, "expected_nuclei": exp_n, "flags": flags}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--pack", required=True, type=Path)
    ap.add_argument("--ids", action="append", default=[])
    ap.add_argument("--ids-file", type=Path)
    ap.add_argument("--out", type=Path, default=Path("qa-segments.jsonl"))
    ap.add_argument("--max-gap", type=float, default=0.8)
    ap.add_argument("--sil-db", type=float, default=-45.0)
    args = ap.parse_args()

    texts = {}
    for line in (args.pack / "media" / "manifest.jsonl").read_text("utf-8").splitlines():
        if line.strip():
            r = json.loads(line)
            texts[r["id"]] = r["text"]
    ids = list(args.ids)
    if args.ids_file:
        ids += [l.strip() for l in args.ids_file.read_text().splitlines() if l.strip()]
    if not ids:
        ids = sorted(texts)
    lang = args.pack.name.split("-")[0].lower()

    n_flag = 0
    with args.out.open("w", encoding="utf-8") as out:
        for cid in ids:
            row = analyze(args.pack / "media" / f"{cid}.wav", cid, texts[cid],
                          lang, args.max_gap, args.sil_db)
            row["id"] = cid
            row["verdict"] = "FLAG" if row["flags"] else "PASS"
            if row["flags"]:
                n_flag += 1
                print(f"[qa-segments] FLAG {cid}: {row['flags']}", file=sys.stderr)
            out.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"[qa-segments] {len(ids)} clips -> {args.out}: {n_flag} FLAG",
          file=sys.stderr)
    return 1 if n_flag else 0


if __name__ == "__main__":
    sys.exit(main())
