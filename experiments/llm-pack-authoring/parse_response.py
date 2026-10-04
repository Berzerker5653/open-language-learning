#!/usr/bin/env python3
"""Reconstruct a candidate pack directory from an LLM response.

The brief asks for `### <relative/path>` lines followed by one fenced code
block per file. This script parses that response into a scored candidate:

    ./parse_response.py <response-file> <label>

Writes experiments/llm-pack-authoring/candidates/<label>/ and prints the
file list. Then score with:

    ./score.sh experiments/llm-pack-authoring/candidates/<label> <label>
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REQUIRED = [
    "manifest.yaml",
    "sources.jsonl",
    "licenses.jsonl",
    "curriculum/goals.yaml",
    "grammar/concepts.jsonl",
    "sentences/entries.jsonl",
    "assessments/definitions.jsonl",
]
SAFE = re.compile(r"^[A-Za-z0-9._/-]+$")
BLOCK = re.compile(r"^### (\S+)( \(append\))?\n+```[a-zA-Z0-9]*\n(.*?)\n```", re.M | re.S)


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    response_path, label = argv[1], argv[2]
    text = Path(response_path).read_text(encoding="utf-8")
    blocks = BLOCK.findall(text)
    if not blocks:
        print("PARSE ERROR: no `### <path>` + fenced-block pairs found; "
              "did the model follow the brief's output format?", file=sys.stderr)
        return 1
    out = HERE / "candidates" / label
    written, skipped = [], []
    for rel, append_flag, body in blocks:
        rel = rel.strip().removeprefix("./")
        if not SAFE.match(rel) or ".." in rel.split("/") or rel.startswith("/"):
            skipped.append(rel)
            continue
        if rel == "CURRICULUM_PLAN.yaml":
            # Mode B planning artifact: saved outside the pack, never scored.
            plan = HERE / "plans" / f"{label}.yaml"
            plan.parent.mkdir(parents=True, exist_ok=True)
            plan.write_text(body.rstrip() + "\n", encoding="utf-8")
            print(f"plan saved to {plan} (not part of the pack)")
            continue
        dest = out / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if append_flag:
            if not rel.endswith(".jsonl"):
                print(f"SKIPPED append on non-JSONL file: {rel}", file=sys.stderr)
                skipped.append(rel)
                continue
            new_lines = [ln for ln in body.splitlines() if ln.strip()]
            existing = dest.read_text(encoding="utf-8").splitlines() if dest.is_file() else []
            ids = set()
            for ln in existing + new_lines:
                try:
                    rid = json.loads(ln).get("id")
                except ValueError:
                    print(f"SKIPPED append to {rel}: unparseable JSONL line", file=sys.stderr)
                    skipped.append(rel)
                    break
                if rid in ids:
                    print(f"SKIPPED append to {rel}: duplicate id {rid}", file=sys.stderr)
                    skipped.append(rel)
                    break
                ids.add(rid)
            else:
                dest.write_text("\n".join(existing + new_lines).rstrip() + "\n", encoding="utf-8")
                written.append(f"{rel} (+{len(new_lines)} appended)")
                continue
            continue
        dest.write_text(body.rstrip() + "\n", encoding="utf-8")
        written.append(rel)
    print(f"wrote {len(written)} files to {out}")
    for rel in written:
        print(f"  {rel}")
    if skipped:
        print(f"SKIPPED unsafe paths: {skipped}", file=sys.stderr)
    missing = [r for r in REQUIRED if not (out / r).is_file()]
    units = sorted((out / "curriculum" / "units").glob("*.yaml")) if (out / "curriculum" / "units").is_dir() else []
    lex = sorted((out / "lexicon").glob("*.jsonl")) if (out / "lexicon").is_dir() else []
    if missing or not units or not lex:
        problems = [f"missing {m}" for m in missing]
        if not units:
            problems.append("no curriculum/units/*.yaml")
        if not lex:
            problems.append("no lexicon/*.jsonl")
        print("INCOMPLETE PACK: " + "; ".join(problems), file=sys.stderr)
        return 1
    print("all required files present")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
