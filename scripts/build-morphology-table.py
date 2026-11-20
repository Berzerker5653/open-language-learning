#!/usr/bin/env python3
"""READER-FLOW-001 (Lane E) — build the ru pack's lemmatizer sidecar.

Maps every surface form occurring in the pack's sentences to its
dictionary form plus pymorphy3's grammeme string, and commits the
result into the pack as `media/lemmas.jsonl` — a declared data sidecar
following the `media/words.jsonl` precedent (whitelisted in
`crates/langpack/src/audit.rs`; NO manifest row, NO audio). No runtime
network: the reader's word card resolves `printed form -> dictionary
form` from this committed file alone (state/notes/READER-FLOW-001.md,
WORD-CARD-AUDIO-001.md).

Pinned authorities (pip; both declare MIT for the code layer):
    pymorphy3==2.0.6
    pymorphy3-dicts-ru==2.4.417150.4580142
Provenance posture (NEVER asserted as settled): the dictionary's word
data descends from OpenCorpora and the Zaliznyak grammar tables; the
underlying data licenses are marked for human review, same posture as
`scripts/build-grammar-labels.py`, `tools/vocab-budget-check.py` and
the READER-FLOW-001 contract (`state/notes/READER-FLOW-001.md`).

Key normalization ("norm-token", shared verbatim with the app's
`word_card` / `story_word_audio` commands): remove every U+0301
combining acute, lowercase, strip leading/trailing characters that are
not Unicode letters, NFC.

Tokens the dictionary does not attest get NO row: pymorphy's predictive
suffix model happily tags garbage ("щзщщж" -> nom.sg), so the top parse
must come from the dictionary itself — the same gate
`scripts/build-grammar-labels.py` applies.

Usage:
    python3 scripts/build-morphology-table.py --write   # regenerate the sidecar
    python3 scripts/build-morphology-table.py --check   # exit 1 if it drifts
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
OUT = os.path.join(ROOT, "languages", "ru-RU", "media", "lemmas.jsonl")


def norm_token(token: str) -> str:
    """norm-token per the frozen READER-FLOW-001 wire contract: remove
    U+0301, lowercase, strip leading/trailing non-letters, NFC. The Rust
    side (`word_card` / `story_word_audio` in src-tauri) mirrors this
    rule; pack text is authored NFC."""
    s = token.replace(ACUTE, "").lower()
    start = 0
    end = len(s)
    while start < end and not s[start].isalpha():
        start += 1
    while end > start and not s[end - 1].isalpha():
        end -= 1
    return unicodedata.normalize("NFC", s[start:end])


def row_for(morph, key: str) -> dict | None:
    """One sidecar row for a norm-token key, or None when the dictionary
    does not attest the form (predictive-model parses are refused)."""
    parsed = morph.parse(key)
    if not parsed:
        return None
    if type(parsed[0].methods_stack[0][0]).__name__ != "DictionaryAnalyzer":
        return None
    return {"surface": key, "lemma": parsed[0].normal_form, "tag": str(parsed[0].tag)}


def sentence_texts() -> list[str]:
    """Every `languages/ru-RU/sentences/*.jsonl` entry's `text` (story
    sentences live in those shards), in file-name order."""
    texts: list[str] = []
    for path in sorted(glob.glob(SENTENCES_GLOB)):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            text = e.get("text")
            if text:
                texts.append(text)
    return texts


def build_rows(morph, texts: list[str] | None = None) -> list[dict]:
    """One row per unique norm-token key, sorted by surface in byte
    order over the normalized key (deterministic across runs)."""
    rows: dict[str, dict] = {}
    for text in sentence_texts() if texts is None else texts:
        for tok in text.split():
            key = norm_token(tok)
            if not key or key in rows:
                continue
            row = row_for(morph, key)
            if row:
                rows[key] = row
    return [rows[k] for k in sorted(rows, key=lambda k: k.encode("utf-8"))]


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
        print(f"wrote {OUT}: {content.count(chr(10))} surface-form rows")
        return 0
    current = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
    if current != content:
        print(f"DRIFT: {OUT} does not match regeneration", file=sys.stderr)
        return 1
    print(f"check OK: {OUT} matches regeneration")
    return 0


if __name__ == "__main__":
    sys.exit(main())
