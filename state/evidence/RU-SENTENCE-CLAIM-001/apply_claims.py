#!/usr/bin/env python3
"""RU-SENTENCE-CLAIM-001 — build and apply the sentence-claim map.

Pure content_ref additions: one new activity per (host unit, claim group) appended
to the unit's existing `activities` list. No sentence text/gloss/media touched.
Band rule: a sentence is claimed into a unit whose goal band equals the sentence's
band tag (`cp` -> a1, matching tools/qa_stories.py).

Usage: apply_claims.py [--apply]   (default: dry run + writes claim-map.json)
"""
import argparse
import collections
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))  # .../state/evidence/RU-SENTENCE-CLAIM-001
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
PACK = os.path.join(REPO, "languages", "ru-RU")
UNITS = os.path.join(PACK, "curriculum", "units")
ORPHAN_CENSUS = os.path.join(REPO, "state", "evidence", "ORPHAN-CONTENT-001", "orphan-ids.json")

# story series id -> host unit id (topic-matched, same band)
STORY_HOSTS = {
    # a1 stories -> a1 journey units
    "ru.story.a1.kot-doma": "ru.unit.a1.home-01",
    "ru.story.a1.moy-den": "ru.unit.a1.routines-01",
    "ru.story.a1.podarok-dlya-mamy": "ru.unit.a1.shopping-09",
    "ru.story.a1.shapka-v-parke": "ru.unit.a1.city-10",
    # a2 stories -> a2.past-events
    "ru.story.a2.avtobus-ne-prishol": "ru.unit.a2.past-events-01",
    "ru.story.a2.sosed-s-gitarioy": "ru.unit.a2.past-events-03",
    "ru.story.a2.telefon-v-taksi": "ru.unit.a2.past-events-05",
    "ru.story.a2.rybalka-zimoy": "ru.unit.a2.past-events-10",
    # b1 stories -> b1.narration
    "ru.story.b1.kluch-ot-dachi": "ru.unit.b1.narration-sequence-01",
    "ru.story.b1.pismo-ne-temu": "ru.unit.b1.narration-sequence-02",
    "ru.story.b1.internet-v-derevne": "ru.unit.b1.narration-sequence-09",
    "ru.story.b1.noch-v-poezde": "ru.unit.b1.narration-sequence-08",
    # b2 stories -> b2 band
    "ru.story.b2.aukcion-odnoy-kartiny": "ru.unit.b2.lit-01",
    "ru.story.b2.dva-bileta-v-odin-teatr": "ru.unit.b2.neg-01",
    "ru.story.b2.gorod-bez-karty": "ru.unit.b2.soc-01",
    "ru.story.b2.perevodchik-vse-pereputal": "ru.unit.b2.lex-03",
    "ru.story.b2.spor-o-budushchem": "ru.unit.b2.argue-03",
    # cp stories (band cp -> a1 units)
    "ru.story.cp.at-the-market": "ru.unit.a1.shopping-01",
    "ru.story.cp.morning-of-anna": "ru.unit.a1.routines-01",
    "ru.story.cp.walk-in-the-forest": "ru.unit.a1.routines-10",
}

# cp sentences no cp story references -> host unit (topic cluster), band cp -> a1
CP_LEFTOVERS = {
    "ru.unit.a1.personal-details-01": ["p01"],
    "ru.unit.a1.personal-details-03": ["p03"],
    "ru.unit.a1.personal-details-07": ["p02"],
    "ru.unit.a1.basic-messages-01": ["p13"],
    "ru.unit.a1.basic-messages-05": ["p04"],
    "ru.unit.a1.routines-01": ["p07", "p08"],
    "ru.unit.a1.routines-02": ["p40"],
    "ru.unit.a1.routines-03": ["p15"],
    "ru.unit.a1.routines-04": ["p05"],
    "ru.unit.a1.routines-05": ["p12"],
    "ru.unit.a1.home-01": ["p14", "p30", "p32"],
    "ru.unit.a1.food-01": ["p18"],
    "ru.unit.a1.food-02": ["p16", "p33", "p38"],
    "ru.unit.a1.food-05": ["p19"],
    "ru.unit.a1.time-plans-05": ["p22", "p23", "p24", "p25"],
    "ru.unit.a1.routines-10": ["p31"],
}


def load_units():
    import yaml

    units = {}
    for path in sorted(glob.glob(os.path.join(UNITS, "*.yaml"))):
        doc = yaml.safe_load(open(path, encoding="utf-8"))
        units[doc["id"]] = path
    return units


def unit_band(unit_id):
    return unit_id.split(".")[2]


def story_sentences():
    import yaml

    out = {}
    for path in sorted(glob.glob(os.path.join(PACK, "stories", "*.yaml"))):
        doc = yaml.safe_load(open(path, encoding="utf-8"))
        out[doc["id"]] = list(doc["sentences"])
    return out


