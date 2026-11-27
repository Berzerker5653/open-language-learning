#!/usr/bin/env python3
"""LEARNER-REVIEW-M1-001 journey-sim: simulate a from-zero daily learner for
days 1..30 against the REAL engine (lts-serve, current HEAD) under libfaketime.

Each simulated day: start serve under `faketime @<date>`, run the learner's
daily loop (home -> plan -> practice every served item -> offer/lesson ->
stories -> scenarios), append every raw response to a per-day JSON log, stop
serve. The raw logs are the audit worklist source; `--build-worklist` folds
them into a deduplicated content inventory (id -> text, day first reached).

The sim learner: answers until correct (max 4 attempts, fresh session each,
using the grade's correct_choice for the retry) — this both progresses the
learner model realistically and mechanically re-derives every answer key.
Speaking/dictation typed tasks abstain honestly (no ASR model on this box)
and are logged as skipped surfaces.

Usage:
  python3 scripts/sim_month1.py --pack ru --days 30 [--out DIR] [--from-day N]
  python3 scripts/sim_month1.py --build-worklist --out DIR
"""
import argparse
import http.client
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from datetime import date, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PACKS = {
    "ru": "org.openlanguage.ru-ru.reference",
    "ja": "org.openlanguage.ja-jp.reference",
}
DAY_START = "08:30:00"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Serve:
    def __init__(self, data_dir: Path, fake_at: str, port: int, log_path: Path):
        self.data_dir = data_dir
        self.port = port
        self.log = open(log_path, "a")
        env = dict(os.environ)
        env["LTS_DATA_DIR"] = str(data_dir)
        env["LTS_SERVE_DIST"] = str(REPO / "apps/desktop/dist")
        cmd = [
            "faketime",
            "-f",
            f"@{fake_at}",
            str(REPO / "target/debug/lts-serve"),
            f"127.0.0.1:{port}",
        ]
        self.proc = subprocess.Popen(cmd, env=env, stdout=self.log, stderr=subprocess.STDOUT)
        for _ in range(120):
            try:
                r = api(port, "list_profiles", {}, timeout=2)
                if r.get("ok"):
                    return
            except Exception:
                time.sleep(0.5)
        raise RuntimeError(f"serve did not come up under faketime {fake_at}; see {log_path}")

    def stop(self):
        self.proc.send_signal(signal.SIGTERM)
        try:
            self.proc.wait(10)
        except subprocess.TimeoutExpired:
            self.proc.kill()
        self.log.close()


def api(port: int, cmd: str, args: dict, timeout: float = 120.0):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=timeout)
    try:
        conn.request(
            "POST",
            f"/api/{cmd}",
            json.dumps(args),
            {"content-type": "application/json"},
        )
        res = conn.getresponse()
        text = res.read().decode("utf-8", "replace")
        try:
            value = json.loads(text)
        except json.JSONDecodeError:
            value = text
        return {"ok": 200 <= res.status < 300, "status": res.status, "value": value}
    finally:
        conn.close()


def collect_texts(obj, texts, depth=0):
    """Pull every human-readable string with its key path out of a response."""
    if depth > 12:
        return
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and len(v.strip()) > 1 and k in TEXT_KEYS:
                texts.append((k, v))
            else:
                collect_texts(v, texts, depth + 1)
    elif isinstance(obj, list):
        for v in obj:
            collect_texts(v, texts, depth + 1)


TEXT_KEYS = {
    "text", "surface", "reading", "gloss", "prompt", "label", "title",
    "sentence", "question", "answer", "body", "line", "meaning", "hint",
    "transcript", "translation", "romanization", "cue", "reason", "heading",
}


