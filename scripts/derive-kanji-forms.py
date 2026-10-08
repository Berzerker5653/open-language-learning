#!/usr/bin/env python3
"""Derive kanji forms (and reference bands) for the ja-JP lexicon (K-48).

Reads the jmdict-simplified release JSON (the source the pack already
registers as ``jmdict-simplified``) and, for every entry in
``languages/ja-JP/lexicon/*.jsonl`` whose kana reading exactly matches a
dictionary reading, may add ONE kanji form. Stdlib only; no network at
run time. Run: python3 scripts/derive-kanji-forms.py [--dry-run]

DETERMINISTIC ADDITION RULE (no fuzzy heuristics, never a guess):
  1. Key = the entry's kana reading text (the reading whose script is
     "hiragana"/"katakana"), matched EXACTLY against dictionary kana
     headwords. No normalization, no fuzzy matching.
  2. Candidate kanji spellings = every kanji form of every matched
     dictionary record such that (a) the matched kana entry's
     appliesToKanji covers that kanji form ("*" or the exact text),
     (b) the form contains at least one CJK ideograph (a form identical
     to the kana reading is not a kanji form), and (c) jmdict-simplified
     marks that form common=true. If no candidate is marked common, the
     candidates marked common=false for the same reading are used as a
     fallback (rare-word spellings). Candidates are distinct texts in
     dictionary order.
  3. Add exactly one form when:
       - exactly one distinct candidate spelling matches the reading, OR
       - several match but only ONE is plausible given the entry's own
         glosses: a candidate is plausible when at least one English
         gloss word of a sense that applies to BOTH that kanji form and
         the matched reading (sense appliesToKanji/appliesToKana cover
         them) shares a case-insensitive alphabetic token (length >= 4)
         with the entry's glosses.
     Otherwise the match is AMBIGUOUS: the entry stays kana-only and
     notes records which spellings were candidates and why no single
     one is singled out.
  4. No dictionary reading match: entry untouched, counted.

Invariants: never change an existing form's is_primary, never rewrite
glosses, never delete fields; only appends to notes (guarded by an
idempotency marker) and appends new form objects. Idempotent: a second
run changes nothing (entries already carrying a CJK form are skipped;
notes carry a per-dictionary-version marker).

BANDS (reference alignment only, never a JLPT/certification claim,
docs/18): ``band`` is set ONLY on evidence -
  - the entry id is referenced by an on-ramp/A1 goal in
    curriculum/goals.yaml (required_concepts / prerequisite targets) ->
    that goal's band (lowest if several), and/or
  - the entry's kana reading is a headword of the jmdict-simplified
    common subset -> A1.
Otherwise band stays absent. ``framework_refs`` is schema-supported but
never written here (the lexicon's framework evidence lives in sources).
"""

import argparse
import json
import re
import sys
from pathlib import Path