def build_map():
    units = load_units()
    stories = story_sentences()
    orphans = set(json.load(open(ORPHAN_CENSUS, encoding="utf-8"))["orphan_sentence_ids"])
    claims = []  # {unit, activity_id, refs, kind}

    for story, host in STORY_HOSTS.items():
        refs = stories[story]
        band = unit_band(host)
        slug = story.split(".")[-1]
        if story.startswith("ru.story.cp."):
            slug = "cp-" + slug
        claims.append(
            {
                "unit": host,
                "activity_id": f"ru.activity.{band}.story-{slug}",
                "refs": refs,
                "kind": "story",
                "source": story,
            }
        )

    for host, parts in CP_LEFTOVERS.items():
        band = unit_band(host)
        slug = host.split(".")[-1]
        claims.append(
            {
                "unit": host,
                "activity_id": f"ru.activity.{band}.parity-{slug}",
                "refs": [f"ru.sent.cp.{p}" for p in parts],
                "kind": "parity",
                "source": "content-parity-2026-10-12 (unstoried)",
            }
        )

    # loose a2 journey sentence: host = unit that claims its shard neighbours
    neighbours = collections.Counter()
    for uid, path in units.items():
        text = open(path, encoding="utf-8").read()
        for n in range(112, 121):
            if n == 116:
                continue
            if f"ru.sent.a2.u{n:03d}" in text:
                neighbours[uid] += 1
    host = neighbours.most_common(1)[0][0] if neighbours else "ru.unit.a2.past-events-01"
    claims.append(
        {
            "unit": host,
            "activity_id": f"ru.activity.a2.parity-{host.split('.')[-1]}-u116",
            "refs": ["ru.sent.a2.u116"],
            "kind": "parity",
            "source": "journeys-2026-10-14 loose row (neighbour host = %s)" % host,
        }
    )

    # validation: hosts exist, ids unique, refs are all orphans, coverage exact
    seen_ids = set()
    for u in units.values():
        for m in re.finditer(r'^\s*- id: (\S+)$', open(u, encoding="utf-8").read(), re.M):
            seen_ids.add(m.group(1))
    covered = set()
    for c in claims:
        assert c["unit"] in units, f"missing host unit {c['unit']}"
        assert c["activity_id"] not in seen_ids, f"duplicate activity id {c['activity_id']}"
        for r in c["refs"]:
            assert r in orphans, f"ref {r} is not an orphan row"
            covered.add(r)
    missing = sorted(orphans - covered)
    extra = sorted(covered - orphans)
    return claims, missing, extra, len(orphans)


def apply_claims(claims):
    by_unit = collections.defaultdict(list)
    for c in claims:
        by_unit[c["unit"]].append(c)
    import yaml

    changed = []
    for uid, groups in by_unit.items():
        path = load_units()[uid]
        text = open(path, encoding="utf-8").read()
        doc = yaml.safe_load(text)
        band = unit_band(uid)
        blocks = []
        for g in groups:
            lines = [
                f"- id: {g['activity_id']}",
                "  type: encounter-read",
                "  modality: reading",
                "  support_level: 1",
                "  content_refs:",
            ]
            lines += [f"  - {r}" for r in g["refs"]]
            blocks.append("\n".join(lines))
        insert = "\n".join(blocks) + "\n"
        anchor = None
        for key in ("generation_contract:", "requires_unit:", "review_status:", "sources:"):
            if re.search(rf"^{key}", text, re.M):
                anchor = re.search(rf"^{key}", text, re.M).start()
                break
        assert anchor is not None, f"no insertion anchor in {path}"
        new = text[:anchor] + insert + text[anchor:]
        # sanity: the new doc parses and every new activity id is present
        nd = yaml.safe_load(new)
        ids = [a["id"] for a in nd["activities"]]
        for g in groups:
            assert g["activity_id"] in ids, f"{g['activity_id']} not in parsed activities"
        assert len(ids) == len(doc["activities"]) + len(groups)
        open(path, "w", encoding="utf-8").write(new)
        changed.append(uid)
    return changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    claims, missing, extra, n_orphans = build_map()
    total_refs = sum(len(c["refs"]) for c in claims)
    print(f"groups={len(claims)} refs={total_refs} orphans={n_orphans}")
    print("UNCOVERED orphans:", missing)
    print("NON-orphan refs:", extra)
    json.dump(
        {
            "card": "RU-SENTENCE-CLAIM-001",
            "rule": "sentence band tag == hosting unit goal band (cp -> a1)",
            "groups": claims,
            "orphan_total": n_orphans,
            "covered": sum(len(c["refs"]) for c in claims),
            "uncovered": missing,
        },
        open(os.path.join(ROOT, "claim-map.json"), "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=2,
    )
    if missing or extra:
        print("MAP INCOMPLETE — not applying")
        sys.exit(1)
    if args.apply:
        changed = apply_claims(claims)
        print(f"applied to {len(changed)} unit files")
    else:
        print("dry run (claim-map.json written)")


if __name__ == "__main__":
    main()
