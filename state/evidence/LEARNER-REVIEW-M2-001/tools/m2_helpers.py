#!/usr/bin/env python3
"""LEARNER-REVIEW-M2-001 shared helpers: worklist windowing, ASR id sets,
experience metrics. Month-2 = days 31-60 of the M2 walk (raw logs contain
days 1-60; days 1-30 are the seeded prefix, NOT audited content).

Usage:
  python3 tools/m2_helpers.py asr-ids        -> sim/asr-ids-{ru,ja}.txt (+ counts)
  python3 tools/m2_helpers.py metrics        -> sim/exp-metrics.json (+ printed summary)
  python3 tools/m2_helpers.py split-seed     -> move day 1-30 raw logs to sim/raw-seed/
"""
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

EVID = Path(__file__).resolve().parent.parent
SIM = EVID / "sim"
# M2 addendum (run 2): the live main tree's languages/ manifest carries a
# sibling lane's UNCOMMITTED edits; the walk (and the sha-frozen media) were
# HEAD a4b5f41d in scratch/lts-m2-head. LTS_REPO lets the manifest read
# point at the same frozen tree the audio was audited from.
REPO = Path(os.environ.get("LTS_REPO", "/home/hunter/game-dev/LTS"))
PACKS = {"ru": "ru-RU", "ja": "ja-JP"}
TEXT_KEYS = {
    "text", "surface", "reading", "gloss", "prompt", "label", "title",
    "sentence", "question", "answer", "body", "line", "meaning", "hint",
    "transcript", "translation", "romanization", "cue", "reason", "heading",
}


def iter_texts(obj, _d=0):
    if _d > 12:
        return
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "args":
                continue
            if isinstance(v, str) and k in TEXT_KEYS:
                yield k, v
            else:
                yield from iter_texts(v, _d + 1)
    elif isinstance(obj, list):
        for v in obj:
            yield from iter_texts(v, _d + 1)


def load_days(pack, lo=31, hi=60):
    out = {}
    for f in sorted((SIM / "raw").glob(f"{pack}-day*.json")):
        rec = json.loads(f.read_text())
        if lo <= rec["day"] <= hi:
            out[rec["day"]] = rec
    return out


def served_texts_and_cids(pack, lo=31, hi=60):
    texts = set()
    cids = set()
    for day, rec in load_days(pack, lo, hi).items():
        for call in rec["calls"]:
            resp = call.get("resp")
            for _k, t in iter_texts(resp):
                t = t.strip()
                if len(t) >= 2:
                    texts.add(t)
            if call["cmd"] == "practice_task" and isinstance(resp, dict):
                iid = resp.get("item_id") or ""
                cid = iid.split("#")[0]
                if cid:
                    cids.add(cid)
    return texts, cids


def asr_ids():
    for pack, loc in PACKS.items():
        texts, cids = served_texts_and_cids(pack)
        manifest = [json.loads(l) for l in
                    (REPO / f"languages/{loc}/media/manifest.jsonl").read_text().splitlines() if l.strip()]
        chosen = set()
        reason = {}
        for r in manifest:
            t = (r.get("text") or "").strip()
            if t and t in texts:
                chosen.add(r["id"])
                reason[r["id"]] = "text"
            elif any(r["id"] == c or r["id"].startswith(c + "-") or c.startswith(r["id"]) for c in cids):
                chosen.add(r["id"])
                reason.setdefault(r["id"], "cid")
        ids = sorted(chosen)
        (EVID / "sim" / f"asr-ids-{pack}.txt").write_text("\n".join(ids) + "\n")
        by_fam = defaultdict(int)
        for i in ids:
            by_fam[".".join(i.split(".")[:2])] += 1
        print(pack, len(ids), dict(by_fam))
        (EVID / "sim" / f"asr-ids-{pack}.reason.json").write_text(json.dumps(reason, ensure_ascii=False, indent=1))


