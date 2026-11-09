#!/usr/bin/env python3
"""WORD-TIMING-002 diagnostic: why do unsettled ja clips still abstain at
retry ratio 0.6, and would length-aware thresholds recover them safely?

Stratified sample of unsettled clips -> large-v3 transcribe (kana-folded) ->
align_tokens at 0.75, plus manual per-token best-ratio stats bucketed by
expected token length. Outputs ratio distributions for the FIRST expected
token vs the whole-token set, and how many clips would flip at
len-aware thresholds (>=5 chars:0.65, >=4:0.7, else 0.75).
"""
import importlib.util
import json
import random
import statistics
import sys
from pathlib import Path

sys.path.insert(0, "/home/hunter/game-dev/LTS/scripts")
from word_timing_lib import align_tokens, kana_fold, norm  # noqa: E402

root = Path("/home/hunter/game-dev/LTS")
spec = importlib.util.spec_from_file_location(
    "gen", root / "scripts/generate-word-timings.py")
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

media = [json.loads(l) for l in open(root / "languages/ja-JP/media/manifest.jsonl")]
banked = {json.loads(l)["id"] for l in open(root / "languages/ja-JP/media/words.jsonl")}
unset = [r for r in media if r["id"] not in banked and not any(
    ord(c) > 0x33FF and (0x3400 <= ord(c) <= 0x9fff) for c in r["text"])]
random.seed(11)
by_len = {}
for r in unset:
    toks = [norm(p) for p in r["text"].split() if norm(p)]
    L = max(len(t) for t in toks)
    bucket = "short<=3" if L <= 3 else ("mid4-5" if L <= 5 else "long>=6")
    by_len.setdefault(bucket, []).append(r)
sample = []
for b in ("short<=3", "mid4-5", "long>=6"):
    sample += random.sample(by_len.get(b, []), k=min(25, len(by_len.get(b, []))))

from faster_whisper import WhisperModel
model = WhisperModel("large-v3", device="cpu", compute_type="int8")

import difflib


def best_ratio(want_tok, got):
    return max((difflib.SequenceMatcher(None, want_tok, g).ratio() for g in got), default=0)


rows_out = []
for r in sample:
    wav = root / "languages/ja-JP" / r["file"]
    pieces = [p for p in r["text"].split() if norm(p)]
    want = [norm(p) for p in pieces]
    words = gen.transcribe(model, wav, r["text"], "ja")
    words = [dict(w, w=kana_fold(w["w"])) for w in words]
    got = [norm(w["w"]) for w in words]
    strict = align_tokens(words, want, duration=r.get("seconds"), ratio=0.75,
                          absorb=0.8, absorb_chain=4, absorb_long=0.9)
    lens = [len(t) for t in want]
    brs = [best_ratio(t, got) for t in want]
    # len-aware simulate: every token must clear its own threshold somewhere
    def thr(t):
        return 0.65 if len(t) >= 6 else (0.7 if len(t) >= 4 else 0.75)
    la_all = all(br >= thr(t) for t, br in zip(want, brs))
    rows_out.append({
        "id": r["id"], "text": r["text"], "heard": " ".join(w["w"] for w in words),
        "strict_ok": strict is not None, "lenaware_support": la_all,
        "maxlen": max(lens), "ratios": [round(x, 2) for x in brs],
    })
    print(json.dumps(rows_out[-1], ensure_ascii=False), flush=True)

ok = sum(1 for x in rows_out if x["strict_ok"])
la = sum(1 for x in rows_out if x["lenaware_support"])
print(f"\nSAMPLE={len(rows_out)} strict075_ok={ok} lenaware_support={la}")
