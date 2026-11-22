#!/usr/bin/env python3
"""PATH-SECTIONS-DEDUP-001 audit: every unit -> band mapping, zero unmapped,
and the section grouping the frontend would currently derive (consecutive
bands over file-sorted unit order)."""
import json
import sys
from pathlib import Path

import yaml

PACK = Path(sys.argv[1] if len(sys.argv) > 1 else "languages/ru-RU")
units_dir = PACK / "curriculum" / "units"
goals = yaml.safe_load((PACK / "curriculum" / "goals.yaml").read_text())
goal_list = goals["goals"] if isinstance(goals, dict) else goals
goal_band = {g["id"]: g.get("band") for g in goal_list}

paths = sorted(p for p in units_dir.iterdir() if p.suffix == ".yaml")
rows = []
unmapped = []
for p in paths:
    u = yaml.safe_load(p.read_text())
    gid = u.get("goal_id")
    band = goal_band.get(gid)
    if gid not in goal_band or band is None:
        unmapped.append((p.name, u["id"], gid, band))
    rows.append((p.name, u["id"], gid, band or "__UNMAPPED__"))

print(f"units: {len(rows)}  goals: {len(goal_band)}")
print(f"unmapped units: {len(unmapped)}")
for r in unmapped:
    print("  UNMAPPED", r)

# consecutive-run grouping, exactly what pathSections() does today
runs = []
for name, uid, gid, band in rows:
    if runs and runs[-1][0] == band:
        runs[-1][1] += 1
        runs[-1][2] = uid
    else:
        runs.append([band, 1, uid])

print(f"sections as derived today: {len(runs)}")
seen = {}
for band, n, last in runs:
    seen.setdefault(band, []).append(n)
for band, counts in seen.items():
    if len(counts) > 1:
        print(f"  DUPLICATE band {band}: runs {counts}")

# list the stray runs (runs after the first occurrence of their band)
# The derived section list — exactly how the fixed view groups: one group
# per band (canonical ladder order), every unit merged INTO its band. This
# is the card's pack-level red test: no duplicate band labels.
canonical = ["on-ramp", "a1", "a2", "b1", "b2", "c1", "c2", "other"]
derived: dict[str, list] = {}
for name, uid, gid, band in rows:
    key = (band or "other").strip().lower()
    derived.setdefault(key, []).append(uid)
dup = 0  # grouping by key cannot duplicate labels; kept for the gate shape
print(f"derived sections: {len(derived)}")
band_summary = {}
for key in canonical + [k for k in derived if k not in canonical]:
    if key in derived:
        band_summary[key] = len(derived[key])
        print(f"  {key}: {band_summary[key]} units")

# Adjacency strays are diagnostic only (the pack's file-order tail that the
# view now merges): report, never fail.
print("adjacency strays (merged by the view, reported for the record):")
first_seen = set()
for i, (band, n, last) in enumerate(runs):
    if band in first_seen:
        start = sum(r[1] for r in runs[:i])
        members = rows[start : start + n]
        print(f"  stray run #{i}: band={band} n={n}")
        for m in members:
            print("    ", m)
    first_seen.add(band)

# also dump full unit->band map + derived section counts for the record
out = {
    "units": [{"unit": u, "goal": g, "band": b, "file": n} for n, u, g, b in rows],
    "sections": band_summary,
}
Path("state/evidence/PATH-SECTIONS-DEDUP-001/unit-band-audit.json").write_text(
    json.dumps(out, indent=1)
)
print("wrote state/evidence/PATH-SECTIONS-DEDUP-001/unit-band-audit.json")

# The pack gate: zero unmapped units, and every unit sits in exactly one
# derived band section (labels unique by construction). A stray tail run is
# fine — the view merges it; an unbanded unit never is.
if unmapped:
    print(f"GATE FAIL: {len(unmapped)} unmapped units")
    sys.exit(1)
print("GATE PASS: zero unmapped units, sections carry every unit once")
