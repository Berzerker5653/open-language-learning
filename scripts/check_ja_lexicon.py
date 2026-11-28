#!/usr/bin/env python3
"""FIX-M1-CONTENT-JA-001 regression gate: ja-JP lexicon verb-card integrity.

Root cause this gate locks out: the 2026-10-05 ai-screening fix_reading pass
(docs/review/ai-screening-2026-10-05/applied.jsonl) "recovered" polite -masu
readings that are not JMdict headwords into real-but-wrong words (かえりざく
for "to go back", あるきだす for "to walk", ねかす for "to sleep", ...), and
the same corruption pattern reached 15 further verb rows found by the card's
sweep. Two hard rules:

  V1  a verb row's primary kana form must EQUAL its kana reading
      (one surface, taught as one word — no silent form/reading drift);
  V2  a verb-masu row whose id slug ends in "masu" must carry a hepburn
      reading derivable from that slug: the slug itself, stem+"ru"
      (ichidan), or stem i->u (godan). This is the invariant the D-009
      cards violated (slug kaerimasu, reading kaerizaku).

Known, ledgered anomalies are allow-listed with a reason; the test file
ratchets the list so it can only shrink, and fails if a violation moves
without the list being edited in the same change.

Also REPORT-ONLY (not a failure, drift visibility for the katakana
loanword-convention follow-up): forms/readings that carry the katakana
long-vowel mark ー while declared non-katakana script.

Usage: python3 scripts/check_ja_lexicon.py [pack_dir]   (default languages/ja-JP)
Exit 0 = clean, 1 = violations.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# id -> reason. Add ONLY with a ledger entry; remove when fixed (ratchet).
ALLOW = {
    "ja.lex.leisure.miimasu":
        "id slug 'miimasu' is malformed (correct masu form of 見る is "
        "mimasu, already the clean anchor ja.lex.verbs.mimasu); display/gloss "
        "restored to みます. Slug kept as the stable learner anchor. Ledger: "
        "state/evidence/FIX-M1-CONTENT-JA-001/defects-extension.md",
    "ja.lex.city.todokedemasu":
        "id slug 'todokedemasu' is itself malformed (correct masu form of "
        "届ける is todokemasu); display とどける matches the gloss. Ledger: "
        "state/evidence/FIX-M1-CONTENT-JA-001/defects-extension.md",
    "ja.lex.health.kuukimasu":
        "id slug 'kuukimasu' matches no breathe-verb reading; display+gloss "
        "restored to すいます (吸う). Slug kept as the stable learner anchor. "
        "Ledger: state/evidence/FIX-M1-CONTENT-JA-001/defects-extension.md",
    "ja.lex.transport.norimasu":
        "display のりこむ (乗込む) is a compound whose own meaning matches "
        "the gloss 'to get on; to board' — not the ai-screening corruption "
        "class. Ledgered observation, kept. "
        "state/evidence/FIX-M1-CONTENT-JA-001/defects-extension.md",
}

LONG_VOWEL = "\u30fc"


def iter_rows(pack_dir: Path):
    for path in sorted((pack_dir / "lexicon").glob("*.jsonl")):
        for lineno, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not raw.strip():
                continue
            yield path, lineno, json.loads(raw)


def check(pack_dir: Path):
    violations = []
    loan_drift = []
    for path, lineno, row in iter_rows(pack_dir):
        pos = row.get("part_of_speech", "")
        rid = row.get("id", "?")
        forms = row.get("forms", [])
        readings = row.get("readings", [])
        for x in forms + readings:
            if LONG_VOWEL in x.get("text", "") and x.get("script") != "katakana":
                loan_drift.append(f"{rid}: {x['text']!r} script={x.get('script')}")
        if not pos.startswith("verb"):
            continue
        kana_reading = next((x["text"] for x in readings if x.get("script") == "hiragana"), None)
        primary = next((x["text"] for x in forms if x.get("is_primary")), "")
        if kana_reading and primary != kana_reading:
            violations.append(f"{rid} [{path.name}:{lineno}] V1 form {primary!r} != reading {kana_reading!r}")
            continue
        slug = rid.split(".")[-1].replace("-", "")
        if slug.endswith("masu"):
            romaji = next((x["text"] for x in readings if x.get("transliteration_system")), "")
            norm = romaji.replace("-", "").replace(" ", "").lower()
            stem = slug[:-4]
            cands = {slug, stem + "ru"}
            # godan: final masu-stem mora maps to its u-row mora (aruki->aruku,
            # hanashi->hanasu, neme->nemu via the plain i->u case)
            for i_row, u_row in [("shi", "su"), ("chi", "tsu"), ("ki", "ku"),
                                 ("gi", "gu"), ("ji", "zu"), ("bi", "bu"),
                                 ("pi", "pu"), ("mi", "mu"), ("ni", "nu"),
                                 ("ri", "ru"), ("di", "zu"), ("i", "u")]:
                if stem.endswith(i_row):
                    cands.add(stem[: -len(i_row)] + u_row)
                    break
            if norm and norm not in cands:
                violations.append(f"{rid} [{path.name}:{lineno}] V2 romaji {romaji!r} not derivable from slug {slug!r} (gloss {row.get('glosses')})")
    hard = [v for v in violations if v.split()[0] not in ALLOW]
    return hard, violations, loan_drift


def main(argv):
    pack = Path(argv[1]) if len(argv) > 1 else Path(__file__).resolve().parent.parent / "languages/ja-JP"
    hard, all_v, drift = check(pack)
    allowed = [v for v in all_v if v.split()[0] in ALLOW]
    print(f"{pack}: {len(all_v)} verb-rule violation(s) ({len(allowed)} allow-listed, {len(hard)} hard)")
    for v in all_v:
        tag = "ALLOWED" if v.split()[0] in ALLOW else "VIOLATION"
        print(f"  [{tag}] {v}")
    print(f"  report-only loanword orthography drift (long-vowel mark in non-katakana script): {len(drift)} row field(s)")
    if drift:
        print(f"    first 5: {[d.split(':')[0] for d in drift[:5]]}")
    return 1 if hard else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