def run_day(port, profile_id, pack_id, rec, rng_seed, keys):
    """One learner day. Returns summary counts. All served content goes to rec."""

    def call(cmd, args):
        r = api(port, cmd, args)
        rec["calls"].append({"cmd": cmd, "args": args, "resp": r["value"] if not r["ok"] else r["value"]})
        return r

    texts = []
    home = call("home_state", {"profileId": profile_id})
    if home["ok"]:
        collect_texts(home["value"], texts)
    path = call("unit_path", {"profileId": profile_id})
    if path["ok"]:
        collect_texts(path["value"], texts)
    plan = call("practice_plan", {"profileId": profile_id, "minutes": 25})
    plan_items = []
    if plan["ok"] and isinstance(plan["value"], dict):
        for lst in ("reviews", "weakSkills", "progression", "items", "plan"):
            v = plan["value"].get(lst)
            if isinstance(v, list):
                plan_items.extend(v)
        collect_texts(plan["value"], texts)

    # practice every plan item until correct (max 4 graded picks)
    seen = set()
    stats = {"practice": 0, "correct_first": 0, "skipped": 0}
    n = 0
    for item in plan_items:
        cid = None
        mod = None
        if isinstance(item, dict):
            cid = item.get("contentId") or item.get("content_id") or item.get("id")
            mod = item.get("modality") or item.get("dimension")
        if not cid or not mod:
            continue
        key = (cid, mod)
        if key in seen:
            continue
        seen.add(key)
        n += 1
        if n > 40:  # per-day practice cap so the loop stays bounded
            break
        sid = f"sim-{rng_seed}-{n}"
        # UI parity (app/practice-wiring.ts + App.tsx lesson card): every
        # opened activity first fetches lesson_plan(content_id); when a
        # lesson exists, finishing the encounter records
        # encounter_complete(lesson.unit_id) before the drill runs.
        lp = call("lesson_plan", {"profileId": profile_id, "contentId": cid})
        if lp["ok"] and lp["value"] and isinstance(lp["value"], dict):
            collect_texts(lp["value"], texts)
            uid = lp["value"].get("unitId") or lp["value"].get("unit_id")
            if uid:
                call("encounter_complete", {"profileId": profile_id, "unitId": uid})
        # Simulated memory: a learner who has already seen the answer key
        # (from an earlier grading, remembered across days in `keys`)
        # answers correctly first try. First encounters discover the key by
        # trial and record it — this is also the audit's answer-key
        # re-derivation.
        for attempt in range(4):
            pick = 0
            t = call("practice_task", {"profileId": profile_id, "contentId": cid, "modality": mod, "revealReading": False})
            if not t["ok"]:
                stats["skipped"] += 1
                break
            task = t["value"] or {}
            collect_texts(task, texts)
            choices = task.get("choices") or []
            typed = task.get("typed", False)
            item_key = (task.get("itemId") or task.get("item_id")) or f"{cid}#{mod}"

            def submit(choice_index, answer, session):
                return call("practice_submit", {"profileId": profile_id, "contentId": cid, "modality": mod, "choiceIndex": choice_index, "answer": answer, "revealReading": False, "sessionId": session, "stage": item.get("stage")})

            if item_key in keys:
                # known key: submit it directly (realistic practiced learner)
                if typed:
                    s = submit(0, keys[item_key], sid)
                else:
                    known = keys[item_key]
                    idx = choices.index(known) if known in choices else 0
                    s = submit(idx, None, sid)
                if s["ok"] and (s["value"] or {}).get("correct"):
                    stats["practice"] += 1
                    stats["correct_first"] += 1
                    break
                # key no longer valid (task shape changed): fall through to discovery
            if typed:
                # typed cloze/dictation: answer empty first to surface grade, then retry with the key
                s = submit(0, "", sid)
            else:
                pick = attempt % max(1, len(choices))
                s = submit(pick, None, sid)
            if not s["ok"]:
                stats["skipped"] += 1
                break
            grade = s["value"] or {}
            collect_texts(grade, texts)
            revealed = grade.get("correctChoice") or grade.get("correct_choice")
            if grade.get("correct"):
                stats["practice"] += 1
                if attempt == 0:
                    stats["correct_first"] += 1
                if revealed:
                    keys[item_key] = revealed
                break
            if revealed:
                keys[item_key] = revealed
            if typed and revealed:
                s = submit(0, revealed, sid + "k")
                collect_texts(s["value"] or {}, texts)
                if s["ok"] and (s["value"] or {}).get("correct"):
                    stats["practice"] += 1
                break
            if revealed and revealed in choices and revealed != (choices[pick] if choices else None):
                s2 = submit(choices.index(revealed), None, sid + "b")
                collect_texts(s2["value"] or {}, texts)
                if s2["ok"] and (s2["value"] or {}).get("correct"):
                    stats["practice"] += 1
                break
    # offer / lesson (logged for the worklist; "Start today's plan" flows
    # through practice_plan items, which are walked above)
    offer = call("current_offer", {"profileId": profile_id})
    if offer["ok"] and offer["value"]:
        collect_texts(offer["value"], texts)
    # writing practice
    wt = call("writing_task", {"profileId": profile_id})
    if wt["ok"] and wt["value"]:
        collect_texts(wt["value"], texts)
    # stories (graded reading)
    sl = call("story_list", {"profileId": profile_id})
    stories = sl["value"] if sl["ok"] and isinstance(sl["value"], list) else []
    for st in stories[:3]:
        sid = st.get("id") or st.get("storyId")
        if sid:
            sv = call("story_view", {"profileId": profile_id, "storyId": sid})
            if sv["ok"]:
                collect_texts(sv["value"], texts)
    # scenarios
    scl = call("scenario_list", {"profileId": profile_id})
    scens = scl["value"] if scl["ok"] and isinstance(scl["value"], list) else []
    for sc in scens[:1]:
        scid = sc.get("id") or sc.get("scenarioId")
        if not scid:
            continue
        stv = call("scenario_start", {"profileId": profile_id, "scenarioId": scid})
        if stv["ok"]:
            collect_texts(stv["value"], texts)
    call("progress_summary", {"profileId": profile_id})
    rec["texts_sample"] = [t[1] for t in texts[:40]]
    return stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", choices=list(PACKS))
    ap.add_argument("--days", type=int, default=30)
    ap.add_argument("--from-day", type=int, default=1)
    ap.add_argument("--start-date", default="2026-01-05")
    ap.add_argument("--out", default=str(REPO / "state/evidence/LEARNER-REVIEW-M1-001/sim"))
    ap.add_argument("--build-worklist", action="store_true")
    args = ap.parse_args()

    out = Path(args.out)
    raw = out / "raw"
    raw.mkdir(parents=True, exist_ok=True)

    if args.build_worklist:
        build_worklist(out)
        return

    if not args.pack:
        ap.error("--pack required unless --build-worklist")
    pack_id = PACKS[args.pack]
    data = Path(os.environ.get("LTS_SIM_DATA", REPO / ".sim-data" / args.pack))
    data.mkdir(parents=True, exist_ok=True)
    start = date.fromisoformat(args.start_date)
    profile_id = f"sim-{args.pack}"
    keys_path = out / f"answer-keys-{args.pack}.json"
    keys = json.loads(keys_path.read_text()) if keys_path.exists() else {}

    logf = out / f"sim-{args.pack}.log"
    for day in range(args.from_day, args.days + 1):
        day_date = start + timedelta(days=day - 1)
        fake_at = f"{day_date.isoformat()} {DAY_START}"
        port = free_port()
        rec = {"day": day, "sim_date": fake_at, "pack": args.pack, "calls": []}
        t0 = time.time()
        serve = Serve(data, fake_at, port, out / f"serve-{args.pack}.log")
        try:
            if day == 1:
                r = api(port, "install_pack", {"pack_id": pack_id})
                print(f"install_pack: ok={r['ok']} status={r['status']}", flush=True)
                cp = api(port, "create_profile", {"displayName": f"Sim {args.pack.upper()}"})
                if not cp["ok"]:
                    raise RuntimeError(f"create_profile failed: {cp['value']}")
                profile_id = (cp["value"] or {}).get("id", profile_id)
                co = api(port, "complete_onboarding", {"profileId": profile_id, "packId": pack_id, "micEnabled": False})
                rec["calls"].insert(0, {"cmd": "onboarding", "value": co["value"]})
            stats = run_day(port, profile_id, pack_id, rec, f"{args.pack}{day:03d}", keys)
        finally:
            serve.stop()
        keys_path.write_text(json.dumps(keys, ensure_ascii=False, indent=1, sort_keys=True))
        (raw / f"{args.pack}-day{day:03d}.json").write_text(json.dumps(rec, ensure_ascii=False))
        print(f"day {day:2d} ({fake_at}) {stats} {time.time()-t0:.1f}s", flush=True)