def metrics():
    """Experience metrics over the 31-60 window (per pack), plus the seeded
    1-30 window for the RU-inflow comparison against M1."""
    out = {}
    for pack in PACKS:
        all_days = {d: rec for d, rec in
                    ((json.loads(f.read_text())["day"], f) for f in
                     sorted((SIM / "raw").glob(f"{pack}-day*.json")) +
                     # M2 run 2: seed logs moved to sim/raw-seed by split-seed;
                     # chain them so seed totals and true cross-month novelty work.
                     sorted((SIM / "raw-seed").glob(f"{pack}-day*.json")))}
        per_day = {}
        first_seen = {}
        for day, rec in sorted(all_days.items()):
            rec = json.loads(rec.read_text()) if isinstance(rec, Path) else rec
            texts = set()
            offers = 0
            mods = set()
            practice_items = 0
            path_units = None
            path_locked = None
            for call in rec["calls"]:
                resp = call.get("resp")
                for _k, t in iter_texts(resp):
                    if len(t.strip()) >= 2:
                        texts.add(t.strip())
                if call["cmd"] == "current_offer" and resp:
                    offers += 1
                if call["cmd"] == "practice_task" and isinstance(resp, dict):
                    practice_items += 1
                    mods.add((resp.get("item_id") or "").split("#")[-1])
                if call["cmd"] == "unit_path" and isinstance(resp, (list, dict)):
                    units = resp.get("units") if isinstance(resp, dict) else resp
                    if isinstance(units, list) and units:
                        path_units = len(units)
                        path_locked = sum(1 for u in units if isinstance(u, dict) and u.get("locked"))
            new_items = [t for t in texts if t not in first_seen]
            for t in new_items:
                first_seen[t] = day
            per_day[day] = {
                "new_items": len(new_items),
                "texts_total": len(texts),
                "offers": offers,
                "practice_opens": practice_items,
                "modalities": sorted(mods),
                "path_units": path_units,
                "path_locked": path_locked,
            }
        m2 = {d: v for d, v in per_day.items() if d >= 31}
        m1 = {d: v for d, v in per_day.items() if d <= 30}
        out[pack] = {
            "seed_days_1_30": {
                "new_items_total": sum(v["new_items"] for v in m1.values()),
                "offer_days": sum(1 for v in m1.values() if v["offers"]),
            },
            "month2_days_31_60": {
                "new_items_total": sum(v["new_items"] for v in m2.values()),
                "new_items_per_day_avg": round(sum(v["new_items"] for v in m2.values()) / max(1, len(m2)), 2),
                "offer_days": sum(1 for v in m2.values() if v["offers"]),
                "practice_opens_total": sum(v["practice_opens"] for v in m2.values()),
                "modality_union": sorted({m for v in m2.values() for m in v["modalities"]}),
                "first_modality_day": _first_modality(per_day),
                "path_units_last_day": m2[max(m2)]["path_units"],
                "path_locked_last_day": m2[max(m2)]["path_locked"],
                "path_units_first_day": m2[min(m2)]["path_units"],
                "path_locked_first_day": m2[min(m2)]["path_locked"],
            },
            "per_day": per_day,
        }
    (SIM / "exp-metrics.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    for pack, v in out.items():
        print(pack, "seed new items 1-30:", v["seed_days_1_30"], "| month2:", {k: x for k, x in v["month2_days_31_60"].items() if "path" not in k})
        print("   path:", {k: x for k, x in v["month2_days_31_60"].items() if "path" in k})


def _first_modality(per_day):
    seen = {}
    for d in sorted(per_day):
        for m in per_day[d]["modalities"]:
            seen.setdefault(m, d)
    return seen


def split_seed():
    seed = SIM / "raw-seed"
    seed.mkdir(exist_ok=True)
    n = 0
    for f in sorted((SIM / "raw").glob("*-day0[0-2][0-9].json")) + sorted((SIM / "raw").glob("*-day030.json")):
        f.rename(seed / f.name)
        n += 1
    print("moved", n, "seed day logs ->", seed)


if __name__ == "__main__":
    {"asr-ids": asr_ids, "metrics": metrics, "split-seed": split_seed}[sys.argv[1]]()
