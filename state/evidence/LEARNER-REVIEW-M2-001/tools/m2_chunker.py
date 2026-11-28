#!/usr/bin/env python3
"""LEARNER-REVIEW-M2-001 pass-2 chunker: split the days-31-60 worklist into
numbered prose-review chunks per pack (learner-facing text only; ASCII
chrome and pure-latin label rows are left to the mechanical pass +
experience review). Writes review/chunks/{ru,ja}-NNN.md and a chunk index.

Usage: python3 tools/m2_chunker.py [items_per_chunk]
"""
import json
import re
from pathlib import Path

EVID = Path(__file__).resolve().parent.parent
SIM = EVID / "sim"
CH = EVID / "review" / "chunks"
CH.mkdir(parents=True, exist_ok=True)

CYR = re.compile(r"[\u0400-\u04FF]")
KANA = re.compile(r"[\u3040-\u30ff]")
KANJI = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")

SKIP_EXACT = {"weak-skill", "due-review"}  # wire slugs (D-006 known-limit)


def learner_target(text: str, pack: str) -> bool:
    if text in SKIP_EXACT:
        return False
    if pack == "ru":
        return bool(CYR.search(text))
    return bool(KANA.search(text) or KANJI.search(text))


def main(per=24):
    wl = json.loads((SIM / "worklist.json").read_text())
    index = []
    for pack in ("ru", "ja"):
        items = [it for it in wl[pack]["items"] if learner_target(it["text"], pack)]
        n = 0
        for i in range(0, len(items), per):
            n += 1
            chunk = items[i:i + per]
            (CH / f"{pack}-{n:03d}.md").write_text(
                f"# {pack.upper()} M2 chunk {n:03d} — days 31-60 learner prose (items {i+1}-{i+len(chunk)} of {len(items)})\n\n"
                "Review each item for grammar, naturalness, level-appropriateness.\n"
                "Verdict format per item: `item <n>: ok | fix: <problem + suggestion> | known-limit: <why unresolvable here>`\n\n"
                + "\n".join(f"{i+j+1}. [{','.join(it['surfaces'][:2])} d{it['first_day']}] {it['text']}" for j, it in enumerate(chunk))
                + "\n")
            index.append({"chunk": f"{pack}-{n:03d}", "pack": pack, "first_item": i + 1, "count": len(chunk)})
        print(pack, "target-script items:", len(items), "chunks:", n)
    (CH / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    import sys
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 24)
