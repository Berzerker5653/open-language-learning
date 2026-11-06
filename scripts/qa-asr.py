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
import os
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
# whisper renders hallucinated stage directions bracketed ("(смех)",
# "[музыка]"); the bare words are legitimate content — a clip literally
# saying "Это шум." failed here. The laughter/sustain character-run
# gates still catch unbracketed vocalization runs.
RU_STAGE = re.compile(r"[(\[]\s*(смех|вздыхает|хихикает|шум|аплодисменты|музыка)[)\]]")
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
        _ipa_word(w) if re.fullmatch(r"[а-яё0-9]+", w) else w
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
    # Strip stress marks BEFORE any other normalization: they are not audio
    # content for the fold (whisper never emits them), and letting them reach
    # ru_phon as spaces changes the phonemic fold asymmetrically
    # ("кио́ск"->"kʲiʌɛskɑ" vs "киоск"->"kʲiosk") and fails correct clips.
    s = s.replace("\u0301", "").replace("\u0300", "")
    out = re.sub(r"\s+", " ", re.sub(r"[^\w\d]+", " ", s.lower())).strip()
    if ja:
        return out.replace(" ", "")
    # Russian IPA folding emits syllable spaces inconsistently per word
    # ("zɑmʌ kɑ" vs "zamok"); word segmentation in whisper output is not
    # what we verified either (same rationale as the ja space fold).
    return ru_phon("".join(c for c in out if c != "\u0301")).replace(" ", "")


_JA_LEX = None

def _ja_lexicon():
    # JMDict full-form -> kana readings, for the homograph rescue below.
    global _JA_LEX
    if _JA_LEX is None:
        _JA_LEX = {}
        path = Path(__file__).resolve().parent.parent / "tmp/jmdict/jmdict-eng-3.6.2.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        for e in data["words"]:
            for k in e.get("kanji", []):
                s = _JA_LEX.setdefault(k["text"], set())
                for kn in e.get("kana", []):
                    s.add(kn["text"])
    return _JA_LEX


def ja_rescue(heard: str, expected: str) -> bool:
    # kakasi can misread a kanji homograph (止める -> yameru, while the clip
    # says とめる): the fold ratio then fails a CORRECT clip. For single-word
    # assets, if a kanji span in whisper's transcript is a JMDict headword
    # with the expected kana among its readings, the clip demonstrably said
    # the declared word — pass, recorded as a dictionary reading check.
    expected = expected.strip()
    if not heard or not expected or re.search(r"\s", expected):
        return False
    spans = re.findall(r"[々〇\u4e00-\u9fff][\u3040-\u30ff々〇\u4e00-\u9fff]*", heard)
    if not spans:
        return False
    want = kana(expected)
    lex = _ja_lexicon()
    for span in spans:
        for reading in lex.get(span, ()):
            if kana(reading) == want:
                return True
    return False


def ru_reduce_rescue(heard: str, expected: str) -> bool:
    # Rescue for correctly-pronounced clips that whisper transcribes
    # phonetically. Expected text without explicit stress marks means the
    # stress (and therefore reduction) is unspecified, so compare a fully
    # reduced fold of both sides: unstressed о->а, е->и (near-hard), word-final
    # ж->ш devoicing, geminate collapse (ссуда~суда), and epenthetic vowels
    # are absorbed by the ratio. Known good classes this rescues:
    #   коллаж -> "Калаш", ссуда -> "Си-су-да."
    # Text WITH stress marks never takes this path: the marked reading is
    # authoritative and the main fold is strict on it (замо́к vs "Замайок"
    # must still fail). Threshold 0.85 is stricter than the main gate's 0.75.
    def fold(s: str, collapse_geminates: bool) -> str:
        s = re.sub(r"[^\w\d]+", " ", s.lower()).strip()
        s = s.replace("ь", "")
        if collapse_geminates:
            s = re.sub(r"([а-я])\1", r"\1", s)      # geminates (collapsible variant only)
        for a, b in (("о", "а"), ("е", "и"), ("ж", "ш")):
            s = s.replace(a, b)
        return s.replace(" ", "")
    scores = []
    for cg in (False, True):
        a, b = fold(expected, cg), fold(heard, cg)
        if a and b and a[0] == b[0]:   # no dropped initial syllable ("город" != "огород")
            scores.append(1.0 if a == b else difflib.SequenceMatcher(None, a, b).ratio())
    if not scores:
        return False
    return max(scores) >= 0.85


