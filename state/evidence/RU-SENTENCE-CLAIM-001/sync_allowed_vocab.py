#!/usr/bin/env python3
"""RU-SENTENCE-CLAIM-001 — keep every claimed content_ref inside the hosting unit's
generation_contract.allowed_vocab.

The pack-build validator (exercised by the desktop install path) refuses a unit
that references content outside its generation contract:
  "ru.sent.cp.p01" is used by the unit but not in the generation contract
So each claimed ref must also be listed in allowed_vocab. Idempotent: only refs
missing from the list are appended, in the list's existing style (block or flow).
"""
import glob
import json
import os
import re
import sys

import yaml

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
PACK = os.path.join(REPO, "languages", "ru-RU")
UNIT_DIR = os.path.join(PACK, "curriculum", "units")


def unit_path(unit_id):
    for p in glob.glob(os.path.join(UNIT_DIR, "*.yaml")):
        doc = yaml.safe_load(open(p, encoding="utf-8"))
        if doc.get("id") == unit_id:
            return p, doc
    raise SystemExit(f"unit not found: {unit_id}")


def main():
    apply = "--apply" in sys.argv
    groups = json.load(open(os.path.join(ROOT, "claim-map.json"), encoding="utf-8"))["groups"]
    by_unit = {}
    for g in groups:
        by_unit.setdefault(g["unit"], set()).update(g["refs"])
    touched = 0
    added_total = 0
    for unit_id, refs in sorted(by_unit.items()):
        path, doc = unit_path(unit_id)
        gc = doc.get("generation_contract") or {}
        vocab = list(gc.get("allowed_vocab") or [])
        have = set(vocab)
        missing = sorted(r for r in refs if r not in have)
        if not missing:
            continue
        text = open(path, encoding="utf-8").read()
        m = re.search(r"^  allowed_vocab:", text, re.M)
        if m is None:
            raise SystemExit(f"{path}: no generation_contract.allowed_vocab to extend")
        # end of the allowed_vocab block = next line at indent <= 2 that is not a
        # '- ' item of this list.
        lines = text.split("\n")
        start = text[: m.start()].count("\n")
        i = start + 1
        block_end = None
        flow = lines[i].lstrip().startswith("[")
        while i < len(lines):
            line = lines[i]
            if line.strip() == "":
                i += 1
                continue
            indent = len(line) - len(line.lstrip())
            if flow:
                if line.strip().startswith("]"):
                    block_end = i
                    break
            else:
                if not line.lstrip().startswith("- "):
                    block_end = i
                    break
            i += 1
        if block_end is None:
            raise SystemExit(f"{path}: could not find end of allowed_vocab block")
        if flow:
            inner = lines[block_end].strip()
            body = inner[1:].strip()
            add = ", ".join(f'"{r}"' for r in missing)
            lines[block_end] = "    " + (body + ", " if body and body != "]" else "") + add + "]"
            new = "\n".join(lines)
        else:
            ins = [f"  - {r}" for r in missing]
            lines[block_end:block_end] = ins
            new = "\n".join(lines)
        nd = yaml.safe_load(new)
        nv = nd["generation_contract"]["allowed_vocab"]
        for r in missing:
            assert r in nv, f"{unit_id}: {r} still missing after edit"
        assert len(nv) == len(vocab) + len(missing)
        if apply:
            open(path, "w", encoding="utf-8").write(new)
        touched += 1
        added_total += len(missing)
        print(f"{unit_id}: +{len(missing)} allowed_vocab rows")
    print(f"units touched={touched} vocab rows added={added_total} (apply={apply})")


if __name__ == "__main__":
    main()
