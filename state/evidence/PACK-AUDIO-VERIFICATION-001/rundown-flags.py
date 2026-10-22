"""Flagged-id list for RU-RUNDOWN.sh section B: union of structure-gate
FLAGs and ASR-gate fails, worst gap first. Stdin: audit JSONLs."""
import json
import sys

rows = []
for l in sys.stdin:
    l = l.strip()
    if not l:
        continue
    r = json.loads(l)
    if r.get("verdict") == "FLAG":
        fl = r.get("flags") or {}
        sev = (fl.get("gap", {}) or {}).get("s", 0)
    elif r.get("status") == "MISMATCH":
        sev = 0.5  # wrong content: always audibly broken
    else:
        continue
    rows.append((sev, r["id"]))
rows.sort(reverse=True)
try:
    for s, i in rows:
        print(i)
except BrokenPipeError:
    sys.exit(0)
