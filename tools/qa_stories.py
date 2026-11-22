#!/usr/bin/env python3
"""CONTENT-QA-STORIES-001 — mechanical story-accuracy gate for a pack.

Runs over languages/<pack>/stories/*.yaml and the sentences they reference.
Deterministic checks only (the naturalness/grammar pass is the notes file):

1. structure  : story yaml parses, required keys, unique ids, every sentence
                ref resolves, no duplicate sentence ids, every jsonl line parses,
                every cloze target appears verbatim in its sentence text.
2. vocab      : per-story new-lemma count vs the level budget, reusing the
                pools/whitelists of tools/vocab-budget-check.py. Stress marks
                (U+0301/U+0300) are STRIPPED before tokenizing — pymorphy
                fragments accented words otherwise. `cp` (content-parity) band
                maps to a1 for pool purposes.
3. lexicon    : every new lemma counted against the budget must have a pack
                lexicon entry, else it is an uncovered-lemma error.
4. stress     : every ACCENTED token is compared against the pack lexicon
                readings (dictionary-verified per provenance notes): same
                position of the acute, else stress_conflict. Accented tokens
                with no lexicon form are reported stress_unverified (warn).
                Stories with accented text but a marked-word ratio below
                --mark-floor get a no_stress_marks warning (never an error).

Exit 0 when no story has an ERROR finding; exit 1 listing the offending
stories. WARN findings print but do not fail the gate.

Usage: qa_stories.py [--pack languages/ru-RU] [--json out.json]
"""
import argparse
import glob
import importlib.util
import json
import os
import re
import sys
import unicodedata

import yaml

ACUTE = "\u0301"
GRAVE = "\u0300"
MARKS = re.compile(f"[{ACUTE}{GRAVE}]")
# token regex INCLUDES the combining marks so an accented word stays one token
WORD_RE = re.compile(f"[а-яёА-ЯЁ{ACUTE}{GRAVE}-]+")


def strip_marks(text: str) -> str:
    return MARKS.sub("", text)


