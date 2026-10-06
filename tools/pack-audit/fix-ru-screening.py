#!/usr/bin/env python3
"""Fix ru-RU lexicon errors found by the 2026-10-05 AI screening pass.

Deterministic fixes only (authorities: Zaliznyak 6th ed. via tmp/zaliznyak, pymorphy3):
1. Stress: писа́ть -> пи́сать (x2), дорого́й -> доро́гой (gloss 'expensive' = adjective).
2. POS: правда particle -> noun (feminine); 20 adjectival-participle forms mislabeled
   verb -> adjective (confirmed via pymorphy3).
3. Gender: fill noun gender for entries missing it, via pymorphy3 (unambiguous only).
"""
import json, glob, os, sys
import pymorphy3

ROOT = os.path.dirname(os.path.abspath(__file__)) + "/.."
LEX = sorted(glob.glob(os.path.join(ROOT, "languages/ru-RU/lexicon/*.jsonl")))

STRESS_FIX = {
    "ru.lex.pastevents.pisat": ("писа́ть", "пи́сать"),
    "ru.lex.routines.pisat": ("писа́ть", "пи́сать"),
    "ru.lex.shopping.dorogoy": ("дорого́й", "доро́гой"),
}
POS_FIX = {
    "ru.lex.messages.pravda": ("noun", "feminine"),
    "ru.lex.shopping.dorogoy": ("adjective", "masculine"),
}
morph = pymorphy3.MorphAnalyzer()
GEND = {"m": "masculine", "f": "feminine", "n": "neuter"}

def is_adjectival(form):
    t = form.replace("\u0301", "")
    return t.endswith(("ый", "ий", "ый", "аго", "яя", "ее")) or t.endswith(("нный", "нный", "ущий", "ющий", "имый", "емый"))

changed = 0
for path in LEX:
    lines = open(path, encoding="utf-8").read().splitlines()
    out = []
    for line in lines:
        e = json.loads(line)
        eid = e["id"]
        form = e["forms"][0]["text"]
        before = json.dumps(e, ensure_ascii=False, sort_keys=True)

        if eid in STRESS_FIX:
            old, new = STRESS_FIX[eid]
            for r in e.get("readings", []):
                if r["text"] == old:
                    r["text"] = new
        if eid in POS_FIX:
            pos, g = POS_FIX[eid]
            e["part_of_speech"] = pos
            if g:
                e["gender"] = g

        # systematic: pos=verb but adjectival form -> confirm with pymorphy3
        if e.get("part_of_speech") == "verb" and is_adjectival(form):
            tag = morph.parse(form.replace("\u0301", ""))[0]
            if str(tag.tag).find("ADJF") >= 0 or str(tag.tag).find("PRTF") >= 0:
                e["part_of_speech"] = "adjective"

        # systematic: noun missing gender -> pymorphy3, unambiguous only
        if e.get("part_of_speech") == "noun" and not e.get("gender"):
            tag = morph.parse(form.replace("\u0301", ""))[0]
            g = tag.tag.gender
            if g and str(tag.tag).find("mult") < 0:
                mapped = GEND.get(str(g))
                if mapped:
                    e["gender"] = mapped
        after = json.dumps(e, ensure_ascii=False, sort_keys=True)
        if after != before:
            changed += 1
            out.append(json.dumps(e, ensure_ascii=False))
        else:
            out.append(line)
    open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
print("entries changed:", changed)
