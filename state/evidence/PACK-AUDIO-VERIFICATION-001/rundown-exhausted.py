#!/usr/bin/env python3
"""Round-1 best-of-K exhausted-id disposition packet (PACK-AUDIO-VERIFICATION-001).

Reads the campaign checkpoints (bestof-<lang>.jsonl, one record per settled
asset) and the pack manifests, and writes:

  exhausted-<date>.jsonl   one machine-readable row per exhausted id
  EXHAUSTED-<date>.md      owner disposition packet: cause table + per-pack
                           listing in listening batches of --batch-size

Cause tags are derived from the recorded evidence only, never invented:
a take is either an ASR round-trip rejection (has ratio/heard/reasons) or a
structure-gate rejection (has flags). Tags:

  structure-only   every take died at the structure gate
  structure:gap    internal silence > max-gap on that take
  structure:burst  leading click/burst on that take
  vocalization     gate reason vocalization-run / hallucination-marker
                   (the clip really contains laughter / sighs / drawn vowels)
  near-miss        best ASR ratio >= 0.70 - the clip may well be correct and
                   the ratio metric is weak exactly on short stressed words;
                   this is the "listen before you delete" bucket
  wrong-syllables  best ratio 0.40-0.69 - recognisably the right word area
  garbled          best ratio < 0.40 - not the declared word

Nothing here decides the outcome. Removal ("remove the content item"), text
re-authoring, or acceptance after listening are owner dispositions; the card's
rule is that a qualified human review cannot be self-certified by an AI.

Usage:
  python3 rundown-exhausted.py --date 2026-10-27 [--batch-size 25]
"""
from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
PACKS = {"ja": "ja-JP", "ru": "ru-RU"}


def text_of(pack: str) -> dict[str, str]:
    rows = {}
    for line in (REPO / "languages" / pack / "media/manifest.jsonl").read_text(encoding="utf-8").splitlines():
        if line.strip():
            r = json.loads(line)
            rows[r["id"]] = r.get("text", "")
    return rows


def describe_take(t: dict) -> str:
    if "flags" in t:
        parts = []
        for name, val in t["flags"].items():
            if isinstance(val, dict):
                detail = ",".join(f"{k}={v}" for k, v in list(val.items())[:3])
                parts.append(f"{name}({detail})")
            else:
                parts.append(str(name))
        return f"t{t['take']} structure: {' '.join(parts)}"
    reasons = ",".join(t.get("reasons") or [])
    suffix = f" [{reasons}]" if reasons else ""
    return f"t{t['take']} asr {t.get('ratio', '?'):.2f} \"{(t.get('heard') or '').strip()}\"{suffix}"


