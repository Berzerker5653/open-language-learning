#!/usr/bin/env python3
"""Repair ja-JP lexicon readings whose romaji contradicts their own kana.

`lts-langpack` now rejects three defect classes (audit.rs, Error severity):
`reading_transliteration_not_latin` (kana or digit inside a
`transliteration_system` reading), `romaji_contains_kana` (same inside a
sentence's `romaji`), and `form_script_mismatch` (a hiragana/katakana label
disagreeing with its own text). Measured on the ja-JP tree: 510 malformed
transliterations ("kentoう", "ronso2", "jiゅnり") and 73 mislabelled scripts —
bulk LLM authoring wrote the Latin letters first, then left kana behind.

This tool regenerates the romaji from the entry's own script-tagged kana
reading. The transliteration rules were derived from the pack's own
well-formed rows, not imposed:

  * long vowels spelled out (こう -> kou, コーヒー -> koohii), consistent
    with what the newer content and the sentence pool already do;
  * the sokuon doubles the following mora's leading consonant, and before
    ち/ぢ/つ/づ it is `t` (いっち -> itchi, まっち -> matchi, みっつ -> mittsu),
    which is what those rows already read;
  * ん is always `n`, never hepburn's `m` before b/m/p, because every
    well-formed row in the tree says hanbai/senpai/shinpan/shinpai;
  * no particle exception: the lexicon has no particle entries, and the one
    single-kana は reading in it is the noun "tooth", so は stays `ha`.
    Particles live in the grammar pool, which has no transliteration field.

Every repaired value is generated from that row's own kana. A row is never
given a sibling's spelling: the same kana covers different words (ふうとう is
both "immersion" and another row's "tsuuchou") and some existing rows are
romanised wrongly to begin with, so copying would import one entry's mistake
into another. Where the pack already spells the same kana differently, the
disagreement is recorded in the report for a reviewer instead. Rows with no
kana reading, or with kana this converter cannot render, are reported and left
alone rather than guessed at.

Edits are surgical: only the offending string inside the JSONL line is
replaced, so key order, spacing and every untouched field stay byte-identical
(lexicon files are not uniformly formatted, and a JSON round-trip would
reflow thousands of lines).

    --pack languages/ja-JP --check                                  # report only
    --pack languages/ja-JP --write --report out.csv                 # repair
    --pack languages/ja-JP --convention-report review.csv           # style audit
"""

from __future__ import annotations

import argparse
import csv
import difflib
import json
import re
import sys
from pathlib import Path

KANA = re.compile(r"[\u3041-\u30ff]")
DIGIT = re.compile(r"\d")
KATA_TO_HIRA = {chr(o): chr(o - 0x60) for o in range(0x30A1, 0x30FB)}

MORA = {
    "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
    "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
    "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
    "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
    "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
    "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
    "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
    "や": "ya", "ゆ": "yu", "よ": "yo",
    "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
    "わ": "wa", "を": "o", "ん": "n",
    "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
    "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
    "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
    "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
    "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
    "ヴ": "bu",
}
COMBO = {
    "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
    "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
    "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
    "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
    "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
    "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
    "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
    "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
    "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
    "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
    "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
}
VOWEL_TAIL = re.compile(r"([aeiou])(?:ou|oo|ee|ii|uu)?$")
# Foreign-word small kana (ティ, ファ, フォーク…) borrow the preceding mora's
# consonant and carry their own vowel.
SMALL_VOWEL = {"ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o"}


def kana_only(text: str) -> bool:
    """True when `text` is pure kana — the only input this converter accepts."""
    return bool(text) and all(
        "\u3041" <= c <= "\u30ff" or c in "ーヽヾ" for c in text
    )


