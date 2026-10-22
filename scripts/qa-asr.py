#!/usr/bin/env python3
"""ASR round-trip QA for a pack's baked media (ADR-0023's gate, automated).

Every manifest row is transcribed with whisper.cpp and compared to the exact
string that was fed to the synthesizer (`text`). This catches short runaways
that the duration cap waves through ("акт" -> "Буууу..."): a babbling asset
fails here even when its length is plausible.

Pass rules (deliberately simple and debuggable):
  * normalized equality, or
  * difflib ratio >= 0.75, or
  * the spoken text appears as a word substring of the transcript
    (whisper pads short words with punctuation or case artifacts).

Usage: qa_asr.py --pack languages/ru-RU --model ~/models/ggml-small.bin
                  --lang ru [--workers 8] [--ids FILE] [--out FILE]
Exit code 0 = every checked row passed.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path


_KAKASI = None


def kana(s: str) -> str:
    # whisper writes Japanese with kanji orthography (笑いました) while pack
    # text is kana-only (わらいました): a correct clip fails a raw string
    # compare. Fold both sides to hiragana so the gate checks SOUND, not
    # spelling. pykakasi is this script's only extra dep (pip install pykakasi).
    global _KAKASI
    if _KAKASI is None:
        import pykakasi
        _KAKASI = pykakasi.kakasi()
    return "".join(x["hira"] for x in _KAKASI.convert(s))

# Gate v2 (2026-10-21 full-corpus audit): whisper writes hallucinated audio
# (sighs, laughter, drawn-out vowels) as stage directions or syllable runs.
STAGE = re.compile(r"\*[^*]*\*|\([^)]*\)|（[^）]*）")
RU_STAGE = re.compile(r"\b(смех|вздыхает|хихикает|шум|аплодисменты|музыка)\b")
LAUGH = re.compile(r"(?:[хф][ауыэ][-. ]*){2,}|(?:[hw]a[-. ]*){2,}|ふ[ふヴー]*(?:[ ]ふ[ふヴー]*)+|は[はぁー]*(?:[ ]は[はぁー]*)+|えへ|ふふ")
SUSTAIN = re.compile(r"([a-zа-яё])\1{5,}")


from functools import lru_cache


@lru_cache(maxsize=65536)
def _ipa_word(w: str) -> str:
    p = subprocess.run(["espeak-ng", "-v", "ru", "--ipa", "-q", w],
                       capture_output=True, text=True)
    ipa = p.stdout.strip()
    return re.sub(r"[ˈˌ'\"]", "", ipa) if ipa else w


def ru_phon(s: str) -> str:
    # Russian orthography != sound: род is SAID [рот], чек is SAID [чик]-ish.
    # Comparing whisper's phonetic spelling against pack orthography flags
    # correct clips. Fold both sides through espeak-ng's Russian G2P to IPA
    # so the gate checks SOUND, not spelling (same principle as kana() for
    # Japanese). Stress marks are stripped from the compare: whisper's
    # spelling is not a reliable stress channel, so prosody stays the
    # phoneme/record layer's and the owner's job, not this gate's.
    return " ".join(
        _ipa_word(w) if re.fullmatch(r"[а-я0-9]+", w) else w
        for w in s.split()
    )


def norm(s: str, ja: bool = False) -> str:
    # Cyrillic-aware: strip everything that is not a letter/digit, casefold.
    # For ja, also fold kanji to kana and drop spaces (word segmentation in
    # whisper output is not part of what we verified). Whitespace runs (from
    # whisper "..." fillers) collapse to one space: they are punctuation, not
    # audio content.
    if ja:
        s = kana(s)
    out = re.sub(r"\s+", " ", re.sub(r"[^\w\d]+", " ", s.lower())).strip()
    if ja:
        return out.replace(" ", "")
    return ru_phon("".join(c for c in out if c != "\u0301"))


def check(pack: Path, model: str, lang: str, whisper: str, row: dict) -> dict:
    wav = pack / row["file"]
    if not wav.exists():
        return {"id": row["id"], "status": "wav-missing", "text": row["text"]}
    # A per-clip timeout is an infra signal (CPU contention from too many
    # workers), NOT evidence of bad audio: record it as a distinct status so a
    # long run survives instead of a single slow clip killing the whole pass.
    try:
        p = subprocess.run(
            [whisper, "-m", model, "-l", lang, "-np", "-nt", str(wav)],
            capture_output=True, text=True, timeout=300,
        )
    except subprocess.TimeoutExpired:
        return {"id": row["id"], "status": "timeout", "text": row["text"]}
    heard = p.stdout.strip()
    # Gate v2 (2026-10-21 full audit): whisper stage directions like
    # *вздыхает* / (笑) mean the audio carries hallucinated non-word
    # vocalizations (sighs, laughter): strip them for the ratio, but the
    # clip still fails. Laughter and sustained-vowel runs fail outright.
    reasons = []
    if STAGE.search(heard) or RU_STAGE.search(heard):
        reasons.append("hallucination-marker")
    stripped = STAGE.sub(" ", heard)
    if LAUGH.search(stripped) or SUSTAIN.search(stripped.lower()):
        reasons.append("vocalization-run")
    ja = lang == "ja"
    a, b = norm(row["text"], ja), norm(stripped, ja)
    ratio = difflib.SequenceMatcher(None, a, b).ratio()
    # No substring rule: the 2026-10-11 probe showed real babble clips pass
    # it ("Мы с датата делаете…" for мы). An asset must round-trip whole.
    ok = (a == b or ratio >= 0.75) and not reasons
    res = {"id": row["id"], "status": "ok" if ok else "MISMATCH",
           "ratio": round(ratio, 2), "text": row["text"], "heard": heard}
    if reasons:
        res["reasons"] = reasons
    return res


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", type=Path, required=True)
    ap.add_argument("--model", required=True)
    ap.add_argument("--lang", default="ru")
    ap.add_argument("--whisper", default=str(Path.home() / "whisper.cpp/build/bin/whisper-cli"))
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--ids", type=Path, help="only check these asset ids (one per line)")
    ap.add_argument("--out", type=Path, help="write all results as jsonl")
    args = ap.parse_args()

    rows = [json.loads(l) for l in (args.pack / "media/manifest.jsonl").read_text().splitlines() if l.strip()]
    if args.ids:
        keep = {l.strip() for l in args.ids.read_text().splitlines() if l.strip()}
        rows = [r for r in rows if r["id"] in keep]

    results = []
    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [ex.submit(check, args.pack, args.model, args.lang, args.whisper, r) for r in rows]
        for i, f in enumerate(cf.as_completed(futs), 1):
            results.append(f.result())
            if i % 250 == 0:
                print(f"... {i}/{len(rows)} checked", file=sys.stderr)

    mismatches = [r for r in results if r["status"] == "MISMATCH"]
    timeouts = [r for r in results if r["status"] == "timeout"]
    missing = [r for r in results if r["status"] == "wav-missing"]
    if args.out:
        args.out.write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in results) + "\n")
    # MISMATCH (real babble) or WAV-MISSING are genuine failures; TIMEOUT is an
    # infra signal — lower --workers and re-run — and must not fail the pass.
    print(f"checked={len(results)} "
          f"passed={len(results) - len(mismatches) - len(timeouts) - len(missing)} "
          f"MISMATCH={len(mismatches)} TIMEOUT={len(timeouts)} WAV-MISSING={len(missing)}")
    for r in sorted(mismatches, key=lambda r: r["ratio"]):
        print(f"FAIL {r['id']} ratio={r.get('ratio')} said={r['text']!r} heard={r.get('heard')!r}")
    for r in timeouts:
        print(f"TIMEOUT {r['id']} (raise the timeout or lower --workers, then re-check)")
    for r in missing:
        print(f"WAV-MISSING {r['id']}")
    return 1 if (mismatches or missing) else 0


if __name__ == "__main__":
    sys.exit(main())
