#!/usr/bin/env python3
"""RU-LEXICON-CLAIM-001 — build and apply the lexicon-claim map.

Pure content_ref additions: one new activity per (host unit, claim group) appended
to the unit's existing `activities` list, plus allowed_vocab sync (see
sync_allowed_vocab.py). No lexicon text/gloss/audio touched.

Disposition rules (state/notes/RU-LEXICON-CLAIM-001.md):
  1. topic groups -> the unit family already claiming sibling rows of the same
     group, round-robin over sorted family units;
  2. stories202611 words -> the story that introduced the lemma (pymorphy3 match
     over stress-stripped story sentences) -> that story's host unit from
     RU-SENTENCE-CLAIM-001's claim map;
  3. nature -> ru.unit.a1.routines-10 (host of ru.story.cp.walk-in-the-forest).

Usage: apply_claims.py [--apply]   (default: dry run + writes claim-map.json)
"""
import argparse
import collections
import glob
import json
import os
import re
import sys

import yaml

ROOT = os.path.dirname(os.path.abspath(__file__))  # .../state/evidence/RU-LEXICON-CLAIM-001
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
PACK = os.path.join(REPO, "languages", "ru-RU")
UNITS = os.path.join(PACK, "curriculum", "units")
ORPHAN_CENSUS = os.path.join(REPO, "state", "evidence", "ORPHAN-CONTENT-001", "orphan-ids.json")
SENTENCE_MAP = os.path.join(REPO, "state", "evidence", "RU-SENTENCE-CLAIM-001", "claim-map.json")

NATURE_HOST = "ru.unit.a1.routines-10"

# Lemma-match exceptions: retro-gloss rows whose story word form lemmatizes to a
# different head (pymorphy: цветами -> цветок, but the counted lemma for the
# vocab budget was цвет "color; flower"). Only story containing the form:
# ru.story.a1.podarok-dlya-mamy («Подарок — торт с цветами.»).
STORY_EXCEPTIONS = {"ru.lex.stories202611.tsvet": "ru.story.a1.podarok-dlya-mamy"}


def group(content_id):
    return content_id.split(".")[2]


def load_units():
    units = {}
    for path in sorted(glob.glob(os.path.join(UNITS, "*.yaml"))):
        doc = yaml.safe_load(open(path, encoding="utf-8"))
        units[doc["id"]] = path
    return units


def unit_band(unit_id):
    return unit_id.split(".")[2]


def lex_rows():
    rows = {}
    for path in glob.glob(os.path.join(PACK, "lexicon", "*.jsonl")):
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if line:
                r = json.loads(line)
                rows[r["id"]] = r
    return rows


def claimed_lex_by_unit():
    """lexicon id -> set(unit ids) currently referencing it in an activity."""
    ref_units = collections.defaultdict(set)
    for path in glob.glob(os.path.join(UNITS, "*.yaml")):
        doc = yaml.safe_load(open(path, encoding="utf-8"))
        for act in doc.get("activities") or []:
            for ref in act.get("content_refs") or []:
                if ref.startswith("ru.lex."):
                    ref_units[ref].add(doc["id"])
    return ref_units


def story_of_word(words):
    """lemma match: orphan word id -> story id that contains its lemma."""
    from pymorphy3 import MorphAnalyzer

    ma = MorphAnalyzer()
    sents = {}
    for path in glob.glob(os.path.join(PACK, "sentences", "*.jsonl")):
        for line in open(path, encoding="utf-8"):
            if line.strip():
                r = json.loads(line)
                sents[r["id"]] = r.get("text", "")

    def lemmas(text):
        toks = re.findall(r"[А-Яа-яЁё]+", text.replace("\u0301", ""))
        return {ma.parse(t)[0].normal_form for t in toks}

    story_lem = {}
    for path in sorted(glob.glob(os.path.join(PACK, "stories", "*.yaml"))):
        doc = yaml.safe_load(open(path, encoding="utf-8"))
        ls = set()
        for sid in doc["sentences"]:
            ls |= lemmas(sents.get(sid, ""))
        story_lem[doc["id"]] = ls

    out = {}
    for wid, form in words.items():
        lemma = ma.parse(form)[0].normal_form
        hits = [s for s, ls in story_lem.items() if lemma in ls]
        out[wid] = hits
    return out