def romaji(kana: str) -> str | None:
    """Modified-hepburn for `kana`, or None when a mora cannot be rendered."""
    k = "".join(KATA_TO_HIRA.get(c, c) for c in kana)
    if not k:
        return None
    out: list[str] = []
    i = 0
    while i < len(k):
        pair = k[i : i + 2]
        if pair in COMBO:
            out.append(COMBO[pair])
            i += 2
            continue
        c = k[i]
        if c == " ":
            out.append(" ")  # phrase readings (でんわを かけます) keep their break
            i += 1
            continue
        if c == "っ":
            nxt = k[i + 1 : i + 2]
            if not nxt or nxt == "っ":
                return None  # word-final sokuon: nothing to double
            if nxt in "ちぢつづ":
                out.append("t")
            else:
                nxt_rom = COMBO.get(k[i + 1 : i + 3]) or MORA.get(nxt)
                if not nxt_rom:
                    return None
                out.append(nxt_rom[0])
            i += 1
            continue
        if c == "ー":
            tail = VOWEL_TAIL.search("".join(out))
            if not tail:
                return None  # ー after ん or at word start: no vowel to repeat
            out.append(tail.group(1))
            i += 1
            continue
        if c in SMALL_VOWEL:
            if not out:
                return None  # small kana with no mora to attach to
            head = out[-1].rstrip("aeiou")
            if not head:
                return None  # vowel-only mora: nothing to re-vowelise
            out[-1] = head + SMALL_VOWEL[c]
            i += 1
            continue
        m = MORA.get(c)
        if m is None:
            return None
        out.append(m)
        i += 1
    return "".join(out)


def is_malformed(text: str) -> bool:
    return bool(KANA.search(text)) or bool(DIGIT.search(text))


# text": "…" followed by a transliteration_system key — the reading slot, in
# either spacing style the pack happens to use.
TRANSLIT_SLOT = re.compile(
    r'("(?:text|transliteration)"\s*:\s*)"((?:[^"\\]|\\.)*)"'
    r'(\s*,\s*"transliteration_system")'
)
SCRIPT_FIELD = re.compile(r'("script"\s*:\s*)"([a-z]+)"')


def expected_script(text: str) -> str | None:
    """The script label `text` deserves, or None when the label is fine."""
    has_hira = any("\u3041" <= c <= "\u309f" for c in text)
    has_kata = any("\u30a1" <= c <= "\u30fa" or c in "\u30fd\u30fe" for c in text)
    if has_kata and not has_hira:
        return "katakana"
    if has_hira and not has_kata:
        return "hiragana"
    return None


def analyse(path: Path) -> list[dict]:
    """Every repairable reading in one lexicon shard."""
    fixes = []
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        entry_id = entry.get("id", f"{path.name}:{lineno}")
        kana = [
            r["text"]
            for r in (entry.get("readings") or [])
            if isinstance(r, dict) and r.get("script") in ("hiragana", "katakana")
        ]
        for r in entry.get("readings") or []:
            if not isinstance(r, dict) or not r.get("transliteration_system"):
                continue
            text = r.get("text") or ""
            if not is_malformed(text):
                continue
            source = kana[0] if kana else None
            fixes.append(
                {
                    "id": entry_id,
                    "kind": "transliteration",
                    "before": text,
                    "kana": source,
                    "generated": romaji(source) if source and kana_only(source) else None,
                    "line": lineno,
                }
            )
        for group in ("forms", "readings"):
            for r in entry.get(group) or []:
                if not isinstance(r, dict) or r.get("script") not in ("hiragana", "katakana"):
                    continue
                want = expected_script(r.get("text") or "")
                if want and want != r["script"]:
                    fixes.append(
                        {
                            "id": entry_id,
                            "kind": "script",
                            "before": r["script"],
                            "after": want,
                            "kana": r.get("text"),
                            "line": lineno,
                        }
                    )
    return fixes


def pack_spellings(paths: list[Path]) -> dict[str, set[str]]:
    """kana -> the well-formed romaji the pack already carries for it.

    This is only used to flag disagreements in the report, never as
    replacement text. The same kana spelling covers different words (ふうとう
    is both "immersion" and the sibling row's "tsuuchou"), and some existing
    rows are romanised wrongly to begin with (成立 recorded as "risshi"), so
    copying a sibling would import one entry's mistake into another. The
    repair always regenerates from the entry's own kana and leaves the
    pre-existing convention split visible for a human reviewer.
    """
    out: dict[str, set[str]] = {}
    for path in paths:
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            rd = [r for r in (entry.get("readings") or []) if isinstance(r, dict)]
            kana = [r["text"] for r in rd if r.get("script") in ("hiragana", "katakana")]
            for r in rd:
                if not r.get("transliteration_system"):
                    continue
                text = r.get("text") or ""
                if kana and kana[0] and not is_malformed(text):
                    out.setdefault(kana[0], set()).add(text)
    return out

