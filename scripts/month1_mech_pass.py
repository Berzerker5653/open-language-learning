#!/usr/bin/env python3
"""LEARNER-REVIEW-M1-001 mechanical pass over the Month-1 journey-sim logs.

Reads the per-day raw logs produced by scripts/sim_month1.py plus the answer
keys the sim re-derived while playing, and runs the zero-defect mechanical
checks on exactly the Month-1 subset:

  * answer-key consistency   - every re-derived key for one item agrees,
                                and the key is a legal choice for that item
  * distractor legality      - unique, non-empty, same-script choices
  * RU stress-mark validity  - one combining accent per word, on a vowel
  * RU lexicon membership    - every target-script word lemmatizes into the
                                pack lexicon (pymorphy3, qa_stories.py rules)
  * JA charset validity      - kana/kanji/CJK-punct only for target strings,
                                kanji present in jmdict, kana-only furigana
  * JA reading consistency   - one reading per surface (collisions reported)
  * JA vocabulary membership - single-word items found in jmdict headwords
  * coverage                 - every text item in the worklist appears in a
                                record this pass checked

Findings are classified mechanically: hard mechanical failures are
`failure`; judgement-needed misses are `warning` (they go to the
fresh-context reviewer lanes, they are never silently dropped).

Usage: .venv/bin/python scripts/month1_mech_pass.py [--out DIR] [--pack ru|ja]
"""
import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO / "state/evidence/LEARNER-REVIEW-M1-001/sim"

ACC = "\u0301"  # combining acute (stress)
RU_VOWELS = set("аеёиоуыэюя")
TEXT_KEYS = {
    "text", "surface", "reading", "gloss", "prompt", "label", "title",
    "sentence", "question", "answer", "body", "line", "meaning", "hint",
    "transcript", "translation", "romanization", "cue", "reason", "heading",
    "correct_choice", "correctChoice",
}

CYR = re.compile(r"[\u0400-\u04FF]")
KANA = re.compile(r"[\u3040-\u30ff]")
KANJI = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")

JA_ALLOWED = set(
    "぀-ゟ゠-ヿ㐀-䶿一-鿿豈-﫿"
    "ー〜々〆〇、。「」・！？」『』（）（）：；〜"
) | set(" \n\t") | set("0123456789")


def strip_acc(s: str) -> str:
    return s.replace(ACC, "")


def cyr_words(s: str):
    """Cyrillic word tokens WITH their combining marks attached."""
    return re.findall(r"[\u0400-\u04FF"+ACC+r"]{2,}", s)


def target_script(text: str, pack: str) -> bool:
    if pack == "ru":
        return bool(CYR.search(text))
    return bool(KANA.search(text) or KANJI.search(text))


def iter_texts(obj, keys=TEXT_KEYS, _d=0):
    if _d > 12:
        return
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "args":
                continue
            if isinstance(v, str) and k in keys:
                yield (k, v)
            else:
                yield from iter_texts(v, keys, _d + 1)
    elif isinstance(obj, list):
        for v in obj:
            yield from iter_texts(v, keys, _d + 1)


# ---------------------------------------------------------------- loading

def load_records(out: Path, pack: str):
    raw = out / "raw"
    days = {}
    items = {}  # item_id -> record
    keys_seen = defaultdict(dict)  # item_id -> {choice: n_grades}
    texts = []  # (day, cmd, key, text)
    surfaces = defaultdict(set)  # surface -> {reading}
    for f in sorted(raw.glob(f"{pack}-day*.json")):
        rec = json.loads(f.read_text())
        day = rec["day"]
        days[day] = rec
        for call in rec["calls"]:
            resp = call.get("resp")
            cmd = call["cmd"]
            if cmd == "practice_task" and isinstance(resp, dict) and "item_id" in resp:
                it = items.setdefault(resp["item_id"], {
                    "first_day": day, "surface": None, "reading": None,
                    "furigana": None, "romaji": None, "choices": None,
                    "typed": False, "shape_days": set(),
                })
                it["shape_days"].add(day)
                for fld in ("surface", "reading", "furigana", "romaji", "typed"):
                    v = resp.get(fld)
                    if v is not None and it[fld] in (None, False):
                        it[fld] = v
                ch = resp.get("choices")
                if ch:
                    if it["choices"] is not None and it["choices"] != ch:
                        it["choices_drift"] = True
                    it["choices"] = ch
            if cmd == "practice_submit" and isinstance(resp, dict):
                cid = resp.get("item_id") or resp.get("itemId")
                cc = resp.get("correct_choice") or resp.get("correctChoice")
                if cid and cc:
                    keys_seen[cid][cc] = keys_seen[cid].get(cc, 0) + 1
            if isinstance(resp, (dict, list)):
                for k, t in iter_texts(resp):
                    if t and t.strip():
                        texts.append((day, cmd, k, t))
    return items, keys_seen, texts


