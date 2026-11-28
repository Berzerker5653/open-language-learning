#!/usr/bin/env python3
"""FIX-WRITE-PRACTICE-FORMS-001 (review S-D1) — pre-generate ru lexicon forms[].

The free-writing usage chips and the typing/writing accepted-form matchers
(`used_targets`, `build_writing_tasks`) are forms-LIST-driven: an attempt
token credits a target only if it equals (normalized) a surface listed in
that entry's `forms[]`. Measured at HEAD before this lane, 0 of 4,071 RU
lexicon entries carried more than one form, so natural Russian inflections
(accusative «книгу», prepositional «доме») could never light a chip and were
additionally flagged "not in dictionary" — a learner-visible broken promise
(state/evidence/REVIEW-WRITE-PRACTICE-001/spec-verdict.md, S-D1).

This generator appends the dictionary-attested inflection paradigm of each
entry's primary form to its `forms[]`, reusing the pinned morphology
authorities the READER-FLOW-001 sidecar already trusts
(`scripts/build-morphology-table.py`):

    pymorphy3==2.0.6
    pymorphy3-dicts-ru==2.4.417150.4580142

Provenance posture (NEVER asserted as settled): the dictionary's word data
descends from OpenCorpora and the Zaliznyak grammar tables; the underlying
data licenses are marked for human review, same posture as the sidecar and
`scripts/build-grammar-labels.py`. Every touched entry carries the
derivation in its `notes` string, and entries stay `draft` — the
morphologically derived surfaces are unreviewed until a human pass.

Generation rules (deterministic):
  - the primary form is the is_primary entry or `forms[0]` (the RU pack's
    convention); its text is used as the parse key (U+0301 stripped);
  - single-token Cyrillic keys only — phrases, hyphenated multiword
    entries, and anything the parse key cannot normalize are skipped;
  - the top parse must be dictionary-attested (`DictionaryAnalyzer`) —
    pymorphy's predictive suffix model is refused, same gate as the sidecar;
  - the whole lexeme paradigm (`Parse.lexeme`) is kept; surfaces whose
    normalization (lowercase, U+0301-stripped, NFC — mirroring the app's
    `normalize_writing_token`) equals an already-listed form's are skipped;
  - added surfaces are sorted (locale-independent codepoint order) so the
    output is deterministic and a re-run is idempotent.

Only touched lines are re-serialized; untouched lines keep their bytes.

Usage:
    .venv/bin/python scripts/derive-ru-forms.py --write   # regenerate forms[]
    .venv/bin/python scripts/derive-ru-forms.py --check   # exit 1 on drift
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys

ACUTE = "\u0301"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEXICON_GLOB = os.path.join(ROOT, "languages", "ru-RU", "lexicon", "*.jsonl")

PROVENANCE = (
    " Inflected surface forms appended 2026-11-28 by "
    "scripts/derive-ru-forms.py from pymorphy3 2.0.6 + "
    "pymorphy3-dicts-ru 2.4.417150.4580142 (OpenCorpora/Zaliznyak "
    "tables; dictionary-attested lexeme paradigm only, predictive "
    "parses refused); morphologically derived, human review pending."
)


def norm(text: str) -> str:
    """Mirror the app's normalize_writing_token(Cyrillic): strip whitespace,
    strip U+0301, lowercase."""
    return "".join(
        c for c in text if not c.isspace() and c != ACUTE
    ).lower()


def is_single_cyrillic_token(text: str) -> bool:
    if not text or " " in text or not text.strip():
        return False
    for ch in text:
        if not ("\u0400" <= ch <= "\u04ff" or ch == "\u0451" or ch == ACUTE or ch == "-"):
            return False
    return True


def primary_text(entry: dict) -> str | None:
    forms = entry.get("forms") or []
    for f in forms:
        if f.get("is_primary") is True and f.get("text"):
            return f["text"]
    first = forms[0].get("text") if forms else None
    return first or None


def derive(morph, entry: dict) -> tuple[list[dict], str]:
    """Return (extra_form_objects, skipped_reason) for one entry."""
    primary = primary_text(entry)
    if primary is None:
        return [], "no-forms"
    key = primary.replace(ACUTE, "")
    if not is_single_cyrillic_token(key):
        return [], "phrase-or-unparsed"
    parsed = morph.parse(key)
    if not parsed:
        return [], "no-parse"
    top = parsed[0]
    if type(top.methods_stack[0][0]).__name__ != "DictionaryAnalyzer":
        return [], "predictive-only"
    seen = {norm(f.get("text", "")) for f in entry.get("forms", [])}
    added: list[dict] = []
    for p in top.lexeme:
        text = p.word
        if not text or not is_single_cyrillic_token(text):
            continue
        n = norm(text)
        if not n or n in seen:
            continue
        seen.add(n)
        added.append({"text": text})
    added.sort(key=lambda f: f["text"])
    return added, ""


def rewrite(entry: dict, added: list[dict]) -> dict:
    entry = dict(entry)
    entry["forms"] = list(entry.get("forms", [])) + added
    notes = entry.get("notes", "")
    entry["notes"] = notes + PROVENANCE
    return entry


def process(write: bool) -> tuple[dict, list[str]]:
    from pymorphy3 import MorphAnalyzer

    morph = MorphAnalyzer()
    stats = {
        "entries": 0,
        "touched": 0,
        "added_forms": 0,
        "skipped": {},
        "multi_before": 0,
        "multi_after": 0,
    }
    drift_files: list[str] = []
    for path in sorted(glob.glob(LEXICON_GLOB)):
        out_lines = []
        file_changed = False
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if not line.strip():
                    out_lines.append(line)
                    continue
                entry = json.loads(line)
                stats["entries"] += 1
                was_multi = len(entry.get("forms", [])) > 1
                if was_multi:
                    stats["multi_before"] += 1
                added, reason = derive(morph, entry)
                if added:
                    new_entry = rewrite(entry, added)
                    stats["touched"] += 1
                    stats["added_forms"] += len(added)
                    stats["multi_after"] += 1
                    file_changed = True
                    out_lines.append(
                        json.dumps(new_entry, ensure_ascii=False) + "\n"
                    )
                else:
                    stats["skipped"][reason or "no-new-forms"] = (
                        stats["skipped"].get(reason or "no-new-forms", 0) + 1
                    )
                    if was_multi:
                        stats["multi_after"] += 1
                    out_lines.append(line)
        # multi_after counts include pre-existing multi-form entries kept as-is
        if write:
            if file_changed:
                with open(path, "w", encoding="utf-8") as fh:
                    fh.writelines(out_lines)
        else:
            with open(path, encoding="utf-8") as fh:
                if fh.read() != "".join(out_lines):
                    drift_files.append(path)
    return stats, drift_files


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="regenerate forms[]")
    mode.add_argument("--check", action="store_true", help="exit 1 if committed lexicon has drifted")
    args = ap.parse_args()

    stats, drift_files = process(write=args.write)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    if args.check and drift_files:
        print("DRIFT in: " + ", ".join(os.path.relpath(p, ROOT) for p in drift_files), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
