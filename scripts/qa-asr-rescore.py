#!/usr/bin/env python3
"""Post-hoc rescore of qa-asr JSONLs (gate v2) — no whisper re-run.

The v1 gate compared raw characters: expected kana vs whisper's kanji/digit
transcripts (冬 vs ふゆう -> 0 ratio) and counted whisper's own hallucination
markers (*вздыхает*, (笑)) as content mismatches. This rescorer, working from
the transcripts already recorded in the audit JSONLs:

  * folds Japanese through pykakasi to romaji (kanji/digit/kana spelling
    collapses: 止める == とめる);
  * strips stage-direction spans (*...*, (...)) and flags them: they mean the
    audio contains hallucinated non-word vocalizations (sighs, laughter) --
    a real defect even when the word itself came through;
  * flags laughter runs and sustained-vowel runs in the transcript;
  * recomputes the difflib ratio on the normalized forms.

Usage: qa-asr-rescore.py --in asr-ja-JP.jsonl --pack ja-JP --out rescored.jsonl
Prints a tally and writes per-status id file next to --out.
"""
import argparse, json, re, difflib

KKS = None
def fold_ja(s):
    global KKS
    if KKS is None:
        import pykakasi
        KKS = pykakasi.kakasi()
    parts = KKS.convert(s)
    out = "".join(p.get("hepburn") or "" for p in parts)
    out = out.lower()
    for a, b in (("ō", "o"), ("ū", "u"), ("ē", "e"), ("ī", "i"), ("â", "a"), ("û", "u")):
        out = out.replace(a, b)
    return re.sub(r"[^a-z]", "", out)

STAGE = re.compile(r"\*[^*]*\*|\([^)]*\)|（[^）]*）")
RU_STAGE = re.compile(r"[(\[]\s*(смех|вздыхает|хихикает|шум|аплодисменты|музыка)[)\]]")
LAUGH = re.compile(r"(?:[хф][ауыэ][-. ]*){2,}|(?:[hw]a[-. ]*){2,}|ふ[ふヴー]*(?:[ ]ふ[ふヴー]*)+|は[はぁー]*(?:[ ]は[はぁー]*)+|えへ|ふふ")
SUSTAIN = re.compile(r"([a-zа-яё])\1{5,}")
import subprocess
from functools import lru_cache
@lru_cache(maxsize=65536)
def _ipa_word(w):
    p = subprocess.run(["espeak-ng", "-v", "ru", "--ipa", "-q", w],
                       capture_output=True, text=True)
    ipa = p.stdout.strip() or w
    return re.sub(r"[ˈˌ'\"]", "", ipa)


def clean_ru(s):
    s = s.lower().replace("ё", "е")
    s = "".join(c for c in s if c != "\u0301")
    s = re.sub(r"\s+", " ", re.sub(r"[^а-яa-z0-9]", " ", s)).strip()
    return " ".join(_ipa_word(w) if re.fullmatch(r"[а-я0-9]+", w) else w for w in s.split())

def _hira(s):
    import pykakasi
    return "".join(x["hira"] for x in pykakasi.kakasi().convert(s))

_JL = None
def _ja_lexicon():
    global _JL
    if _JL is None:
        _JL = {}
        data = json.loads(open("/home/hunter/game-dev/LTS/tmp/jmdict/jmdict-eng-3.6.2.json", encoding="utf-8").read())
        for e in data["words"]:
            for k in e.get("kanji", []):
                s = _JL.setdefault(k["text"], set())
                for kn in e.get("kana", []):
                    s.add(kn["text"])
    return _JL

def ja_rescue(heard, expected):
    expected = expected.strip()
    if not heard or not expected or re.search(r"\s", expected):
        return False
    spans = re.findall(r"[々〇\u4e00-\u9fff][\u3040-\u30ff々〇\u4e00-\u9fff]*", heard)
    if not spans:
        return False
    want = _hira(expected)
    for span in spans:
        for reading in _ja_lexicon().get(span, ()):
            if _hira(reading) == want:
                return True
    return False


def rescore(row, pack):
    text, heard = row.get("text", ""), row.get("heard", "")
    if not heard:
        return row["status"], row
    stage = STAGE.findall(heard)
    stripped = STAGE.sub(" ", heard)
    reasons = []
    if stage or RU_STAGE.search(heard):
        reasons.append("hallucination-marker")
    if LAUGH.search(stripped) or SUSTAIN.search(stripped.lower()):
        reasons.append("vocalization-run")
    if pack == "ja-JP":
        a, b = fold_ja(text), fold_ja(stripped)
    else:
        a, b = clean_ru(text), clean_ru(stripped)
    ratio = difflib.SequenceMatcher(None, a, b).ratio() if (a or b) else 0.0
    row = dict(row)
    row["ratio2"] = round(ratio, 3)
    row["reasons"] = reasons
    ok = ratio >= 0.75 and not reasons
    if pack == "ja-JP" and not ok and not reasons and ja_rescue(heard, text):
        ok = True
        row["rescued"] = "jmdict"
    row["status2"] = "ok" if ok else "MISMATCH"
    if row["status"] in ("timeout", "wav-missing"):
        row["status2"] = row["status"]
    return row["status2"], row

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--pack", required=True, choices=["ja-JP", "ru-RU"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--examples", action="store_true")
    args = ap.parse_args()
    counts, badrows, badids = {}, [], []
    with open(args.inp, encoding="utf-8") as f, open(args.out, "w", encoding="utf-8") as o:
        for line in f:
            row = json.loads(line)
            st2, row = rescore(row, args.pack)
            counts[st2] = counts.get(st2, 0) + 1
            if st2 == "MISMATCH":
                badrows.append(row)
                badids.append(row["id"])
            o.write(json.dumps(row, ensure_ascii=False) + "\n")
    with open(args.out.replace(".jsonl", "-ids.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(sorted(badids)) + "\n")
    print(args.pack, counts)
    if args.examples:
        for row in badrows[:20]:
            print("   ", row["id"], row.get("reasons"), "ratio2", row["ratio2"], "|", row.get("text"), "->", row.get("heard"))

if __name__ == "__main__":
    main()