BAND_ORDER = {"on-ramp": 0, "A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
BAND_EVIDENCE_GOALS = {"on-ramp", "A1"}
CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
KANA_SCRIPTS = {"hiragana", "katakana"}
NOTE_MARKER = "Kanji-form check (jmdict-simplified"


def is_cjk(text):
    return bool(CJK_RE.search(text))


def tokens(text):
    return {t for t in re.findall(r"[a-z]+", text.lower()) if len(t) >= 4}


def load_dictionary(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_reading_index(doc):
    """kana text -> list of (word, kana-entry) pairs."""
    index = {}
    for word in doc["words"]:
        for kana in word.get("kana", []):
            index.setdefault(kana["text"], []).append((word, kana))
    return index


def candidate_forms(match, kana_reading):
    """Distinct kanji spellings applying to this exact kana reading.

    Returns (common_candidates, all_candidates) in dictionary order.
    """
    common, every = [], []
    seen_common, seen_all = set(), set()
    for word, kana_entry in match:
        applies = kana_entry.get("appliesToKanji", [])
        for kanji in word.get("kanji", []):
            text = kanji["text"]
            if text == kana_reading or not is_cjk(text):
                continue
            if not ("*" in applies or text in applies):
                continue
            if text not in seen_all:
                seen_all.add(text)
                every.append(text)
            if kanji.get("common") and text not in seen_common:
                seen_common.add(text)
                common.append(text)
    return common, every


def candidate_gloss_tokens(word, kana_entry, kanji_text, kana_reading):
    out = set()
    for sense in word.get("sense", []):
        ak, ana = sense.get("appliesToKanji", []), sense.get("appliesToKana", [])
        if not ("*" in ak or kanji_text in ak):
            continue
        if not ("*" in ana or kana_reading in ana):
            continue
        for gloss in sense.get("gloss", []):
            if gloss.get("lang") in (None, "eng"):
                out |= tokens(gloss.get("text", ""))
    return out


def parse_goal_bands(path):
    """lexicon/expr id -> lowest band of any on-ramp/A1 goal referencing it."""
    refs = {}
    band, ids = None, set()

    def flush(goal_id):
        if band in BAND_EVIDENCE_GOALS:
            for lex_id in ids:
                if lex_id not in refs or BAND_ORDER[band] < BAND_ORDER[refs[lex_id]]:
                    refs[lex_id] = band

    started = False
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        m = re.match(r"^  - id: (\S+)", line)
        if m:
            if started:
                flush(goal_id)
            goal_id, band, ids, started = m.group(1), None, set(), True
            continue
        if not started:
            continue
        m = re.match(r"^    band: (\S+)", line)
        if m:
            band = m.group(1)
        ids.update(re.findall(r"ja\.(?:lex|expr)\.[A-Za-z0-9._-]+", line))
    if started:
        flush(goal_id)
    return refs


def append_note(entry, note):
    existing = entry.get("notes", "")
    if NOTE_MARKER in existing:
        return False
    entry["notes"] = f"{existing} {note}" if existing else note
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dict", dest="dict_path", default="tmp/jmdict/jmdict-eng-3.6.2.json")
    ap.add_argument("--common-dict", dest="common_path",
                    default="tmp/jmdict/jmdict-eng-common-3.6.2.json")
    ap.add_argument("--pack", default="languages/ja-JP")
    ap.add_argument("--dry-run", action="store_true", help="print counts, write nothing")
    args = ap.parse_args()

    pack = Path(args.pack)
    lex_dir = pack / "lexicon"
    doc = load_dictionary(args.dict_path)
    dict_version = doc["version"]
    run_date = __import__("datetime").date.today().isoformat()
    index = build_reading_index(doc)
    common_doc = load_dictionary(args.common_path)
    common_kana = {k["text"] for w in common_doc["words"] for k in w.get("kana", [])}
    goal_bands = parse_goal_bands(pack / "curriculum" / "goals.yaml")

    counts = {
        "entries": 0, "already_had_kanji_form": 0,
        "added_unique_reading_match": 0, "added_gloss_disambiguated": 0,
        "ambiguous_noted": 0, "dict_match_no_kanji_form": 0, "no_dict_match": 0,
        "no_kana_reading": 0, "band_on-ramp": 0, "band_A1": 0, "band_unchanged": 0,
    }
    changed_files = 0

    for path in sorted(lex_dir.glob("*.jsonl")):
        original = path.read_text(encoding="utf-8")
        lines = original.splitlines()
        out_lines = []
        dirty = False
        for line in lines:
            if not line.strip():
                out_lines.append(line)
                continue
            entry = json.loads(line)
            counts["entries"] += 1
            forms = entry.get("forms", [])

            kana_reading = next(
                (r["text"] for r in entry.get("readings", [])
                 if r.get("script") in KANA_SCRIPTS), None)

            if any(is_cjk(f.get("text", "")) for f in forms):
                counts["already_had_kanji_form"] += 1
            elif kana_reading is None:
                counts["no_kana_reading"] += 1
            else:
                match = index.get(kana_reading)
                if not match:
                    counts["no_dict_match"] += 1
                else:
                    common_cands, all_cands = candidate_forms(match, kana_reading)
                    cands = common_cands or all_cands
                    if not cands:
                        counts["dict_match_no_kanji_form"] += 1
                    else:
                        chosen = None
                        if len(cands) == 1:
                            chosen = cands[0]
                            counts["added_unique_reading_match"] += 1
                        else:
                            entry_tokens = set()
                            for vals in entry.get("glosses", {}).values():
                                for g in vals:
                                    entry_tokens |= tokens(g)
                            plausible = []
                            for cand in cands:
                                cand_tokens = set()
                                for word, kana_entry in match:
                                    cand_tokens |= candidate_gloss_tokens(
                                        word, kana_entry, cand, kana_reading)
                                if entry_tokens & cand_tokens:
                                    plausible.append(cand)
                            if len(plausible) == 1:
                                chosen = plausible[0]
                                counts["added_gloss_disambiguated"] += 1
                            else:
                                counts["ambiguous_noted"] += 1
                                listed = ", ".join(cands[:6])
                                more = f" (+{len(cands) - 6} more)" if len(cands) > 6 else ""
                                appended = append_note(entry, (
                                    f"{NOTE_MARKER} {dict_version}): reading {kana_reading!r} has "
                                    f"{len(cands)} kanji spellings in the dictionary "
                                    f"({listed}{more}) and the entry's glosses single none of "
                                    "them out, so no kanji form was added "
                                    f"(ai-assisted dictionary check, unreviewed; {run_date})."))
                                dirty = dirty or appended
                        if chosen is not None:
                            forms.append({"text": chosen, "script": "ja.orth.kanji",
                                          "is_primary": False})
                            entry["forms"] = forms
                            append_note(entry, (
                                f"{NOTE_MARKER} {dict_version}): kanji form {chosen!r} derived "
                                f"by exact reading match, ai-assisted, unreviewed ({run_date})."))
                            dirty = True

            # Band: evidence only (goal tie from an on-ramp/A1 goal, or common-subset headword).
            if "band" not in entry:
                band = goal_bands.get(entry["id"])
                source = "goal" if band else None
                if kana_reading and kana_reading in common_kana:
                    if band is None or BAND_ORDER["A1"] < BAND_ORDER[band]:
                        band, source = "A1", "common"
                    else:
                        source = "goal"
                if band:
                    rebuilt = {}
                    for key, value in entry.items():
                        if key == "sources":
                            rebuilt["band"] = band
                        rebuilt[key] = value
                    entry = rebuilt
                    counts[f"band_{band}"] += 1
                    dirty = True
                else:
                    counts["band_unchanged"] += 1
            else:
                counts[f"band_{entry['band']}"] += 1

            out_lines.append(json.dumps(entry, ensure_ascii=False))
        if dirty and not args.dry_run:
            path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
            changed_files += 1

    print(f"jmdict-simplified version: {dict_version}")
    print(f"files: {len(list(lex_dir.glob('*.jsonl')))}, changed: "
          f"{0 if args.dry_run else changed_files}{' (dry-run)' if args.dry_run else ''}")
    for key in ("entries", "already_had_kanji_form", "added_unique_reading_match",
                "added_gloss_disambiguated", "ambiguous_noted", "dict_match_no_kanji_form",
                "no_dict_match", "no_kana_reading", "band_on-ramp", "band_A1",
                "band_unchanged"):
        print(f"{key}: {counts[key]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