def build_map():
    units = load_units()
    rows = lex_rows()
    orphans = set(json.load(open(ORPHAN_CENSUS, encoding="utf-8"))["orphan_lexicon_ids"])
    ref_units = claimed_lex_by_unit()

    claims = []  # {unit, activity_id, refs, kind, source}

    # 1. topic groups: family = units claiming sibling rows of the same group
    groups = collections.defaultdict(list)
    for oid in sorted(orphans):
        groups[group(oid)].append(oid)
    for g, ids in sorted(groups.items()):
        if g in ("stories202611", "nature"):
            continue
        family = set()
        for oid in rows:
            if group(oid) == g and oid not in orphans:
                family |= ref_units.get(oid, set())
        assert family, f"group {g} has no claiming family — disposition must be dictionary-weight"
        fam = sorted(family)
        by_host = collections.defaultdict(list)
        for i, oid in enumerate(sorted(ids)):
            by_host[fam[i % len(fam)]].append(oid)
        for host, refs in sorted(by_host.items()):
            band = unit_band(host)
            claims.append(
                {
                    "unit": host,
                    "activity_id": f"ru.activity.{band}.lexclaim-{g}-{host.split('.')[-1]}",
                    "refs": refs,
                    "kind": "topic-family",
                    "source": f"family of ru.lex.{g}.* claiming units ({len(fam)} units)",
                }
            )

    # 2. stories202611 words -> introducing story -> that story's host unit
    sent_map = json.load(open(SENTENCE_MAP, encoding="utf-8"))
    story_hosts = {}
    for c in sent_map["groups"]:
        if c.get("kind") == "story":
            story_hosts[c["source"]] = c["unit"]
    s_words = {oid: rows[oid]["forms"][0]["text"] for oid in groups.get("stories202611", [])}
    hits = story_of_word(s_words)
    by_host = collections.defaultdict(list)
    band_rank = {"a1": 0, "cp": 0, "a2": 1, "b1": 2, "b2": 3, "c1": 4}
    for oid in sorted(s_words):
        hs = hits[oid]
        if not hs and oid in STORY_EXCEPTIONS:
            hs = [STORY_EXCEPTIONS[oid]]
        if len(hs) > 1:
            # lemma appears in several stories: claim into the LOWEST-band story's
            # host (conservative ladder position); recorded in claim-map source.
            hs = sorted(hs, key=lambda s: band_rank.get(s.split(".")[2], 9))
        assert hs, f"{oid}: no story at all"
        story = hs[0]
        host = story_hosts[story]
        by_host[(host, story)].append(oid)
    for (host, story), refs in sorted(by_host.items()):
        band = unit_band(host)
        slug = story.split(".")[-1]
        claims.append(
            {
                "unit": host,
                "activity_id": f"ru.activity.{band}.story-words-{slug}",
                "refs": refs,
                "kind": "story-words",
                "source": story,
            }
        )

    # 3. nature -> walk-in-the-forest host unit
    if "nature" in groups:
        band = unit_band(NATURE_HOST)
        claims.append(
            {
                "unit": NATURE_HOST,
                "activity_id": f"ru.activity.{band}.nature-words-walk-in-the-forest",
                "refs": sorted(groups["nature"]),
                "kind": "nature",
                "source": "ru.story.cp.walk-in-the-forest vocabulary (group family = none)",
            }
        )

    # validation: hosts exist, ids unique, refs are all orphans, coverage exact
    seen_ids = set()
    for u in units.values():
        for m in re.finditer(r"^\s*- id: (\S+)$", open(u, encoding="utf-8").read(), re.M):
            seen_ids.add(m.group(1))
    covered = set()
    for c in claims:
        assert c["unit"] in units, f"missing host unit {c['unit']}"
        assert c["activity_id"] not in seen_ids, f"duplicate activity id {c['activity_id']}"
        seen_ids.add(c["activity_id"])
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
    units = load_units()
    changed = []
    for uid, groups in by_unit.items():
        path = units[uid]
        text = open(path, encoding="utf-8").read()
        doc = yaml.safe_load(text)
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
            m = re.search(rf"^{key}", text, re.M)
            if m:
                anchor = m.start()
                break
        assert anchor is not None, f"no insertion anchor in {path}"
        new = text[:anchor] + insert + text[anchor:]
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
            "card": "RU-LEXICON-CLAIM-001",
            "rule": "topic-group family / story-lemma host / nature -> routines-10; dictionary-weight column empty",
            "groups": claims,
            "dictionary_weight": [],
            "orphan_total": n_orphans,
            "covered": total_refs,
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