LONG_VOWEL = re.compile(r"(ou|oo|ee|ii|uu)")
GEMINATE = re.compile(r"(.)\1")


def flat(text: str) -> str:
    return text.lower().replace(" ", "").replace("-", "")


def classify(existing: str, generated: str | None, gloss: str) -> str:
    """Why a well-formed romaji differs from what its own kana says.

    `spacing`, `long-vowel-collapsed` (こうか written koka), `gemination-collapsed`
    (はっけん written haken) and `other-spelling` are style differences — the
    pack carries two romaji conventions and choosing between them is human
    editorial work. `particle-exception` covers こんばんは written konbanwa.
    `english-word` (the
    romaji is the English gloss: あっぷ written app) and `divergent` (きく
    written ukuu — romaji and kana are different words) are content defects:
    the field is learner-visible pronunciation scaffold that no longer
    describes the entry.
    """
    if generated is None:
        return "kana-unrenderable"
    g, e = generated.lower(), existing.lower()
    if g == e:
        return "agrees"
    if flat(g) == flat(e):
        return "spacing"
    if gloss and e.endswith("wa") and g.endswith("ha") and flat(g)[:-2] == flat(e)[:-2]:
        return "particle-exception"  # こんばんは -> konbanha, written konbanwa
    if LONG_VOWEL.sub(lambda m: m.group(1)[0], g) == flat(e):
        return "long-vowel-collapsed"
    if GEMINATE.sub(r"\1", g) == GEMINATE.sub(r"\1", e):
        return "gemination-collapsed"
    if gloss and flat(gloss) == flat(e):
        return "english-word"
    if difflib.SequenceMatcher(None, g, e).ratio() < 0.55:
        return "divergent"
    return "other-spelling"


def convention_rows(paths: list[Path]) -> list[dict]:
    """Every well-formed romaji measured against its own kana reading."""
    rows: list[dict] = []
    for path in paths:
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            rd = [r for r in (entry.get("readings") or []) if isinstance(r, dict)]
            kana = [r["text"] for r in rd if r.get("script") in ("hiragana", "katakana")]
            for r in rd:
                text = r.get("text") or ""
                if not r.get("transliteration_system") or is_malformed(text):
                    continue
                source = kana[0] if kana else None
                glosses = (entry.get("glosses") or {}).get("en-US") or [""]
                rows.append(
                    {
                        "id": entry.get("id", path.name),
                        "kana": source or "",
                        "romaji": text,
                        "generated": romaji(source) if source else "",
                        "class": classify(text, romaji(source) if source else None, glosses[0]),
                        "gloss": glosses[0],
                    }
                )
    return rows


# "text": "<the entry's own kana>", "script": "<label>" — anchoring the label
# to the text it describes is what makes the relabel unambiguous: one line
# carries several script fields.
TEXT_SCRIPT = re.compile(
    r'("text"\s*:\s*)"((?:[^"\\]|\\.)*)"(\s*,\s*"script"\s*:\s*)"([a-z]+)"'
)


