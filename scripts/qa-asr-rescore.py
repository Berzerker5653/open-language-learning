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
RU_STAGE = re.compile(r"\b(смех|вздыхает|хихикает|шум|аплодисменты|музыка)\b")
LAUGH = re.compile(r"(?:[хф][ауыэ][-. ]*){2,}|(?:[hw]a[-. ]*){2,}|ふ[ふヴー]*(?:[ ]ふ[ふヴー]*)+|は[はぁー]*(?:[ ]は[はぁー]*)+|えへ|ふふ")
SUSTAIN = re.compile(r"([a-zа-яё])\1{5,}")

def clean_ru(s):
    s = s.lower().replace("ё", "е")
    s = "".join(c for c in s if c != "\u0301")
    return re.sub(r"\s+", " ", re.sub(r"[^а-яa-z0-9]", " ", s)).strip()

def rescore(row, pack):
    text, heard = row.get("text", ""), row.get("heard", "")
    if not heard:
        return row["status"], row
    stage = STAGE.findall(heard)
    stripped = STAGE.sub(" ", heard)
    reasons = []
    if stage or RU_STAGE.search(stripped):
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
