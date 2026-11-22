#!/usr/bin/env python3
"""RU-LEXICON-CLAIM-001 — re-measure the LEXICON orphan census over the dev tree.

Same method as ORPHAN-CONTENT-001 and the engine's own `claimed_by_units` set:
every lexicon row in languages/<pack>/lexicon/ is an orphan unless some unit
ACTIVITY's content_refs reference its id. Units are parsed as YAML (refs appear
in both block and flow style across the 818 unit files). Writes
orphan-census-after.json next to this script and prints per-band counts.
"""
import collections
import glob
import json
import os

import yaml

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
PACK = os.path.join(REPO, "languages", "ru-RU")


def main():
    ids = set()
    for path in glob.glob(os.path.join(PACK, "lexicon", "*.jsonl")):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line:
                ids.add(json.loads(line)["id"])
    claimed = set()
    for path in glob.glob(os.path.join(PACK, "curriculum", "units", "*.yaml")):
        doc = yaml.safe_load(open(path, encoding="utf-8"))
        for act in doc.get("activities") or []:
            for ref in act.get("content_refs") or []:
                if ref.startswith("ru.lex."):
                    claimed.add(ref)
    orphans = sorted(ids - claimed)
    per_band = collections.Counter(o.split(".")[2] for o in orphans)
    per_band_claimed = collections.Counter(c.split(".")[2] for c in (ids & claimed))
    out = {
        "measured_by": "RU-SENTENCE-CLAIM-001",
        "method": "sentence jsonl ids minus unit-activity content_refs (YAML-parsed), matching the engine's claimed_by_units",
        "lexicon_rows": len(ids),
        "claimed": len(ids & claimed),
        "orphans": len(orphans),
        "claimed_per_band": dict(per_band_claimed),
        "orphan_per_band": dict(per_band),
        "orphan_lexicon_ids": orphans,
    }
    json.dump(
        out,
        open(os.path.join(ROOT, "orphan-census-after.json"), "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=2,
    )
    print(
        f"rows={len(ids)} claimed={out['claimed']} orphans={out['orphans']} "
        f"orphan_per_band={dict(per_band)} claimed_per_band={dict(per_band_claimed)}"
    )


if __name__ == "__main__":
    main()
