#!/usr/bin/env python3
"""GRAMMAR-LABELS-001 — build the ru pack's interlinear grammar-label sidecar.

Precomputes, for every pack sentence, a compact grammar label per token
(noun/adjective: case+number; verb: aspect+tense) from pymorphy3, and
commits the result into the pack as `media/labels.jsonl` — a declared
data sidecar following the `media/words.jsonl` precedent (whitelisted in
`crates/langpack/src/audit.rs`; NO manifest row, NO audio). No runtime
network: the app only ever reads the committed file.

Pinned authorities (pip; both declare MIT for the code layer):
    pymorphy3==2.0.6
    pymorphy3-dicts-ru==2.4.417150.4580142
Provenance posture (NEVER asserted as settled): the dictionary's word
data descends from OpenCorpora and the Zaliznyak grammar tables; the
underlying data licenses are marked for human review, same posture as
`tools/vocab-budget-check.py` and the READER-FLOW-001 contract
(`state/notes/READER-FLOW-001.md`).

Stress posture (honest limitation, recorded on the card): pymorphy's
OpenCorpora-based dictionary carries NO word stress, so this sidecar
carries labels only — it never guesses stress for inflected forms.
Stress shown in the reader stays pack-sourced: the lexicon `readings`
fields (e.g. "вы́борка") and any acute already in the authored text.
Full inflected-form stress needs a cleared stress authority; see
`state/notes/GRAMMAR-LABELS-001.md`.

Usage:
    python3 scripts/build-grammar-labels.py --write   # regenerate the sidecar
    python3 scripts/build-grammar-labels.py --check   # exit 1 if it drifts
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys
import unicodedata

ACUTE = "\u0301"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SENTENCES_GLOB = os.path.join(ROOT, "languages", "ru-RU", "sentences", "*.jsonl")
OUT = os.path.join(ROOT, "languages", "ru-RU", "media", "labels.jsonl")


def tokenize(text: str) -> list[str]:
    """Split exactly like the frontend reader: on whitespace runs. Raw
    tokens (punctuation intact) are stored so the app can verify alignment
    before attaching a label."""
    return text.split()


# OpenCorpora gramtab -> compact learner labels (gen.sg style).
CASE = {
    "nomn": "nom",
    "gent": "gen",
    "datv": "dat",
    "accs": "acc",
    "ablt": "ins",
    "voct": "voc",
    "loct": "prep",
}
NUM = {"sing": "sg", "plur": "pl"}
ASPECT = {"impf": "impf", "perf": "perf"}
TENSE = {"past": "past", "pres": "pres", "prtv": "fut"}  # futb folds into the
# participle/predictive future below via the tag string.


def label_for(tag) -> str | None:
    """Compact label per the card: nouns/adjectives -> case+number; verbs ->
    aspect+tense. Everything else (particles, adpositions, pronouns beyond
    case, numerals...) gets NO label — the reader degrades to bare text
    rather than noise. `tag` is a pymorphy3 Tag."""
    grammemes = set(tag.grammemes)
    pos = grammemes & {"NOUN", "ADJF", "ADJS", "COMP", "VERB", "INFN", "PRTF", "GRND"}
    if not pos:
        return None
    if "VERB" in pos or "INFN" in pos or "PRTF" in pos or "GRND" in pos:
        parts: list[str] = []
        aspect = ASPECT.get(next(iter(grammemes & set(ASPECT)), ""))
        # Tense: past/present are explicit; perfective non-past IS future,
        # and the analytic future (futb: "буду читать") reads as future too.
        tense = TENSE.get(next(iter(grammemes & set(TENSE)), ""))
        if "futb" in grammemes:
            tense = "fut"
        if tense is None and "perf" in grammemes and "past" not in grammemes and "pres" not in grammemes:
            tense = "fut"
        if "INFN" in pos:
            return "inf" + (f".{aspect}" if aspect else "")
        if aspect or tense:
            if "PRTF" in pos or "GRND" in pos:
                kind = "part" if "PRTF" in pos else "ger"
                return ".".join(x for x in (kind, aspect, tense) if x)
            return ".".join(x for x in (aspect, tense) if x) or None
        return None
    # noun / adjective / adjective-short / comparative: case + number
    parts = []
    case = CASE.get(next(iter(grammemes & set(CASE)), ""))
    num = NUM.get(next(iter(grammemes & set(NUM)), ""))
    if case:
        parts.append(case)
    if num:
        parts.append(num)
    return ".".join(parts) or None


def build_rows(morph) -> list[dict]:
    rows: list[dict] = []
    seen_ids: set[str] = set()
    for path in sorted(glob.glob(SENTENCES_GLOB)):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            sid, text = e.get("id"), e.get("text")
            if not sid or not text or sid in seen_ids:
                continue
            seen_ids.add(sid)
            tokens = []
            for tok in tokenize(text):
                # Probe discipline mirrors the READER-FLOW norm-token:
                # drop authored stress (pymorphy's keys are unaccented) and
                # strip leading/trailing non-letters (attached punctuation
                # parses as UNKN). The sidecar keeps the RAW token so the
                # frontend can verify alignment before labeling.
                probe = unicodedata.normalize("NFC", tok.replace(ACUTE, ""))
                # keep only the inner letter core for the parse probe
                core = probe
                while core and not core[0].isalpha():
                    core = core[1:]
                while core and not core[-1].isalpha():
                    core = core[:-1]
                probe = core
                if not probe:
                    continue
                parsed = morph.parse(probe)
                if not parsed:
                    continue
                # Dictionary-attested forms only: pymorphy's predictive
                # suffix model happily tags garbage ("щзщщж" -> nom.sg), so
                # the top parse must come from the dictionary itself.
                analyzer = type(parsed[0].methods_stack[0][0]).__name__
                if analyzer != "DictionaryAnalyzer":
                    continue
                lbl = label_for(parsed[0].tag)
                if lbl:
                    tokens.append({"t": tok, "l": lbl})
            if tokens:
                rows.append({"id": sid, "tokens": tokens})
    rows.sort(key=lambda r: r["id"])  # deterministic byte order
    return rows


def serialize(rows: list[dict]) -> str:
    return "".join(
        json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n" for r in rows
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="regenerate the sidecar")
    mode.add_argument("--check", action="store_true", help="fail on drift")
    args = ap.parse_args()

    import pymorphy3

    content = serialize(build_rows(pymorphy3.MorphAnalyzer()))
    if args.write:
        with open(OUT, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"wrote {OUT}: {content.count(chr(10))} sentence rows")
        return 0
    current = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
    if current != content:
        print(f"DRIFT: {OUT} does not match regeneration", file=sys.stderr)
        return 1
    print(f"check OK: {OUT} matches regeneration")
    return 0


if __name__ == "__main__":
    sys.exit(main())