def verdict(text: str, heard: str, lang: str):
    """Gate v3 decision for one transcript pair: returns
    (ok, ratio, reasons, rescued). Shared with bake-bestof.py."""
    reasons = []
    if STAGE.search(heard) or RU_STAGE.search(heard):
        reasons.append("hallucination-marker")
    stripped = STAGE.sub(" ", heard)
    if LAUGH.search(stripped) or SUSTAIN.search(stripped.lower()):
        reasons.append("vocalization-run")
    ja = lang == "ja"
    a, b = norm(text, ja), norm(stripped, ja)
    ratio = difflib.SequenceMatcher(None, a, b).ratio()
    ok = (a == b or ratio >= 0.75) and not reasons
    rescued = False
    if ja and not ok and not reasons and ja_rescue(heard, text):
        ok = True
        rescued = True
    if lang == "ru" and not ok and not reasons and not re.search(r"[\u0301\u0300]", text) \
            and ru_reduce_rescue(heard, text):
        ok = True
        rescued = True
    return ok, ratio, reasons, rescued


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
    # A gate/normalization crash on one clip must be a loud, per-row failure —
    # never an exception that kills the main loop while the executor's
    # thousands of queued whisper subprocesses keep running as a zombie queue
    # (that exact failure burned an hour on the 2026-11-06 ja audit: a missing
    # pykakasi import crashed the first verdict, and the CPU stayed busy with
    # nothing landing).
    try:
        ok, ratio, reasons, rescued = verdict(row["text"], heard, lang)
    except Exception as e:  # noqa: BLE001 - infra signal, distinct status
        return {"id": row["id"], "status": "check-error",
                "error": f"{type(e).__name__}: {e}", "text": row["text"], "heard": heard}
    res = {"id": row["id"], "status": "ok" if ok else "MISMATCH",
           "ratio": round(ratio, 2), "text": row["text"], "heard": heard}
    if reasons:
        res["reasons"] = reasons
    if rescued:
        res["rescued"] = "jmdict"
    return res


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", type=Path, required=True)
    ap.add_argument("--model", required=True)
    ap.add_argument("--lang", default="ru")
    ap.add_argument("--whisper", default=str(Path.home() / "whisper.cpp/build/bin/whisper-cli"))
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--ids", type=Path, help="only check these asset ids (one per line)")
    ap.add_argument("--out", type=Path,
                    help="jsonl of results; each row is appended as that asset settles, and an "
                         "existing file is resumed (its ids are carried and not re-checked)")
    args = ap.parse_args()

    rows = [json.loads(l) for l in (args.pack / "media/manifest.jsonl").read_text().splitlines() if l.strip()]
    if args.ids:
        keep = {l.strip() for l in args.ids.read_text().splitlines() if l.strip()}
        rows = [r for r in rows if r["id"] in keep]

    # Checkpoint as we go: a full-corpus pass runs for hours and a lost run
    # means hours of whisper. Each verdict is flushed+fsynced the moment its
    # asset settles, and re-running with the same --out keeps those rows and
    # checks only what is left - so an interrupted audit resumes, it does not
    # restart.
    results = []
    if args.out and args.out.exists():
        for l in args.out.read_text(encoding="utf-8").splitlines():
            if l.strip():
                results.append(json.loads(l))
        done = {r["id"] for r in results}
        rows = [r for r in rows if r["id"] not in done]
        if results:
            print(f"carrying {len(results)} settled rows from {args.out}; "
                  f"{len(rows)} left to check", file=sys.stderr)
        args.out.parent.mkdir(parents=True, exist_ok=True)
    sink = args.out.open("a", encoding="utf-8") if args.out else None
    print(f"audit start: {len(rows)} rows x {args.workers} workers -> {args.out}",
          file=sys.stderr, flush=True)
    ex = cf.ThreadPoolExecutor(max_workers=args.workers)
    try:
        futs = [ex.submit(check, args.pack, args.model, args.lang, args.whisper, r) for r in rows]
        for i, f in enumerate(cf.as_completed(futs), 1):
            res = f.result()
            results.append(res)
            if sink:
                sink.write(json.dumps(res, ensure_ascii=False) + "\n")
                sink.flush()
                os.fsync(sink.fileno())
            if i % 250 == 0:
                print(f"... {i}/{len(rows)} checked", file=sys.stderr)
    finally:
        # Never leave queued work running after the consumer dies.
        ex.shutdown(wait=False, cancel_futures=True)
        if sink:
            sink.close()

    mismatches = [r for r in results if r["status"] == "MISMATCH"]
    timeouts = [r for r in results if r["status"] == "timeout"]
    missing = [r for r in results if r["status"] == "wav-missing"]
    errors = [r for r in results if r["status"] == "check-error"]
    # MISMATCH (real babble) or WAV-MISSING are genuine failures; TIMEOUT is an
    # infra signal — lower --workers and re-run — and must not fail the pass.
    # CHECK-ERROR means the gate itself broke (missing dep, fold bug): fail loud.
    print(f"checked={len(results)} "
          f"passed={len(results) - len(mismatches) - len(timeouts) - len(missing) - len(errors)} "
          f"MISMATCH={len(mismatches)} TIMEOUT={len(timeouts)} WAV-MISSING={len(missing)} "
          f"CHECK-ERROR={len(errors)}")
    for r in sorted(mismatches, key=lambda r: r["ratio"]):
        print(f"FAIL {r['id']} ratio={r.get('ratio')} said={r['text']!r} heard={r.get('heard')!r}")
    for r in timeouts:
        print(f"TIMEOUT {r['id']} (raise the timeout or lower --workers, then re-check)")
    for r in missing:
        print(f"WAV-MISSING {r['id']}")
    for r in errors[:20]:
        print(f"CHECK-ERROR {r['id']} {r.get('error')}")
    return 1 if (mismatches or missing or errors) else 0


if __name__ == "__main__":
    sys.exit(main())