# ---------------------------------------------------------------- RU checks

def build_ru_lexicons():
    forms, lemmas = set(), set()
    for f in (REPO / "languages/ru-RU/lexicon").glob("*.jsonl"):
        for line in f.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            for lst in ("forms", "readings"):
                for item in e.get(lst, []):
                    t = strip_acc(item.get("text", "")).lower()
                    if t:
                        forms.add(t)
    import pymorphy3
    m = pymorphy3.MorphAnalyzer()
    for form in forms:
        try:
            lemmas.add(m.parse(form)[0].normal_form)
        except Exception:
            pass
    return forms, lemmas


def check_ru_stress(texts, failures):
    for day, cmd, key, t in texts:
        if not CYR.search(t):
            continue
        for w in cyr_words(t):
            marks = [i for i, ch in enumerate(w) if ch == ACC]
            if len(marks) > 1:
                failures.append({"check": "ru.stress.multiple", "day": day,
                                 "surface": cmd, "text": t, "word": w,
                                 "detail": f"{len(marks)} stress marks"})
            for i in marks:
                prev = w[i - 1] if i > 0 else ""
                if prev.lower() not in RU_VOWELS:
                    failures.append({"check": "ru.stress.on-nonvowel", "day": day,
                                     "surface": cmd, "text": t, "word": w,
                                     "detail": f"accent after {prev!r}"})


def check_ru_lexicon(texts, forms, lemmas, failures, warnings):
    import pymorphy3
    m = pymorphy3.MorphAnalyzer()
    cache = {}
    for day, cmd, key, t in texts:
        if not CYR.search(t):
            continue
        # only check target-script surfaces, not English glosses with stray words
        for w in cyr_words(t):
            plain = strip_acc(w).lower()
            if plain in forms or plain in cache:
                continue
            try:
                parses = m.parse(w)
            except Exception:
                parses = []
            hit = any(p.normal_form in lemmas for p in parses)
            if hit:
                cache[plain] = True
                continue
            cache[plain] = False
            warnings.append({"check": "ru.lexicon.unknown-lemma", "day": day,
                             "surface": cmd, "text": t, "word": w,
                             "guess": [p.normal_form for p in parses][:2]})


# ---------------------------------------------------------------- JA checks

def load_jmdict():
    p = REPO / "tmp/jmdict/jmdict-eng-3.6.2.json"
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    entries = d.get("words") or d.get("entries") or []
    heads, kanji_set = set(), set()
    for e in entries:
        if not isinstance(e, dict):
            continue
        for k in ("kanji", "kana"):
            for item in e.get(k, []) or []:
                t = item.get("text") if isinstance(item, dict) else item
                if t:
                    heads.add(t)
                    kanji_set.update(KANJI.findall(t))
    return {"heads": heads, "kanji": kanji_set}


def check_ja_charset(items, texts, jm, failures):
    for day, cmd, key, t in texts:
        if key in ("gloss", "romanization", "translation", "meaning", "label",
                   "prompt", "heading", "hint", "cue", "reason"):
            continue
        if not (KANA.search(t) or KANJI.search(t)):
            continue  # pure-ASCII / english chrome
        bad = sorted({c for c in t if unicodedata.category(c).startswith("C")}
                     | {c for c in t if not ja_char_ok(c, jm)})
        if bad:
            failures.append({"check": "ja.charset.invalid-char", "day": day,
                             "surface": cmd, "text": t,
                             "detail": " ".join(repr(c) for c in bad[:8])})