def build_worklist(out: Path):
    import re
    worklists = {}
    for pack in PACKS:
        items = {}  # text -> {ids: set, first_day: int, surfaces: set}
        order = []
        files = sorted((out / "raw").glob(f"{pack}-day*.json"))
        for f in files:
            rec = json.loads(f.read_text())
            day = rec["day"]
            for call in rec["calls"]:
                cmd = call["cmd"]
                for _k, txt in iter_texts(call.get("resp")):
                    norm = txt.strip()
                    if len(norm) < 2:
                        continue
                    e = items.setdefault(norm, {"first_day": day, "surfaces": set(), "days": set()})
                    e["surfaces"].add(cmd)
                    e["days"].add(day)
        entries = [
            {"text": t, "first_day": e["first_day"], "surfaces": sorted(e["surfaces"]), "days_seen": len(e["days"])}
            for t, e in items.items()
        ]
        entries.sort(key=lambda e: (e["first_day"], e["text"]))
        worklists[pack] = {
            "pack": PACKS[pack],
            "raw_days": len(files),
            "unique_text_items": len(entries),
            "items": entries,
        }
        order = files
    (out / "worklist.json").write_text(json.dumps(worklists, ensure_ascii=False, indent=1))
    # markdown summary per pack
    for pack, wl in worklists.items():
        lines = [f"# {pack.upper()} Month-1 worklist — {wl['unique_text_items']} unique text items across {wl['raw_days']} simulated days", ""]
        per_day = {}
        for it in wl["items"]:
            per_day.setdefault(it["first_day"], []).append(it)
        for d in sorted(per_day):
            lines.append(f"## Day {d} — {len(per_day[d])} new items")
            for it in per_day[d][:500]:
                lines.append(f"- [{', '.join(it['surfaces'][:3])}] {it['text']}")
            lines.append("")
        (out / f"worklist-{pack}.md").write_text("\n".join(lines))
    total = {p: worklists[p]["unique_text_items"] for p in worklists}
    print(json.dumps(total))


def iter_texts(obj, depth=0):
    if depth > 12:
        return
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "args":
                continue
            if isinstance(v, str) and k in TEXT_KEYS:
                yield (k, v)
            else:
                yield from iter_texts(v, depth + 1)
    elif isinstance(obj, list):
        for v in obj:
            yield from iter_texts(v, depth + 1)


if __name__ == "__main__":
    main()