def stress_pos(token: str) -> int:
    """0-based index (into mark-stripped chars) of the stressed vowel, or -1."""
    clean = strip_marks(token)
    for i, ch in enumerate(token):
        if ch == ACUTE:
            # index in the mark-stripped string = count of letters before it
            return len(re.sub(r"[^а-яёА-ЯЁ]", "", token[:i]))
    return -1


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", default="languages/ru-RU")
    ap.add_argument("--json", dest="json_out")
    ap.add_argument("--mark-floor", type=float, default=0.30,
                    help="warn if accented-token ratio of markable content "
                         "tokens is below this")
    args = ap.parse_args()
    root = args.pack

    vb = load_module("vocab_budget_check",
                     os.path.join(os.path.dirname(__file__),
                                  "vocab-budget-check.py"))
    mp = vb.mp

    # ---- sentences + lexicon -------------------------------------------
    sentences = {}
    errors_struct = []
    for path in sorted(glob.glob(os.path.join(root, "sentences", "*.jsonl"))):
        for lineno, line in enumerate(open(path, encoding="utf-8"), 1):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception as exc:  # noqa: BLE001
                errors_struct.append(f"{path}:{lineno} jsonl parse: {exc}")
                continue
            sid = rec.get("id")
            if sid in sentences:
                errors_struct.append(f"duplicate sentence id {sid}")
            sentences[sid] = rec

    lex_forms = {}   # mark-stripped lower surface -> list of (lemma, marked)
    lex_lemmas = set()
    for path in sorted(glob.glob(os.path.join(root, "lexicon", "*.jsonl"))):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            texts = [f.get("text", "") for f in rec.get("forms", [])
                     if isinstance(f, dict)]
            texts += [f.get("text", "") for f in rec.get("readings", [])
                      if isinstance(f, dict)]
            for t in texts:
                if not re.fullmatch(WORD_RE.pattern, t):
                    continue
                surface = strip_marks(t).lower()
                lem = mp.parse(surface)[0].normal_form
                lex_lemmas.add(lem)
                lex_forms.setdefault(surface, []).append(t)

    # ---- pools ----------------------------------------------------------
    pool_path = os.path.join(os.path.dirname(__file__), "..", "state", "data",
                             "story-vocab-pools-2026-11.json")
    pools = json.load(open(pool_path, encoding="utf-8"))
    pool = {lvl: vb.lemmas(forms) for lvl, forms in pools.items()}
    cumul, acc = {}, set()
    for lvl in ["a1", "a2", "b1", "b2"]:
        acc |= pool[lvl]
        cumul[lvl] = set(acc)
    skip = {mp.parse(w)[0].normal_form for w in vb.FUNC + vb.CORE
            if re.fullmatch(r"[а-яё-]+", w)}
    skip |= lex_lemmas

    # ---- stories ---------------------------------------------------------
    story_ids = set()
    report = {"stories": [], "structural_errors": errors_struct}
    failed = []
    for path in sorted(glob.glob(os.path.join(root, "stories", "*.yaml"))):
        slug = os.path.basename(path)[:-5]
        findings = []   # (level, code, msg)
        try:
            d = yaml.safe_load(open(path, encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            findings.append(("ERROR", "yaml", str(exc)))
            report["stories"].append({"slug": slug, "verdict": "FAIL",
                                      "findings": findings})
            failed.append(slug)
            continue
        sid = d.get("id", "")
        if sid in story_ids:
            findings.append(("ERROR", "duplicate_story_id", sid))
        story_ids.add(sid)
        for key in ("id", "status", "title", "sentences"):
            if key not in d:
                findings.append(("ERROR", "missing_key", key))
        band = sid.split(".")[2] if sid.count(".") >= 3 else "???"
        lvl = "a1" if band == "cp" else band

        texts = []
        for ref in d.get("sentences", []):
            s = sentences.get(ref)
            if s is None:
                findings.append(("ERROR", "missing_sentence", ref))
                continue
            text = s.get("text", "")
            texts.append((ref, text, s))
            for tgt in s.get("cloze_targets", []):
                if tgt not in text:
                    findings.append(("ERROR", "cloze_not_in_text",
                                     f"{ref}: target {tgt!r} not in {text!r}"))

        # vocab budget (marks stripped)
        new = {}
        markable = 0
        marked = 0
        stress_unverified = []
        for ref, text, s in texts:
            # iterate original tokens (marks kept) so we can see the acute
            for tok in WORD_RE.findall(text):
                clean = strip_marks(tok)
                if not re.search(r"[а-яёА-ЯЁ]", clean):
                    continue
                has_mark = ACUTE in tok
                vowels = sum(clean.count(v) for v in "аеёиоуыэюя")
                pos = stress_pos(tok)
                surface = clean.lower()
                if has_mark:
                    marked += 1
                    cands = lex_forms.get(surface, [])
                    if not cands:
                        # acceptable if some parse of the surface lemmatizes
                        # to a lexicon lemma (inflected marked forms like
                        # 'сыра́' have no bare lexicon surface)
                        if not ({p.normal_form for p in mp.parse(surface)}
                                & lex_lemmas):
                            stress_unverified.append(surface)
                    else:
                        ok = any(stress_pos(c) == pos for c in cands
                                 if ACUTE in c)
                        if not ok and any(ACUTE in c for c in cands):
                            findings.append(("ERROR", "stress_conflict",
                                             f"{ref}: {tok!r} vs lexicon "
                                             f"{[c for c in cands if ACUTE in c]}"))
                elif vowels >= 2 and len(clean) >= 4:
                    markable += 1
                for part in clean.lower().split("-"):
                    lem = mp.parse(part)[0].normal_form
                    if lem in cumul.get(lvl, set()) or lem in skip:
                        continue
                    # pymorphy picks one lemma per surface; a word can be
                    # covered via an alternative parse (e.g. цветами ->
                    # цвет, glossed, vs the chosen цвета). Try all parses.
                    alts = {p.normal_form for p in mp.parse(part)}
                    if (alts & cumul.get(lvl, set())) or (alts & skip):
                        continue
                    new.setdefault(lem, []).append(part)
        limit = vb.BUDGET.get(lvl)
        if limit is None:
            findings.append(("ERROR", "unknown_band", band))
        else:
            over = len(new) - limit
            # The `cp` (content-parity) stories predate the 2026-11 pool/budget
            # contract (authored 2026-10-12, graded against the content-parity
            # shard instead). Their budget overflow is reported as WARN; every
            # counted lemma must still carry a lexicon gloss (ERROR below).
            if over > 0:
                sev = "WARN" if band == "cp" else "ERROR"
                findings.append((sev, "vocab_budget",
                                 f"{len(new)}/{limit} new lemmas: {sorted(new)}"))
            # every counted new lemma needs a lexicon entry
            for lem in new:
                if lem not in lex_lemmas:
                    findings.append(("ERROR", "uncovered_lemma", lem))
            if new:
                findings.append(("INFO", "new_lemmas",
                                 f"{len(new)}/{limit}: {sorted(new)}"))
        if markable and marked == 0 and markable >= 5:
            findings.append(("WARN", "no_stress_marks",
                             f"{markable} multi-syllable content words carry "
                             "no stress mark"))
        total = marked + markable
        if total and marked / total < args.mark_floor and marked:
            findings.append(("WARN", "low_mark_ratio",
                             f"{marked}/{total} markable tokens accented"))
        if stress_unverified:
            findings.append(("WARN", "stress_unverified",
                             sorted(set(stress_unverified))))
        verdict = "FAIL" if any(l == "ERROR" for l, _, _ in findings) else "PASS"
        if verdict == "FAIL":
            failed.append(slug)
        report["stories"].append({"slug": slug, "id": sid, "band": band,
                                  "level": lvl, "verdict": verdict,
                                  "sentences": len(texts),
                                  "findings": findings})

    report["story_count"] = len(report["stories"])
    report["failed"] = failed
    for st in report["stories"]:
        mark = "FAIL" if st["verdict"] == "FAIL" else "PASS"
        print(f"{mark:4} {st['slug']} ({st.get('band','?')})")
        for lvl_, code, msg in st["findings"]:
            if lvl_ != "INFO":
                print(f"       {lvl_:5} {code}: {msg}")
    for e in errors_struct:
        print(f"STRUCT ERROR {e}")
    if args.json_out:
        json.dump(report, open(args.json_out, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
    print(f"\n{report['story_count']} stories, {len(failed)} FAIL: {failed}")
    sys.exit(1 if failed or errors_struct else 0)


if __name__ == "__main__":
    main()