def classify(record: dict) -> tuple[str, list[str]]:
    asr = [t for t in record["takes"] if "flags" not in t]
    struct = [t for t in record["takes"] if "flags" in t]
    counts: collections.Counter[str] = collections.Counter()
    for t in struct:
        for name in t["flags"]:
            counts[f"structure:{name}"] += 1
    for t in asr:
        if set(t.get("reasons") or []) & {"vocalization-run", "hallucination-marker"}:
            counts["vocalization"] += 1
    if asr:
        best = max(t.get("ratio", 0.0) for t in asr)
        if best >= 0.70:
            counts["near-miss"] += 1
        elif best >= 0.40:
            counts["wrong-syllables"] += 1
        else:
            counts["garbled"] += 1
    else:
        counts["structure-only"] += 1
    primary = max(counts, key=lambda k: (counts[k], k))
    return primary, sorted(counts)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True)
    ap.add_argument("--batch-size", type=int, default=25)
    ap.add_argument("--sheet", default=None,
                    help="also write an owner disposition CSV with these rows")
    args = ap.parse_args()

    rows_out = []
    per_pack: dict[str, list[dict]] = {}

    for lang, pack in PACKS.items():
        texts = text_of(pack)
        # Round-2 checkpoints change what a disposition decision means: an id
        # that passed a fresh K-pass is certified and leaves the packet; one
        # that failed again is genuinely stubborn (2K failed draws under the
        # same gates); one with no round-2 record has NOT been re-run yet and
        # must not be disposed from stale round-1 evidence.
        r2 = {}
        for f in sorted(HERE.glob(f"bestof-{lang}-r2-*.jsonl")):
            for line in f.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    r = json.loads(line)
                    r2[r["id"]] = r
        recs = []
        for line in (HERE / f"bestof-{lang}.jsonl").read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            r = json.loads(line)
            if r["result"] != "exhausted":
                continue
            second = r2.get(r["id"])
            if second is not None and second["result"] != "exhausted":
                continue
            primary, tags = classify(r)
            final = r["takes"][-1]
            rec = {
                "pack": pack,
                "id": r["id"],
                "text": texts.get(r["id"], ""),
                "attempts": r["attempts"],
                "round2": "pending" if second is None else "exhausted",
                "final_stage": "structure" if "flags" in final else "asr",
                "best_asr_ratio": max((t.get("ratio", 0.0) for t in r["takes"] if "flags" not in t), default=None),
                "structure_flags": sorted({f for t in r["takes"] if "flags" in t for f in t["flags"]}),
                "cause": primary,
                "causes": tags,
                "takes": ["r1 " + describe_take(t) for t in r["takes"]],
            }
            if second is not None:
                rec["attempts_total"] = r["attempts"] + second["attempts"]
                rec["causes"] = sorted(set(rec["causes"]) | set(classify(second)[1]))
                rec["takes"] += ["r2 " + describe_take(t) for t in second["takes"]]
                rec["best_asr_ratio"] = max(
                    filter(lambda v: v is not None,
                           [rec["best_asr_ratio"],
                            max((t.get("ratio", 0.0) for t in second["takes"]
                                 if "flags" not in t), default=None)]),
                    default=None)
            recs.append(rec)
        recs.sort(key=lambda r: r["id"])
        per_pack[pack] = recs
        rows_out.extend(recs)

    (HERE / f"exhausted-{args.date}.jsonl").write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows_out), encoding="utf-8")

    md: list[str] = [
        f"# Best-of-K rounds 1+2: exhausted voice lines - owner disposition ({args.date})",
        "",
        "Every clip below was re-baked up to K takes on the campaign box and **every take",
        "failed the full gate** (acoustic structure + whisper large-v3-turbo round-trip):",
        "ru-RU 118 of 417 exhausted at K=8, ja-JP 264 of 1,066 exhausted at K=6. The",
        "per-take columns are the recorded gate evidence, not commentary.",
        "",
        "Round 2 (`local-chain.sh`, GamingPC) re-bakes these same ids with fresh",
        "draws. Measured on the first round-2 batch (ja-b00, 25 ids, K=6): **8",
        "cleared, 17 did not** - the earlier '~75% will clear' expectation was wrong",
        "(takes are i.i.d. but ids are not exchangeable: failing K draws already is",
        "evidence about the id). Budget about a third certifying. Rows marked",
        "`round2=pending` have not been re-run yet: do not dispose those from this",
        "file, regenerate the packet from the round-2 checkpoints first.",
        "",
        "Options per clip (owner's call, cannot be self-certified by an agent):",
        "",
        "* keep - listen and accept it (especially the `near-miss` bucket: the ratio",
        "  metric is weakest exactly on short stressed words, where a correct clip and a",
        "  subtly wrong one score the same);",
        "* remove - delete the content item from the pack (lexicon entry / contrast pair /",
        "  scenario line), which also removes its audio requirement;",
        "* re-author - change the declared text (e.g. split a word the engine cannot",
        "  land, drop a mora the voice collapses) and re-bake it in the next round.",
        "",
        "Listen in batches with `bash EXHAUSTED-PLAY.sh <ja|ru> <batch-number>`",
        f"(batch size {args.batch_size}); `--list` prints the rosters.",
        "",
    ]

    for pack in ("ru-RU", "ja-JP"):
        recs = per_pack[pack]
        md += [f"## {pack} - {len(recs)} exhausted ids", ""]
        tally = collections.Counter(r["cause"] for r in recs)
        md += ["| cause (primary tag) | ids | what the evidence shows |", "|---|---|---|"]
        examples = {}
        for r in recs:
            examples.setdefault(r["cause"], r)
        lead = {
            "near-miss": "best round-trip ratio >= 0.70 - the ratio metric is weakest on short stressed words",
            "garbled": "best ratio < 0.40 - not the declared word",
            "wrong-syllables": "best ratio 0.40-0.69 - right word area, wrong syllables",
            "vocalization": "the clip really contains laughter / a sigh / a drawn-out vowel",
            "structure-only": "every take died at the structure gate (silence gap / leading burst)",
        }
        blurb = {}
        for cause, r in examples.items():
            extra = (f"best ratio {r['best_asr_ratio']}" if cause == "near-miss"
                     else r["takes"][0])
            blurb[cause] = f"{lead.get(cause, '')}; e.g. `{r['id']}` {extra}"
        for cause, n in tally.most_common():
            md.append(f"| {cause} | {n} | {blurb.get(cause, '')} |")
        md.append("")
        batches = [recs[i:i + args.batch_size] for i in range(0, len(recs), args.batch_size)]
        md.append(f"Listening batches: {', '.join(str(len(b)) for b in batches)}"
                  f" ({len(batches)} batches of up to {args.batch_size}).")
        md.append("")
        for bi, batch in enumerate(batches, 1):
            md += [f"### {pack} batch {bi}", "",
                   "| id | declared text | K | evidence (per take, as recorded) |", "|---|---|---|---|"]
            for r in batch:
                ev = "; ".join(r["takes"])
                if len(ev) > 300:
                    ev = ev[:297] + "..."
                md.append(f"| {r['id']} | {r['text']} | {r.get('attempts_total', r['attempts'])}"
                          f" takes, round2={r['round2']} | {ev} |")
            md.append("")

    (HERE / f"EXHAUSTED-{args.date}.md").write_text("\n".join(md), encoding="utf-8")

    # The answer sheet: one row per exhausted clip, batch numbers identical to
    # EXHAUSTED-PLAY.sh (index within the pack, in file order, per --batch-size),
    # so "listen to ru 3" and "fill in ru batch 3" are the same 25 clips.
    # utf-8-sig so LibreOffice reads the Cyrillic/kana without a import dialog.
    if args.sheet:
        import csv
        with open(HERE / args.sheet, "w", newline="", encoding="utf-8-sig") as fh:
            w = csv.writer(fh)
            w.writerow(["batch", "pack", "id", "declared_text", "cause", "round2",
                        "takes_failed", "best_asr_ratio",
                        "owner_disposition", "note"])
            for pack in ("ru-RU", "ja-JP"):
                for i, r in enumerate(per_pack[pack]):
                    w.writerow([i // args.batch_size + 1, pack, r["id"], r["text"],
                                r["cause"], r["round2"],
                                r.get("attempts_total", r["attempts"]),
                                "" if r["best_asr_ratio"] is None
                                else f"{r['best_asr_ratio']:.2f}", "", ""])

    for pack in ("ru-RU", "ja-JP"):
        tally = collections.Counter(r["cause"] for r in per_pack[pack])
        pending = sum(1 for r in per_pack[pack] if r["round2"] == "pending")
        print(f"{pack}: {len(per_pack[pack])} exhausted | round2 pending={pending} | "
              + " ".join(f"{c}={n}" for c, n in tally.most_common()))
    print(f"rows={len(rows_out)} -> exhausted-{args.date}.jsonl, EXHAUSTED-{args.date}.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
