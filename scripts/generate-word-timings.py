#!/usr/bin/env python3
"""WORD-TIMING-001 lane A: word-level timings for a pack's media (batch).

For every manifest row, transcribe the clip with faster-whisper
(word_timestamps=True, CPU int8) constrained to the pack's own `text` via
initial_prompt, then align word timestamps to the text tokens with the
shared matcher in word_timing_lib.py. Emits the sidecar
`<pack>/media/words.jsonl`, one line per clip:

    {"id": ..., "words": [{"w": <exact whitespace-split token, stress
     preserved>, "s": <start s>, "e": <end s>}]}

Timing for a token is the union of its matched ASR word spans; a
single-word clip gets the whole aligned span (karaoke/click-to-hear needs
the token to cover the clip). `media/manifest.jsonl` is never touched —
the sidecar is additive.

Retry ladder (spike 2026-11-07: turbo passes 17/20, failures are whisper
hallucinations and near-miss splits): large-v3-turbo (per-token ratio
0.75) -> large-v3 (relaxed ratio 0.6) -> abstain. Abstains are recorded
with their reason in state/evidence/WORD-TIMING-001/abstains-<lang>.jsonl
and are skipped on resume, same as emitted rows — a re-run never re-listens
to a clip it already decided on.

Checkpoint style mirrors qa-asr.py: each line is appended and fsynced the
moment its clip settles, an existing output is resumed, and a lost run
costs only the clip in flight.

Usage: env -u PYTHONPATH python3 scripts/generate-word-timings.py \
           --pack languages/ru-RU [--limit N]
Exit 0 = coverage >= 90% of the manifest and every emitted line schema-
valid + monotonic. Exit 1 otherwise.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from word_timing_lib import align_tokens, kana_fold, norm  # noqa: E402

PRIMARY_MODEL = "large-v3-turbo"   # CT2, cached; the spike's workhorse
RETRY_MODEL = "large-v3"           # slower/heavier; one retry per failing clip
PRIMARY_RATIO, PRIMARY_ABSORB = 0.75, 0.8
RETRY_RATIO, RETRY_ABSORB = 0.6, 0.75   # relaxed second rung (spike's "relaxed split/merge")
# WORD-TIMING-002 (ja): whisper heard-ja fragments are mora-level, so an
# expected token may glue up to 3 fragments (concatenated ratio >= 0.9).
JA_ABSORB_CHAIN, JA_ABSORB_LONG = 3, 0.9
_JA_EXPECTED_KANJI = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")


def transcribe(model, wav: Path, text: str, language: str) -> list[dict]:
    segs, _info = model.transcribe(
        str(wav), word_timestamps=True, language=language, beam_size=5,
        temperature=0.0, initial_prompt=text,
    )
    return [{"w": s.word.strip(), "start": round(s.start, 3), "end": round(s.end, 3)}
            for seg in segs for s in (seg.words or [])]


def timed_words(row: dict, pieces: list[str], words: list[dict],
                spans: list[tuple[int, int]],
                single_whole_clip: bool = True) -> list[dict]:
    """Sidecar word list: exact text token + union of its matched ASR spans.
    A single-word clip covers the whole aligned span (contract v1). The ja
    path (WORD-TIMING-002) disables that override: duplicate-heard clips
    exist in ja, and the contract says timing takes the FIRST matched
    block, not a span padded with re-heard junk."""
    if single_whole_clip and len(pieces) == 1:
        spans = [(0, len(words) - 1)]
    return [{"w": p, "s": words[a]["start"], "e": words[b]["end"]}
            for p, (a, b) in zip(pieces, spans)]


def check_schema(words_obj: dict) -> str | None:
    """Return the schema violation of one emitted line, or None if valid."""
    if not isinstance(words_obj.get("id"), str) or not isinstance(words_obj.get("words"), list):
        return "id/words missing"
    prev_s = -1.0
    for w in words_obj["words"]:
        if not isinstance(w.get("w"), str) or not isinstance(w.get("s"), (int, float)) \
                or not isinstance(w.get("e"), (int, float)):
            return "bad word fields"
        if w["e"] < w["s"] or w["s"] < prev_s:
            return "non-monotonic times"
        prev_s = w["s"]
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", type=Path, required=True,
                    help="pack dir, e.g. languages/ru-RU")
    ap.add_argument("--lang", default="ru", help="whisper language code")
    ap.add_argument("--limit", type=int, help="stop after N new clips (pilot runs)")
    ap.add_argument("--pass", dest="pass_name", choices=("primary", "retry"),
                    default="primary",
                    help="primary = fast model over all rows; retry = big model "
                         "over the abstain report only. Separate passes so only "
                         "one whisper model is resident at a time (both together "
                         "OOM on a box already hosting the LLM).")
    ap.add_argument("--out", type=Path,
                    help="sidecar jsonl (default <pack>/media/words.jsonl)")
    ap.add_argument("--evidence-dir", type=Path,
                    default=Path("state/evidence/WORD-TIMING-001"),
                    help="dir holding abstains-<lang>.jsonl / resolved-<lang>.jsonl "
                         "(WORD-TIMING-002 ja runs land in state/evidence/WORD-TIMING-002)")
    ap.add_argument("--exclude-ids", type=Path, action="append", default=[],
                    metavar="JSONL",
                    help="extra jsonl files whose ids count as settled (fresh pilots: "
                         "exclude rows an earlier pilot already decided on)")
    args = ap.parse_args()

    pack = args.pack
    out = args.out or (pack / "media" / "words.jsonl")
    abstain_path = args.evidence_dir / f"abstains-{args.lang}.jsonl"
    abstain_path.parent.mkdir(parents=True, exist_ok=True)

    rows = [json.loads(l) for l in
            (pack / "media" / "manifest.jsonl").read_text(encoding="utf-8").splitlines()
            if l.strip()]
    # Resumable: skip ids already settled in the sidecar, the abstain report,
    # or the retry-pass resolved report.
    resolved_path = (abstain_path.parent
                     / f"resolved-{args.lang}.jsonl")
    done: set[str] = set()
    for f in ((out, abstain_path, resolved_path) if args.pass_name == "primary"
              else (out, resolved_path)):
        # The retry pass must NOT count the abstain report as settled —
        # those are exactly its targets.
        if f.exists():
            for l in f.read_text(encoding="utf-8").splitlines():
                if l.strip():
                    done.add(json.loads(l)["id"])
    if args.pass_name == "retry":
        # Retry pass targets only clips the primary pass abstained on — and
        # loads only the heavy model (never both at once). Kanji-expected
        # rows abstain by contract, so the heavy model would never fix them.
        abstain_ids = set()
        if abstain_path.exists():
            for l in abstain_path.read_text(encoding="utf-8").splitlines():
                if l.strip():
                    abstain_ids.add(json.loads(l)["id"])
        rows = [r for r in rows if r["id"] in abstain_ids
                and not _JA_EXPECTED_KANJI.search(r["text"])]
    for f in args.exclude_ids:  # fresh pilots: skip rows an older pilot settled
        if f.exists():
            for l in f.read_text(encoding="utf-8").splitlines():
                if l.strip():
                    done.add(json.loads(l)["id"])
    if done:
        rows = [r for r in rows if r["id"] not in done]
        print(f"carrying {len(done)} settled ids; {len(rows)} left", file=sys.stderr, flush=True)
    if args.limit:
        rows = rows[:args.limit]
    chosen = PRIMARY_MODEL if args.pass_name == "primary" else RETRY_MODEL
    print(f"generation start ({args.pass_name} pass): {len(rows)} rows -> {out} "
          f"(model={chosen})", file=sys.stderr, flush=True)

    from faster_whisper import WhisperModel
    models: dict[str, WhisperModel] = {}

    def get_model(name: str) -> WhisperModel:
        if name not in models:
            print(f"loading {name} ...", file=sys.stderr, flush=True)
            models[name] = WhisperModel(name, device="cpu", compute_type="int8")
        return models[name]

    ladder = ((PRIMARY_MODEL, PRIMARY_RATIO, PRIMARY_ABSORB),) if args.pass_name == "primary" \
        else ((RETRY_MODEL, RETRY_RATIO, RETRY_ABSORB),)
    # WORD-TIMING-002 (ja) contract, applied on top of the ru defaults:
    #  * expected-side tokenization: whitespace IS the pack's word
    #    segmentation for kana (658/4911 ja rows are pre-spaced kana
    #    sentences; pykakasi 2.3.0 wakati does not resegment kana-only text,
    #    it only adds morpheme boundaries across kanji, which this pack's
    #    kana text never contains);
    #  * heard side: every ASR token is folded kanji/katakana->hiragana
    #    with pykakasi before alignment (whisper kanji-converts ja output);
    #  * mora-fragment chains up to 3 absorb at concatenated ratio >= 0.9;
    #  * kanji-bearing expected rows abstain outright (7/4911 — TTS was fed
    #    kana but a handful of manifest texts kept kanji).
    ja = args.lang == "ja"

    sink = out.open("a", encoding="utf-8")
    asink = abstain_path.open("a", encoding="utf-8")
    rsink = resolved_path.open("a", encoding="utf-8")
    n_ok = n_abstain = 0
    t0 = time.time()
    try:
        for i, row in enumerate(rows, 1):
            wav = pack / row["file"]
            pieces = [p for p in row["text"].split() if norm(p)]
            want = [norm(p) for p in pieces]
            result = None   # (words, spans) on success
            reason = ""
            if ja and _JA_EXPECTED_KANJI.search(row["text"]):
                # Contract: kanji-bearing expected rows may abstain — the
                # pack's kana-vs-kanji mismatch is structural, no model
                # fixes it. Log and move on (retry pass filters these out).
                reason = "expected-kanji"
                if args.pass_name == "primary":
                    asink.write(json.dumps(
                        {"id": row["id"], "reason": reason, "text": row["text"]},
                        ensure_ascii=False) + "\n")
                    asink.flush(); os.fsync(asink.fileno())
                    n_abstain += 1
                    print(f"ABSTAIN {row['id']} {reason}", file=sys.stderr, flush=True)
                continue
            try:
                for model_name, r, ab in ladder:
                    words = transcribe(get_model(model_name), wav, row["text"], args.lang)
                    if ja:  # heard side: kanji/katakana -> hiragana
                        words = [dict(w, w=kana_fold(w["w"])) for w in words]
                    if not words:
                        reason = "empty-transcript"
                        continue
                    spans = align_tokens(words, want, duration=row.get("seconds"),
                                         ratio=r, absorb=ab,
                                         absorb_chain=JA_ABSORB_CHAIN if ja else 2,
                                         absorb_long=JA_ABSORB_LONG)
                    if spans is not None:
                        result = (words, spans)
                        reason = f"aligned:{model_name}"
                        break
                    reason = f"align-failed@{model_name}"
            except Exception as e:  # noqa: BLE001 — infra signal per clip, keep the run alive
                reason = f"transcribe-error: {type(e).__name__}: {e}"
            if result is not None:
                line = {"id": row["id"],
                        "words": timed_words(row, pieces, *result, single_whole_clip=not ja)}
                bad = check_schema(line)
                if bad:  # a bug in this script must never poison the sidecar
                    line = {"id": row["id"], "words": None}
                    asink.write(json.dumps(
                        {"id": row["id"], "reason": f"schema-violation: {bad}",
                         "text": row["text"]}, ensure_ascii=False) + "\n")
                    asink.flush(); os.fsync(asink.fileno())
                    n_abstain += 1
                    print(f"ABSTAIN {row['id']} schema: {bad}", file=sys.stderr, flush=True)
                    continue
                sink.write(json.dumps(line, ensure_ascii=False) + "\n")
                sink.flush(); os.fsync(sink.fileno())
                if args.pass_name == "retry":
                    rsink.write(json.dumps({"id": row["id"], "via": reason}) + "\n")
                    rsink.flush(); os.fsync(rsink.fileno())
                n_ok += 1
            elif args.pass_name == "primary":
                # A retry-pass failure stays recorded by its original abstain
                # row; re-writing would only duplicate the report.
                asink.write(json.dumps(
                    {"id": row["id"], "reason": reason, "text": row["text"]},
                    ensure_ascii=False) + "\n")
                asink.flush(); os.fsync(asink.fileno())
                n_abstain += 1
                print(f"ABSTAIN {row['id']} {reason}", file=sys.stderr, flush=True)
            if i % 100 == 0 or i == len(rows):
                el = time.time() - t0
                print(f"... {i}/{len(rows)} settled ({n_ok} ok, {n_abstain} abstain, "
                      f"{el/60:.1f} min)", file=sys.stderr, flush=True)
    finally:
        sink.close()
        asink.close()
        rsink.close()

    # ---- self-check: coverage + schema + monotonicity over the whole sidecar
    total_ids, bad, mono_bad = set(), 0, 0
    if out.exists():
        for l in out.read_text(encoding="utf-8").splitlines():
            if not l.strip():
                continue
            obj = json.loads(l)
            total_ids.add(obj["id"])
            v = check_schema(obj)
            if v:
                bad += 1
                print(f"SCHEMA-BAD {obj['id']}: {v}", file=sys.stderr)
    manifest_ids = {r["id"] for r in
                    (json.loads(l) for l in
                     (pack / "media" / "manifest.jsonl").read_text(encoding="utf-8").splitlines()
                     if l.strip())}
    coverage = len(total_ids) / len(manifest_ids) if manifest_ids else 0.0
    print(f"self-check: rows={len(manifest_ids)} covered={len(total_ids)} "
          f"coverage={coverage:.1%} schema_bad={bad} monotonicity_bad={mono_bad} "
          f"this_run_ok={n_ok} this_run_abstain={n_abstain}", file=sys.stderr, flush=True)
    if coverage < 0.9 or bad:
        print(f"FAIL: coverage {coverage:.1%} < 90% or schema violations", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