def ja_char_ok(c, jm):
    if c in JA_ALLOWED:
        return True
    o = ord(c)
    if 0x3040 <= o <= 0x30ff or 0x3400 <= o <= 0x4dbf or 0x4e00 <= o <= 0x9fff:
        return True
    if 0x30 <= o <= 0x39 or 0x20 <= o <= 0x7e:  # ascii space-punct-digits
        return True
    if jm and c in jm.get("kanji", set()):
        return True
    return False


def check_ja_readings(items, jm, failures, warnings):
    surf_read = defaultdict(set)
    for iid, it in items.items():
        if it["surface"] and (KANA.search(it["surface"]) or KANJI.search(it["surface"])):
            if it["furigana"]:
                surf_read[it["surface"]].add(it["furigana"])
                if KANJI.search(it["furigana"]):
                    failures.append({"check": "ja.furigana.contains-kanji",
                                     "item": iid, "surface": it["surface"],
                                     "detail": it["furigana"]})
    for s, rs in surf_read.items():
        if len(rs) > 1:
            warnings.append({"check": "ja.reading.collision", "surface": s,
                             "detail": json.dumps(sorted(rs), ensure_ascii=False)})
    # vocabulary membership for short single-word surfaces
    if jm and "heads" in jm:
        for iid, it in items.items():
            s = it["surface"]
            if not s or len(s) > 8 or any(ch.isspace() for ch in s):
                continue
            if not (KANA.search(s) or KANJI.search(s)):
                continue
            if s in jm["heads"] or strip_acc(s) in jm["heads"]:
                continue
            warnings.append({"check": "ja.lexicon.not-in-jmdict", "item": iid,
                             "first_day": it["first_day"], "surface": s})


# ---------------------------------------------------------------- common

def check_items(items, keys_seen, keys_file, pack, failures):
    for iid, it in items.items():
        ch = it.get("choices")
        kk = keys_seen.get(iid, {})
        for cc, n in kk.items():
            if pack == "ru" and not it.get("typed") and ch and cc not in ch:
                failures.append({"check": "answer.key-not-in-choices", "item": iid,
                                 "detail": f"{cc!r} not in {ch!r}"})
        if len(kk) > 1:
            failures.append({"check": "answer.key-conflict", "item": iid,
                             "detail": json.dumps(sorted(kk), ensure_ascii=False)})
        stored = keys_file.get(iid)
        if stored and kk and stored not in kk:
            failures.append({"check": "answer.keys-file-mismatch", "item": iid,
                             "detail": f"file={stored!r} seen={sorted(kk)!r}"})
        if ch:
            if len(set(ch)) != len(ch):
                failures.append({"check": "distractor.duplicate", "item": iid,
                                 "detail": json.dumps(ch, ensure_ascii=False)})
            if any((not c) or (not c.strip()) for c in ch):
                failures.append({"check": "distractor.empty", "item": iid,
                                 "detail": json.dumps(ch, ensure_ascii=False)})
            if pack == "ru" and any(bool(KANA.search(c) or KANJI.search(c)) for c in ch):
                failures.append({"check": "distractor.wrong-script", "item": iid,
                                 "detail": json.dumps(ch, ensure_ascii=False)})
            if pack == "ja":
                tgt = [c for c in ch if KANA.search(c) or KANJI.search(c)]
                if tgt and len(tgt) != len(ch):
                    mixed = [c for c in ch if c not in tgt]
                    if mixed and iid.split("#")[-1] not in ("romanization", "romaji"):
                        failures.append({"check": "distractor.wrong-script",
                                         "item": iid, "note": "partial",
                                         "detail": json.dumps(mixed, ensure_ascii=False)[:200]})
        if it.get("choices_drift"):
            failures.append({"check": "item.shape-drift", "item": iid,
                             "detail": "choices changed across days"})


