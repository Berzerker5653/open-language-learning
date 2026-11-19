#!/usr/bin/env python3
"""Canonical board reader: one command, one answer, every session.

Usage: python3 scripts/board-status.py [--json]
Prints: done/blocked/open counts, blocked cards with reasons, last update,
and the current release candidate pointer. Handles both task-state shapes
(string-ID list + dict records) defensively.
"""
import json
import sys
from collections import Counter

STATE = "state/task-state.json"


def load_records(path=STATE):
    d = json.load(open(path))
    raw = d.get("tasks") or []
    if isinstance(raw, dict):
        # id -> record map (current schema)
        recs = [{"id": k, **v} for k, v in raw.items() if isinstance(v, dict)]
        ids = [k for k, v in raw.items() if not isinstance(v, dict)]
    else:
        recs = [t for t in raw if isinstance(t, dict)]
        ids = [t for t in raw if isinstance(t, str)]
    # ID-only entries: enrich with ROADMAP titles.
    if ids:
        try:
            import yaml
            road = yaml.safe_load(open("tasks/ROADMAP.yaml"))
            by_id = {t["id"]: t for t in road.get("tasks", [])}
            for i in ids:
                r = by_id.get(i, {})
                recs.append({"id": i, "status": "unknown",
                             "title": r.get("title"), "notes": ""})
        except Exception:
            recs.extend({"id": i, "status": "unknown", "title": None, "notes": ""}
                        for i in ids)
    return d, recs


def main():
    d, recs = load_records()
    st = Counter(t.get("status", "unknown") for t in recs)
    out = {
        "updated": d.get("updated"),
        "release_candidate": d.get("current_release_candidate"),
        "total": len(recs),
        "counts": dict(st),
        "blocked": [
            {
                "id": t.get("id"),
                "title": t.get("title") or t.get("summary"),
                "notes": (t.get("notes") or "")[:200],
            }
            for t in recs
            if t.get("status") == "blocked"
        ],
        "multi_attempt": [
            t.get("id") for t in recs
            if isinstance(t.get("attempts"), int) and t["attempts"] > 1
        ],
    }
    if "--json" in sys.argv:
        print(json.dumps(out, indent=1))
    else:
        print(f"updated: {out['updated']}  RC: {out['release_candidate']}")
        print(f"tasks: {out['total']}  {out['counts']}")
        for b in out["blocked"]:
            print(f"  BLOCKED {b['id']}: {b['title']} | {b['notes']}")
        if out["multi_attempt"]:
            print("reworked:", ", ".join(out["multi_attempt"]))


if __name__ == "__main__":
    main()
