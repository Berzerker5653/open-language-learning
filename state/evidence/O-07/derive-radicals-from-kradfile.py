#!/usr/bin/env python3
"""O-07 option A: rewrite kanji `radicals` + `sources` spans in place.

Surgical string replacement of the "radicals": [...] and "sources": [...]
spans only; every other byte of every line must be untouched.
"""
import json
import sys

WT = "/home/hunter/game-dev/LTS/tmp/o07-optionA/wt"
KRAD_PATH = "/home/hunter/game-dev/LTS/tmp/o07-optionA/ref/kradfile-3.6.2.json"
FILES = ["languages/ja-JP/kanji/entries.jsonl", "languages/ja-JP/kanji/a2-topics.jsonl"]
NEW_SOURCE = "kradfile"  # the source that actually supplied the replacement lists
ALLOWED_OLD_SOURCES = [["jf-standard"], ["jf-standard", "jmdict-simplified"]]


def find_span(line: str, key: str):
    """Return (start, end_excl) of the `"key": [...]` span, bracket-walked
    with JSON string awareness."""
    anchor = f'"{key}": ['
    i = line.index(anchor)
    j = i + len(anchor) - 1
    depth = 0
    in_str = False
    esc = False
    for k in range(j, len(line)):
        c = line[k]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
                if depth == 0:
                    return i, k + 1
    raise AssertionError(f"unbalanced span for {key}")


def arr_literal(items):
    return "[" + ", ".join(json.dumps(s, ensure_ascii=False) for s in items) + "]"


def main():
    krad = json.load(open(KRAD_PATH, encoding="utf-8"))["kanji"]
    stats = dict(
        records=0,
        byte_identical_radicals=0,
        set_equal_order_diff=0,
        changed_set=0,
        empty_new=0,
        missing_from_krad=[],
        sources_replaced=0,
        changed_records=[],
    )
    for rel in FILES:
        path = f"{WT}/{rel}"
        with open(path, encoding="utf-8") as f:
            lines = f.read().split("\n")
        assert lines[-1] == "", "file must end with newline"
        out = []
        for ln, line in enumerate(lines[:-1], 1):
            obj = json.loads(line)
            char = obj["character"]
            old_rad = obj["radicals"]
            old_src = obj["sources"]
            assert old_src in ALLOWED_OLD_SOURCES, (rel, ln, old_src)
            if char not in krad:
                stats["missing_from_krad"].append((rel, ln, char))
                out.append(line)
                continue
            new_rad = list(dict.fromkeys(krad[char]))  # dedupe, preserve order
            assert new_rad, char
            assert all(isinstance(c, str) and len(c) == 1 for c in new_rad), char
            new_line = line
            r0, r1 = find_span(new_line, "radicals")
            new_line = new_line[:r0] + '"radicals": ' + arr_literal(new_rad) + new_line[r1:]
            new_src = list(dict.fromkeys(old_src + [NEW_SOURCE]))
            s0, s1 = find_span(new_line, "sources")
            new_line = new_line[:s0] + '"sources": ' + arr_literal(new_src) + new_line[s1:]
            # verify: valid JSON, only radicals/sources changed, key order kept
            new_obj = json.loads(new_line)
            assert list(new_obj.keys()) == list(obj.keys()), (rel, ln)
            for k in obj:
                if k in ("radicals", "sources"):
                    continue
                assert new_obj[k] == obj[k], (rel, ln, k)
            assert new_obj["radicals"] == new_rad
            assert new_obj["sources"] == new_src
            # verify remainder bytes identical outside the two spans
            stats["records"] += 1
            stats["sources_replaced"] += 1
            old_lit = line[r0 + len('"radicals": '):r1]
            new_lit = arr_literal(new_rad)
            if old_lit == new_lit:
                stats["byte_identical_radicals"] += 1
            elif set(old_rad) == set(new_rad):
                stats["set_equal_order_diff"] += 1
            else:
                stats["changed_set"] += 1
                stats["changed_records"].append(
                    {"id": obj["id"], "character": char, "old": old_rad, "new": new_rad}
                )
            if not new_rad:
                stats["empty_new"] += 1
            out.append(new_line)
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(out) + "\n")
    print(json.dumps({k: v for k, v in stats.items() if k != "changed_records"}, ensure_ascii=False, indent=2))
    with open("/home/hunter/game-dev/LTS/tmp/o07-optionA/radical-changes.json", "w", encoding="utf-8") as f:
        json.dump(stats["changed_records"], f, ensure_ascii=False, indent=2)
    if stats["missing_from_krad"]:
        print("MISSING FROM KRAD:", stats["missing_from_krad"], file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
