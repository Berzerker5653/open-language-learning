#!/usr/bin/env python3
"""WORD-TIMING spike (owner-authorized 2026-11-07).

Take the first N manifest rows with >=2 words, run faster-whisper
(word_timestamps=True) CPU int8, and emit word-level timings constrained-
matched to the manifest's own `text`. Gate: every content token of the
expected text must match an aligned word in order (case/diacritic-insensitive),
timings monotonic and inside the clip duration. This is the build-time
analogue of the runtime constrained matcher in speech-runtime/alignment.rs:
alignment output is presentation data, never proof of pronunciation.

Usage: spike.py --pack languages/ru-RU --n 20 --model small --out timings.jsonl
Exit 0 = all checked rows passed the gate.
"""
from __future__ import annotations
import argparse, json, re, sys, unicodedata
from pathlib import Path


def norm(w: str) -> str:
    w = unicodedata.normalize("NFKD", w.lower())
    w = "".join(c for c in w if not unicodedata.combining(c))
    return re.sub(r"[^\w']+|[']$", "", w, flags=re.UNICODE)


def strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c))


def tokens(text: str) -> list[str]:
    # strip stress/diacritic marks BEFORE splitting: Russian packs mark stress
    # with a combining acute inside words (му́ка), which otherwise fragments
    # single words into multiple tokens.
    return [norm(t) for t in re.findall(r"[\w']+", strip_accents(text)) if norm(t)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", required=True)
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--model", default="small")
    ap.add_argument("--out", default="timings.jsonl")
    a = ap.parse_args()

    pack = Path(a.pack)
    rows = []
    for line in (pack / "media" / "manifest.jsonl").read_text().splitlines():
        r = json.loads(line)
        if len(tokens(r["text"])) >= 2:
            rows.append(r)
        if len(rows) >= a.n:
            break

    from faster_whisper import WhisperModel
    model = WhisperModel(a.model, device="cpu", compute_type="int8")

    import difflib
    ok = fail = 0
    out = Path(a.out).open("w")
    for r in rows:
        wav = pack / r["file"]
        want = tokens(r["text"])
        # Constrain recognition to the known text: whisper bias via
        # initial_prompt (the expected sentence) + no hallucination passes.
        segs, info = model.transcribe(
            str(wav), word_timestamps=True, language="ru", beam_size=5,
            initial_prompt=r["text"], temperature=0.0,
        )
        words = [{"w": s.word.strip(), "start": round(s.start, 3), "end": round(s.end, 3)}
                 for seg in segs for s in (seg.words or [])]
        got = [norm(w["w"]) for w in words]
        # fuzzy token-level alignment (difflib): every expected token must
        # align to a contiguous run of ASR words with ratio >= 0.75.
        sm = difflib.SequenceMatcher(None, want, got, autojunk=False)
        spans: dict[int, tuple[int, int]] = {}
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                for k in range(i2 - i1):
                    spans[i1 + k] = (j1 + k, j1 + k)
            elif tag in ("replace", "delete") and i2 > i1:
                joined = " ".join(got[j1:j2]) if tag == "replace" else ""
                for k, i in enumerate(range(i1, i2)):
                    if tag == "replace":
                        piece = got[j1 + k] if j1 + k < j2 else joined
                        ratio = difflib.SequenceMatcher(None, want[i], piece).ratio()
                        if ratio >= 0.75:
                            spans[i] = (j1 + min(k, j2 - j1 - 1), j2 - 1)
        covered = len(spans) == len(want)
        mono = all(words[i]["end"] <= words[i + 1]["start"] + 0.05 for i in range(len(words) - 1))
        inside = (not words) or (words[0]["start"] >= 0 and words[-1]["end"] <= r["seconds"] + 0.3)
        # assign each expected token its timing span (union of ASR words)
        timed = None
        if covered:
            timed = [{"w": want[i],
                      "start": words[spans[i][0]]["start"],
                      "end": words[spans[i][1]]["end"]} for i in range(len(want))]
        passed = covered and mono and inside and bool(words)
        ok, fail = ok + passed, fail + (not passed)
        out.write(json.dumps({
            "id": r["id"], "text": r["text"], "seconds": r["seconds"],
            "passed": passed, "expected": want, "got": got, "words": words,
            "timed": timed,
        }, ensure_ascii=False) + "\n")
        print(f"{'PASS' if passed else 'FAIL'} {r['id']} ({len(want)} words, {len(words)} aligned)")
    out.close()
    print(f"\n{ok}/{ok+fail} passed; wrote {a.out}")
    return 0 if fail == 0 and ok > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