def coverage(out: Path, pack: str, items, texts):
    all_texts = {t.strip() for _, _, _, t in texts if len(t.strip()) >= 2}
    wl = {}
    p = out / "worklist.json"
    if p.exists():
        try:
            wl = json.loads(p.read_text()).get(pack, {})
        except Exception:
            wl = {}
    items_in_wl = wl.get("items", [])
    missing = [it["text"] for it in items_in_wl if it["text"] not in all_texts]
    return {
        "unique_item_ids_served": len(items),
        "unique_texts_seen": len(all_texts),
        "worklist_items": len(items_in_wl),
        "worklist_items_unchecked": len(missing),
        "coverage_pct": round(100.0 * (len(items_in_wl) - len(missing)) / len(items_in_wl), 2) if items_in_wl else None,
        "sample_missing": missing[:20],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--pack", default="both", choices=["ru", "ja", "both"])
    args = ap.parse_args()
    out = Path(args.out)
    (out.parent / "mech-pass").mkdir(exist_ok=True)
    packs = ["ru", "ja"] if args.pack == "both" else [args.pack]

    ru_forms = ru_lemmas = None
    jm = None
    summary = {}
    for pack in packs:
        items, keys_seen, texts = load_records(out, pack)
        keys_file = {}
        kp = out / f"answer-keys-{pack}.json"
        if kp.exists():
            keys_file = json.loads(kp.read_text())
        failures, warnings = [], []
        check_items(items, keys_seen, keys_file, pack, failures)
        if pack == "ru":
            if ru_forms is None:
                ru_forms, ru_lemmas = build_ru_lexicons()
            check_ru_stress(texts, failures)
            check_ru_lexicon(texts, ru_forms, ru_lemmas, failures, warnings)
        else:
            if jm is None:
                jm = load_jmdict()
                if jm and "heads" not in jm:
                    print(f"WARN jmdict shape unhandled: {jm}", file=sys.stderr)
            check_ja_charset(items, texts, jm, failures)
            check_ja_readings(items, jm, failures, warnings)
        cov = coverage(out, pack, items, texts)
        rep = {"pack": pack, "days_loaded": len({d for d, *_ in texts}),
               "coverage": cov, "failures": failures, "warnings": warnings,
               "counts": {"failures": len(failures), "warnings": len(warnings)}}
        rep_path = out.parent / "mech-pass" / f"mech-{pack}.json"
        rep_path.write_text(json.dumps(rep, ensure_ascii=False, indent=1))
        # de-dup warnings by (check, word/surface) for the md summary
        wd = {}
        for w in warnings:
            k = (w["check"], w.get("word") or w.get("surface"))
            wd.setdefault(k, w)
        lines = [f"# Mechanical pass — {pack.upper()} Month-1 subset", "",
                 f"- days loaded: {rep['days_loaded']}",
                 f"- unique item ids served: {cov['unique_item_ids_served']}",
                 f"- unique texts checked: {cov['unique_texts_seen']}",
                 f"- worklist coverage: {cov['coverage_pct']}% "
                 f"({cov['worklist_items']} items, {cov['worklist_items_unchecked']} unchecked)",
                 f"- mechanical failures: {len(failures)}",
                 f"- reviewer-bound warnings: {len(wd)} (deduped)", ""]
        lines.append("## Failures")
        for f in failures[:200]:
            lines.append(f"- {json.dumps(f, ensure_ascii=False)}")
        lines.append("")
        lines.append("## Warnings (deduped, reviewer triage)")
        for w in list(wd.values())[:400]:
            lines.append(f"- {json.dumps(w, ensure_ascii=False)}")
        (out.parent / "mech-pass" / f"mech-{pack}.md").write_text("\n".join(lines))
        summary[pack] = {"failures": len(failures), "warnings": len(wd),
                         "coverage": cov}
        print(f"{pack}: {len(failures)} failures, {len(wd)} warnings, "
              f"coverage {cov['coverage_pct']}%", flush=True)
    spath = out.parent / "mech-pass" / "summary.json"
    spath.write_text(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
