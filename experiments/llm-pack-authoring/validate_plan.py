#!/usr/bin/env python3
"""Mechanically validate a Mode B CURRICULUM_PLAN.yaml.

    ./validate_plan.py plans/<label>.yaml

Accepts both plan shapes seen in practice:
- v0: units as flat {file, topic, goal} lists; lexicon budget; grammar id lists
- v1: units as blocks with `lessons` or `files`; cumulative_word_budget;
  grammar concepts maps; per-band sentence budgets; orthography scripts.

Checks contract facts a human cannot be expected to judge (id grammar,
band names, numbering, goal/unit coverage, and the capacity math implied
by hard rule 8: new_item_budget <= 6 per ordinary unit; script units
with new_item_budget 0 carry symbols instead). It does NOT certify
pedagogy — content stays draft pending qualified human review.
Exit 0 = contract-consistent; exit 1 = diagnostics, model must replan.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

import yaml

BANDS = ["on-ramp", "A1", "A2", "B1", "B2", "C1", "C2"]
ITEM_CAP = 6  # hard rule 8
UNIT_FILE = re.compile(r"^(\d{3,4})-[a-z0-9-]+\.yaml$")


def band_units(band_units_raw):
    """Yield (file, goal, item_budget) for every unit listed in a band."""
    for entry in band_units_raw or []:
        if isinstance(entry, dict) and "file" in entry:  # v0 flat lesson
            yield entry["file"], entry.get("goal"), ITEM_CAP
        elif isinstance(entry, dict):  # v1 block
            budget = entry.get("new_item_budget", ITEM_CAP)
            goal = entry.get("goal")
            for lesson in entry.get("lessons", []):
                yield lesson["file"], lesson.get("goal", goal), lesson.get(
                    "new_item_budget", budget)
            for f in entry.get("files", []):
                yield f, goal, budget


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

    band_names = list(plan["bands"])
    unknown = [b for b in band_names if b not in BANDS]
    if unknown:
        errs.append(f"unknown bands: {unknown}")
    ordered = [b for b in BANDS if b in band_names]
    if band_names != ordered:
        errs.append(f"bands out of CEFR order: {band_names}")

    # goals
    goal_ids = [g.get("id", "") for b in band_names for g in plan["bands"][b].get("goals", [])]
    if not goal_ids:
        errs.append("no goals in any band")
        print("\n".join("ERROR " + e for e in errs))
        return 1
    p = goal_ids[0].split(".")[0]
    for gid in goal_ids:
        if not re.fullmatch(rf"{p}\.goal\.[a-z0-9.-]+", gid):
            errs.append(f"goal id violates <p>.goal.* grammar: {gid}")
    # prerequisite targets must exist
    for b in band_names:
        for g in plan["bands"][b].get("goals", []):
            for pre in g.get("prerequisites") or []:
                if isinstance(pre, dict) and pre.get("target") not in goal_ids:
                    errs.append(f"{g.get('id')}: prerequisite target unknown: {pre.get('target')}")

    # units: numbering, goal coverage, declared unit_count
    seen_files, unit_goals, band_unit_lists = set(), {}, {}
    for b in band_names:
        raw = plan["units"].get(b, [])
        units = list(band_units(raw))
        band_unit_lists[b] = units
        declared = plan["bands"][b].get("unit_count")
        if declared is not None and declared != len(units):
            errs.append(f"{b}: unit_count says {declared}, file lists contain {len(units)}")
        for f, goal, _budget in units:
            m = UNIT_FILE.match(str(f))
            if not m:
                errs.append(f"unit file name must be NNN-<topic>.yaml: {f}")
                continue
            if f in seen_files:
                errs.append(f"duplicate unit file: {f}")
            seen_files.add(f)
            if goal not in goal_ids:
                errs.append(f"{f} references unknown goal: {goal}")
            unit_goals.setdefault(goal, []).append(f)
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
        budget = lx.get("cumulative_word_budget", lx.get("budget", 0))
        if budget <= prev:
            errs.append(f"lexicon budget for {b} ({budget}) must exceed previous band ({prev})")
        prev = budget
        for s in list(lx.get("shards", [])) + list(lx.get("shard_additions", {})):
            if "orthograph" in str(s):
                errs.append(f"{b}: '{s}' is not a lexicon shard — symbol records live in orthography/*.jsonl (rule 10)")

    # grammar ids + per-band new counts
    def grammar_new(b):
        g = plan["grammar"].get(b)
        if isinstance(g, dict):
            concepts = g.get("concepts", {})
            ids = list(concepts) if isinstance(concepts, dict) else concepts
            return g.get("new_concepts", len(ids)), ids
        ids = g or []
        return len(ids), ids

    # sentences per-band new records (v1)
    sent_band = (plan.get("sentences") or {}).get("band_budgets", {})

    # orthography (if declared)
    orth = plan.get("orthography") or {}
    symbols = orth.get("symbol_count", 0)
    scripts = orth.get("scripts") or []
    if scripts and not symbols:
        symbols = sum(s.get("total_symbol_records", 0) for s in scripts)
    for s in scripts:
        to = s.get("teaching_order")
        if to:
            total = sum(step.get("symbol_records", 0) for step in to)
            if s.get("total_symbol_records") is not None and total != s["total_symbol_records"]:
                errs.append(f"orthography {s.get('id')}: teaching_order covers {total} symbols but total_symbol_records says {s['total_symbol_records']}")

    # capacity math (hard rule 8): per band, new items <= sum(unit budgets);
    # script units (budget 0) carry symbols, not counted items.
    prev_budget = 0
    for b in ordered:
        units = band_unit_lists[b]
        cap = sum(bud for _f, _g, bud in units)
        lx = plan["lexicon"].get(b, {})
        budget = lx.get("cumulative_word_budget", lx.get("budget", 0))
        new_words = budget - prev_budget
        prev_budget = budget
        g_new, g_ids = grammar_new(b)
        s_new = sent_band.get(b, {}).get("new_records", 0)
        new_items = new_words + g_new + s_new
        if new_items > cap:
            errs.append(
                f"{b}: {new_items} new items ({new_words} words + {g_new} grammar + {s_new} sentences) "
                f"exceed unit capacity {cap} (units x their new_item_budget)"
            )
        elif cap - new_items > ITEM_CAP * 2:
            errs.append(f"NOTE {b}: capacity {cap} vs {new_items} items — {cap - new_items} unused slots (wasted units)")

    for b in ordered:
        for gid in grammar_new(b)[1]:
            if not re.fullmatch(rf"{p}\.grammar\.[a-z0-9.-]+", str(gid)):
                errs.append(f"grammar id violates <p>.grammar.* grammar: {gid}")

    if errs:
        hard = [e for e in errs if not e.startswith("NOTE")]
        print("\n".join(("WARN " if e.startswith("NOTE") else "ERROR ") + e for e in errs))
        if hard:
            print(f"\nplan REJECTED: {len(hard)} problem(s). The model must replan.")
            return 1
    total_units = sum(len(v) for v in band_unit_lists.values())
    print(f"plan OK: {len(goal_ids)} goals, {total_units} units, "
          f"final budget {prev} words" + (f", {symbols} symbols" if symbols else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
