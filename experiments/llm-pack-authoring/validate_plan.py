#!/usr/bin/env python3
"""Mechanically validate a Mode B CURRICULUM_PLAN.yaml.

    ./validate_plan.py plans/<label>.yaml

Checks contract facts a human cannot be expected to judge (id grammar,
band names, numbering, coverage, and the capacity math implied by hard
rule 8: new_item_budget <= 6 per unit). It does NOT certify pedagogy —
content stays draft pending qualified human review. Exit 0 = plan is
contract-consistent; exit 1 = diagnostics printed, model must replan.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

import yaml

BANDS = ["on-ramp", "A1", "A2", "B1", "B2", "C1", "C2"]
ITEM_CAP = 6  # hard rule 8
UNIT_FILE = re.compile(r"^(\d{3})-[a-z0-9-]+\.yaml$")


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    plan = yaml.safe_load(Path(argv[1]).read_text(encoding="utf-8"))
    errs = []

    for key in ("bands", "units", "lexicon", "grammar"):
        if key not in plan:
            errs.append(f"missing top-level key: {key}")
    if errs:
        print("\n".join("ERROR " + e for e in errs))
        return 1

    # band names + order
    band_names = list(plan["bands"])
    unknown = [b for b in band_names if b not in BANDS]
    if unknown:
        errs.append(f"unknown bands: {unknown}")
    ordered = [b for b in BANDS if b in band_names]
    if band_names != ordered:
        errs.append(f"bands out of CEFR order: {band_names}")

    # id grammar; derive prefix from first goal id
    goal_ids = [g.get("id", "") for b in band_names for g in plan["bands"][b].get("goals", [])]
    if not goal_ids:
        errs.append("no goals in any band")
        print("\n".join("ERROR " + e for e in errs))
        return 1
    p = goal_ids[0].split(".")[0]
    for gid in goal_ids:
        if not re.fullmatch(rf"{p}\.goal\.[a-z0-9.-]+", gid):
            errs.append(f"goal id violates <p>.goal.* grammar: {gid}")

    # units: numbering, goal coverage
    seen_files, seen_nums, unit_goals = set(), {}, {}
    for b in band_names:
        for u in plan["units"].get(b, []):
            f = u.get("file", "")
            m = UNIT_FILE.match(f)
            if not m:
                errs.append(f"unit file name must be NNN-<topic>.yaml: {f}")
                continue
            if f in seen_files:
                errs.append(f"duplicate unit file: {f}")
            seen_files.add(f)
            seen_nums[int(m.group(1))] = f
            if u.get("goal") not in goal_ids:
                errs.append(f"{f} references unknown goal: {u.get('goal')}")
            unit_goals.setdefault(u.get("goal"), []).append(f)
    for gid in goal_ids:
        if gid not in unit_goals:
            errs.append(f"goal has no unit: {gid}")

    # lexicon budgets monotonic; orthography is not a lexicon shard
    prev = 0
    for b in ordered:
        lx = plan["lexicon"].get(b)
        if not lx:
            errs.append(f"lexicon missing budget for band {b}")
            continue
        budget = lx.get("budget", 0)
        if budget <= prev:
            errs.append(f"lexicon budget for {b} ({budget}) must exceed previous band ({prev})")
        prev = budget
        for s in lx.get("shards", []):
            if "orthograph" in s:
                errs.append(f"{b}: '{s}' is not a lexicon shard — symbol records live in orthography/*.jsonl (rule 10)")

    # orthography (if declared)
    orth = plan.get("orthography") or {}
    symbols = orth.get("symbol_count", 0)

    # capacity math (hard rule 8): per band, new items <= 6 * units
    prev_budget = 0
    for b in ordered:
        n_units = len(plan["units"].get(b, []))
        budget = plan["lexicon"].get(b, {}).get("budget", 0)
        new_words = budget - prev_budget
        prev_budget = budget
        new_items = new_words + (symbols if b == ordered[0] and orth else 0)
        cap = ITEM_CAP * n_units
        if new_items > cap:
            need = -(-new_items // ITEM_CAP)  # ceil
            errs.append(
                f"{b}: {new_items} new items (words{f' + {symbols} symbols' if orth and b == ordered[0] else ''}) "
                f"but {n_units} units x {ITEM_CAP} = {cap} capacity; needs >= {need} units"
            )

    # grammar ids
    for b in ordered:
        for gid in plan["grammar"].get(b, []):
            if not re.fullmatch(rf"{p}\.grammar\.[a-z0-9.-]+", gid):
                errs.append(f"grammar id violates <p>.grammar.* grammar: {gid}")

    if errs:
        print("\n".join("ERROR " + e for e in errs))
        print(f"\nplan REJECTED: {len(errs)} problem(s). The model must replan.")
        return 1
    print(f"plan OK: {len(goal_ids)} goals, {len(seen_files)} units, "
          f"final budget {prev} words" + (f", {symbols} symbols" if symbols else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