def apply_fixes(
    path: Path, fixes: list[dict], existing: dict[str, set[str]]
) -> tuple[list[dict], list[str]]:
    """Rewrite one shard in place; returns (applied rows, notes)."""
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    applied: list[dict] = []
    notes: list[str] = []
    for fix in fixes:
        idx = fix["line"] - 1
        line = lines[idx]
        if fix["kind"] == "script":
            def relabel(m: re.Match) -> str:
                if json.loads(f'"{m.group(2)}"') != fix["kana"] or m.group(4) != fix["before"]:
                    return m.group(0)
                return f'{m.group(1)}"{m.group(2)}"{m.group(3)}"{fix["after"]}"'

            wrong = sum(
                1
                for m in TEXT_SCRIPT.finditer(line)
                if json.loads(f'"{m.group(2)}"') == fix["kana"] and m.group(4) == fix["before"]
            )
            if not wrong:
                # A sibling slot in the same line already carried this relabel.
                continue
            lines[idx] = TEXT_SCRIPT.sub(relabel, line)
            applied.append({**fix, "after": fix["after"], "labels": wrong})
            continue
        target = fix["generated"]
        source = fix["kana"]
        if not target:
            notes.append(f'{fix["id"]}: no kana reading or unrenderable kana {source!r}')
            continue
        rivals = sorted(s for s in existing.get(source or "", set()) if s.lower() != target.lower())
        if rivals:
            # The pack already spells this kana differently somewhere. Keep the
            # regenerated value; let the report carry the disagreement.
            fix["generated_conflict"] = rivals
        if target.lower() == fix["before"].lower():
            notes.append(f'{fix["id"]}: already matches {target!r}')
            continue

        def repl(m: re.Match) -> str:
            if json.loads(f'"{m.group(2)}"') != fix["before"]:
                return m.group(0)
            return f"{m.group(1)}{json.dumps(target, ensure_ascii=False)}{m.group(3)}"

        new_line, n = TRANSLIT_SLOT.subn(repl, line, count=1)
        if n != 1 or new_line == line:
            notes.append(f'{fix["id"]}: slot not found in {path.name}:{fix["line"]}')
            continue
        lines[idx] = new_line
        applied.append({**fix, "after": target})
    if applied:
        path.write_text("".join(lines), encoding="utf-8")
    return applied, notes


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--pack", required=True, help="pack directory, e.g. languages/ja-JP")
    ap.add_argument("--check", action="store_true", help="report only (default)")
    ap.add_argument("--write", action="store_true", help="rewrite the shards")
    ap.add_argument("--report", help="write a CSV of every repair here")
    ap.add_argument(
        "--convention-report",
        help="measure every well-formed romaji against its own kana and write the "
        "defect classes here as CSV instead of repairing",
    )
    args = ap.parse_args()

    lex = Path(args.pack) / "lexicon"
    if not lex.is_dir():
        print(f"no lexicon directory at {lex}", file=sys.stderr)
        return 1
    paths = sorted(lex.glob("*.jsonl"))

    if args.convention_report:
        rows = convention_rows(paths)
        counts: dict[str, int] = {}
        for r in rows:
            counts[r["class"]] = counts.get(r["class"], 0) + 1
        print(f"{args.pack}: {len(rows)} well-formed transliterations {counts}")
        report = Path(args.convention_report)
        report.parent.mkdir(parents=True, exist_ok=True)
        defects = ("english-word", "divergent")
        with report.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(
                fh, fieldnames=["id", "class", "kana", "romaji", "generated", "gloss"]
            )
            w.writeheader()
            for r in rows:
                if r["class"] in defects:
                    w.writerow(r)
        flagged = sum(1 for r in rows if r["class"] in defects)
        print(f"report: {report} ({flagged} rows needing human review)")
        return 0

    fixes_by_path = {p: analyse(p) for p in paths}
    fixes = [f for fs in fixes_by_path.values() for f in fs]
    by_kind = {}
    for f in fixes:
        by_kind[f["kind"]] = by_kind.get(f["kind"], 0) + 1
    print(f"{args.pack}: {len(fixes)} readings to repair {by_kind}")
    if not args.write:
        for f in fixes:
            print(
                f"  {f['id']}: {f['kind']} {f['before']!r}"
                f" -> {f.get('after') or f.get('generated') or 'UNRESOLVED'!r}"
                f" (kana {f['kana']!r})"
            )
        print("--check: nothing written")
        return 0

    existing = pack_spellings(paths)
    applied_all: list[dict] = []
    notes_all: list[str] = []
    for p, mine in fixes_by_path.items():
        if not mine:
            continue
        applied, notes = apply_fixes(p, mine, existing)
        applied_all.extend(applied)
        notes_all.extend(notes)
    print(f"applied {len(applied_all)} repairs")
    if notes_all:
        print(f"{len(notes_all)} rows left alone:")
        for n in notes_all:
            print(f"  {n}")
    if args.report:
        report = Path(args.report)
        report.parent.mkdir(parents=True, exist_ok=True)
        with report.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(
                fh, fieldnames=["id", "kind", "kana", "before", "after", "labels", "generated_conflict"]
            )
            w.writeheader()
            for a in applied_all:
                w.writerow({k: a.get(k, "") for k in w.fieldnames})
        print(f"report: {report}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
