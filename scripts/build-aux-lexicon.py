#!/usr/bin/env python3
"""READER-FLOW-001 (off-pack slice) — build the offline auxiliary lexicon.

Builds `aux/lexicon/ru.jsonl`, the clearly-labeled OFFLINE auxiliary
lexicon the reader's word card falls back to for words the pack lexicon
does not cover (state/notes/READER-FLOW-001.md: "off-pack words open a
clearly-labeled card from an offline auxiliary lexicon (kaikki.org,
license-checked)"). The pack lexicon stays separate and trusted: this
file is never merged into `lexicon/**`, never scheduled, never taught.

License posture (checked at build time, recorded in provenance):
    Source: kaikki.org machine-readable Russian dictionary (extracted
    from English Wiktionary with wiktextract). kaikki.org publishes its
    data "under the same licenses as Wiktionary - both CC-BY-SA and
    GFDL" (https://kaikki.org/dictionary/, section "Copyright and
    license", accessed 2026-11-20).
    Consequence: the derived slice is re-hosted under CC-BY-SA/GFDL
    with attribution (aux/lexicon/LICENSE-kaikki.txt), and ShareAlike is the
    reason it stays a separate file — it must never be folded into the
    MIT-licensed pack lexicon, matching the card's "separate and
    trusted" contract. The app displays the attribution on every aux
    card.

Determinism: the slice contains no timestamps and no run-dependent
data; same input file -> byte-identical slice. The raw input is NOT
committed (948 MB); `--write` records its sha256/size/URL in
`aux/lexicon/ru.provenance.json` together with the slice sha256, so
`--check` (no input needed, CI-safe) proves the committed slice is the
tool's output for the pinned input, is internally valid, and ships the
CC-BY-SA/GFDL license text (aux/lexicon/LICENSE-kaikki.txt) that the Apache-2.0
repo root does not cover it with.

Slice rules (all recorded verbatim in provenance.slicer):
    - entry kept when lang_code == "ru", pos does not end in "redirect",
      the headword normalizes (norm-token) to a lowercase Cyrillic
      single token (internal hyphens kept), and none of its tags mark a
      proper name (proper-noun/surname/given-name/patronymic/toponym/
      place-name/ethnonym) — learner cards for place and family names
      add bulk without study value;
    - senses keep at most MAX_SENSES glosses (one per sense, first
      non-empty), whitespace-collapsed, truncated to MAX_GLOSS_CHARS on
      a whitespace boundary with a trailing ellipsis; a word with no
      glosses is dropped;
    - forms keep inflected single-token Cyrillic surfaces (acute U+0301
      stripped by normalization, romanizations fall out with the
      script filter), deduplicated, sorted, capped at MAX_FORMS — this
      is what lets a tapped inflected off-pack word hit its headword;
    - homographs of the same headword merge (pos union, gloss
      collection order is file order, capped);
    - rows sorted by headword in UTF-8 byte order.

Usage:
    python3 scripts/build-aux-lexicon.py --write --input kaikki.jsonl[.gz]
    python3 scripts/build-aux-lexicon.py --check
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUX_DIR = os.path.join(ROOT, "aux", "lexicon")
OUT = os.path.join(AUX_DIR, "ru.jsonl")
PROVENANCE = os.path.join(AUX_DIR, "ru.provenance.json")
# NOT "LICENSE-AUX": AUX is a Windows reserved device name and made
# actions/checkout fail on every windows-latest runner (FIX-WIN-RESERVED-NAME-001).
LICENSE_AUX = os.path.join(AUX_DIR, "LICENSE-kaikki.txt")

SOURCE_URL = "https://kaikki.org/dictionary/Russian/kaikki.org-dictionary-Russian.jsonl"
SOURCE_LICENSE = "CC-BY-SA + GFDL (Wiktionary terms; kaikki.org redistribution)"
SOURCE_PAGE = "https://kaikki.org/dictionary/"
ATTRIBUTION = "Definitions from Wiktionary via kaikki.org (CC BY-SA / GFDL)"

ACUTE = "\u0301"
MAX_SENSES = 3
MAX_GLOSS_CHARS = 200
MAX_FORMS = 12

# lowercase Cyrillic single token, internal hyphens kept (кто-то), NFC,
# stress marks already stripped by norm_token. The hard sign "ъ" never
# occurs in modern Russian words — it only rides in on pre-reform
# inflections (молокамъ) and Church Slavonic noise, so it is refused.
CYR_TOKEN = re.compile(r"^[а-яё][а-яё-]*$")
NO_HARD_SIGN = re.compile(r"^[^ъ]*$")

PROPER_NAME_TAGS = {
    "proper-noun",
    "surname",
    "given-name",
    "patronymic",
    "toponym",
    "place-name",
    "ethnonym",
}

# Entries tagged as belonging to older or non-standard registers are
# refused: learner stories almost never need them and they dominate the
# tail of the raw extraction.
AGE_TAGS = {
    "archaic",
    "obsolete",
    "historical",
    "dated",
    "dialectal",
    "dialect",
}

SLICER = (
    "lang_code=ru; pos not ending in 'redirect'; headword normalizes to a "
    "lowercase single-token Cyrillic word without 'ъ' (internal hyphens "
    "kept); entries tagged proper-noun/surname/given-name/patronymic/"
    "toponym/place-name/ethnonym or archaic/obsolete/historical/dated/"
    "dialect(al) are refused; at most 3 sense glosses (first per sense), "
    "whitespace-collapsed, truncated to 200 chars on a word boundary; "
    "inflected Cyrillic surfaces (no 'ъ') kept as lookup forms (dedup, "
    "sorted, cap 12); homographs merged; rows sorted by headword UTF-8 "
    "byte order"
)


def norm_token(token: str) -> str:
    """norm-token per the frozen READER-FLOW-001 wire contract (shared
    verbatim with scripts/build-morphology-table.py and src-tauri):
    remove U+0301, lowercase, strip leading/trailing non-letters, NFC."""
    s = token.replace(ACUTE, "").lower()
    start = 0
    end = len(s)
    while start < end and not s[start].isalpha():
        start += 1
    while end > start and not s[end - 1].isalpha():
        end -= 1
    return unicodedata.normalize("NFC", s[start:end])


def clean_gloss(g: str) -> str:
    g = " ".join(g.split())
    if len(g) <= MAX_GLOSS_CHARS:
        return g
    cut = g[:MAX_GLOSS_CHARS]
    cut = cut[: cut.rfind(" ")].rstrip()
    return cut + "\u2026" if cut else g[:MAX_GLOSS_CHARS] + "\u2026"


def keep_entry(e: dict) -> bool:
    if e.get("lang_code") != "ru":
        return False
    if str(e.get("pos", "")).endswith("redirect"):
        return False
    word = norm_token(str(e.get("word", "")))
    if not word or not CYR_TOKEN.match(word) or not NO_HARD_SIGN.match(word):
        return False
    tags = set(e.get("tags", []))
    for s in e.get("senses", []):
        tags |= set(s.get("tags", []))
    return not (tags & (PROPER_NAME_TAGS | AGE_TAGS))


def build_rows(entries) -> list[dict]:
    """One row per unique headword; input order only affects gloss
    collection order (bounded), output is fully sorted."""
    rows: dict[str, dict] = {}
    for e in entries:
        if not keep_entry(e):
            continue
        word = norm_token(str(e["word"]))
        row = rows.setdefault(word, {"word": word, "pos": set(), "glosses": [], "forms": set()})
        if e.get("pos"):
            row["pos"].add(str(e["pos"]))
        for s in e.get("senses", []):
            if len(row["glosses"]) >= MAX_SENSES:
                break
            for g in s.get("glosses", []):
                g = g if isinstance(g, str) else ""
                if g.strip():
                    cg = clean_gloss(g)
                    if cg not in row["glosses"]:
                        row["glosses"].append(cg)
                    break
        for f in e.get("forms", []):
            surface = norm_token(str(f.get("form", "")))
            if (
                surface
                and surface != word
                and CYR_TOKEN.match(surface)
                and NO_HARD_SIGN.match(surface)
            ):
                row["forms"].add(surface)
    out: list[dict] = []
    for word in sorted(rows, key=lambda w: w.encode("utf-8")):
        r = rows[word]
        if not r["glosses"]:
            continue
        forms = sorted(r["forms"], key=lambda f: f.encode("utf-8"))[:MAX_FORMS]
        out.append(
            {
                "word": r["word"],
                "pos": sorted(r["pos"]),
                "glosses": r["glosses"],
                "forms": forms,
            }
        )
    return out


def serialize(rows: list[dict]) -> str:
    return "".join(
        json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n" for r in rows
    )


def open_input(path: str):
    opener = gzip.open if path.endswith(".gz") else open
    return opener(path, "rt", encoding="utf-8")


def stream_entries(path: str):
    with open_input(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def do_write(input_path: str) -> int:
    rows = build_rows(stream_entries(input_path))
    content = serialize(rows)
    os.makedirs(AUX_DIR, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(content)
    prov = {
        "format_version": 1,
        "attribution": ATTRIBUTION,
        "license": SOURCE_LICENSE,
        "license_file": "aux/lexicon/LICENSE-kaikki.txt",
        "source_url": SOURCE_URL,
        "source_license_page": SOURCE_PAGE,
        "source_size_bytes": os.path.getsize(input_path),
        "source_sha256": sha256_file(input_path),
        "slice_sha256": hashlib.sha256(content.encode("utf-8")).hexdigest(),
        "rows": len(rows),
        "slicer": SLICER,
        "note": (
            "The raw kaikki input is not committed (size); --check proves the "
            "committed slice matches this pinned sha256 and its own shape. "
            "Re-running --write on the pinned input is byte-identical."
        ),
    }
    with open(PROVENANCE, "w", encoding="utf-8") as f:
        json.dump(prov, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"wrote {OUT}: {len(rows)} headword rows, {len(content)} bytes")
    print(f"wrote {PROVENANCE}: source_sha256={prov['source_sha256']}")
    return 0


ROW_KEYS = {"word", "pos", "glosses", "forms"}


def check_row_shape(r: dict) -> str | None:
    if set(r) != ROW_KEYS:
        return "keys"
    if not isinstance(r["word"], str) or not CYR_TOKEN.match(r["word"]):
        return "word"
    if not isinstance(r["glosses"], list) or not r["glosses"]:
        return "glosses"
    if not all(isinstance(g, str) and g.strip() for g in r["glosses"]):
        return "gloss"
    if not isinstance(r["pos"], list) or not all(isinstance(p, str) for p in r["pos"]):
        return "pos"
    if not isinstance(r["forms"], list) or not all(isinstance(f, str) and CYR_TOKEN.match(f) for f in r["forms"]):
        return "forms"
    if len(r["glosses"]) > MAX_SENSES or len(r["forms"]) > MAX_FORMS:
        return "caps"
    return None


def do_check() -> int:
    if not os.path.exists(OUT) or not os.path.exists(PROVENANCE):
        print("FAIL: aux slice or provenance missing", file=sys.stderr)
        return 1
    # FIX-READER-FLOW-001b-2: the slice is a CC-BY-SA/GFDL derivative of
    # kaikki.org data; the repo root LICENSE is Apache-2.0, so the slice
    # must ship its own license text or a downstream reuser has no
    # on-disk signal it is not Apache.
    if not os.path.exists(LICENSE_AUX):
        print(
            "FAIL: aux/lexicon/LICENSE-kaikki.txt missing — the slice is a "
            "CC-BY-SA/GFDL derivative, not the repo's Apache-2.0",
            file=sys.stderr,
        )
        return 1
    lic = open(LICENSE_AUX, encoding="utf-8").read()
    for needle in (
        "Creative Commons Attribution-ShareAlike",
        "GNU Free Documentation License",
    ):
        if needle not in lic:
            print(f"FAIL: LICENSE-kaikki.txt never names '{needle}'", file=sys.stderr)
            return 1
    prov = json.load(open(PROVENANCE, encoding="utf-8"))
    content = open(OUT, encoding="utf-8").read()
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    if digest != prov.get("slice_sha256"):
        print("DRIFT: aux slice does not match provenance.slice_sha256", file=sys.stderr)
        return 1
    words: list[str] = []
    for n, line in enumerate(content.splitlines(), 1):
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            print(f"FAIL: {OUT}:{n} not JSON", file=sys.stderr)
            return 1
        bad = check_row_shape(r)
        if bad:
            print(f"FAIL: {OUT}:{n} row shape ({bad})", file=sys.stderr)
            return 1
        words.append(r["word"])
    if len(words) != prov.get("rows"):
        print(f"FAIL: row count {len(words)} != provenance.rows {prov.get('rows')}", file=sys.stderr)
        return 1
    if words != sorted(words, key=lambda w: w.encode("utf-8")) or len(set(words)) != len(words):
        print("FAIL: rows must be sorted, unique headwords", file=sys.stderr)
        return 1
    print(f"check OK: {OUT} matches provenance ({len(words)} rows)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="regenerate slice + provenance")
    mode.add_argument("--check", action="store_true", help="verify the committed slice")
    ap.add_argument("--input", help="raw kaikki JSONL(.gz) for --write (pinned by sha256)")
    args = ap.parse_args()
    if args.write:
        if not args.input or not os.path.exists(args.input):
            print("--write requires --input pointing at the raw kaikki file", file=sys.stderr)
            return 2
        return do_write(args.input)
    return do_check()


if __name__ == "__main__":
    sys.exit(main())
