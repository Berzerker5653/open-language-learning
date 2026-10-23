#!/usr/bin/env python3
"""Best-of-K repair bake (endgame tool, replaces endless re-bake rounds).

The bake-repair loop re-rolls every failing clip once per round; the take
distribution is i.i.d. (the TTS worker exposes no seed), so rounds 9+ buy
~3 clips/hour. This tool spends the same draws where they matter: for each
failing asset it bakes up to K takes, grading each take immediately with
the full gate (structure + whisper round-trip v3), and keeps the FIRST
take that passes the whole gate. A clip that exhausts K takes is certified
stubborn *at K attempts* — an honest per-clip stopping statistic the round
loop never produced.

The winning take replaces media/<id>.wav and its manifest.jsonl row is
rewritten in place (sha/bytes/seconds + a notes record "best-of-K: take t
of K passed"); losers are discarded; the old wav is kept until a winner
exists.

Usage:
  scripts/bake-bestof.py --pack languages/ru-RU --ids residual.txt --k 8 \
      --language russian --speaker ono_anna \
      --asr-model ~/.cache/lts-bench/ggml-large-v3-turbo.bin \
      --whisper ~/.cache/lts-bench/whisper.cpp/build/bin/whisper-cli \
      --jobs 4 --out bestof-ru.jsonl

Run with the repo .venv (gate deps); the TTS worker is spawned with the
qwen venv interpreter (--worker-python).
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
import threading
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def _load(name: str, path: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gate = _load("qa_asr", str(REPO / "scripts/qa-asr.py"))
segmod = _load("qa_segments", str(REPO / "scripts/qa-segments.py"))

_worker_lock = threading.Lock()


class TtsSession:
    """One persistent qwen3-tts-worker process."""

    def __init__(self, worker_python: Path, model: Path, language: str, speaker: str):
        self.p = subprocess.Popen(
            [str(worker_python), str(REPO / "scripts/qwen3-tts-worker.py"), "--model", str(model)],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1,
        )
        self.language, self.speaker = language, speaker
        while True:
            line = self.p.stdout.readline()
            if not line:
                raise RuntimeError("tts worker died at startup")
            try:
                if json.loads(line).get("ready"):
                    break
            except json.JSONDecodeError:
                continue

    def bake(self, asset_id: str, text: str, out: Path) -> bool:
        req = {"id": asset_id, "text": text, "out": str(out),
               "language": self.language, "speaker": self.speaker}
        self.p.stdin.write(json.dumps(req, ensure_ascii=False) + "\n")
        self.p.stdin.flush()
        while True:
            line = self.p.stdout.readline()
            if not line:
                raise RuntimeError("tts worker died mid-job")
            try:
                ans = json.loads(line)
            except json.JSONDecodeError:
                continue
            if ans.get("id") == asset_id:
                return bool(ans.get("ok"))


def grade(wav: Path, cid: str, text: str, lang_code: str, asr_model: str, whisper: str):
    """Full gate: structure first (cheap, stdlib), then whisper round-trip v3."""
    srow = segmod.analyze(wav, cid, text, lang_code, 0.8, -45.0)
    if srow.get("flags"):
        return False, {"stage": "segments", "flags": srow.get("flags")}
    p = subprocess.run([whisper, "-m", asr_model, "-l", lang_code, "-np", "-nt", str(wav)],
                       capture_output=True, text=True, timeout=300)
    heard = p.stdout.strip()
    ok, ratio, reasons, rescued = gate.verdict(text, heard, lang_code)
    return ok, {"ratio": round(ratio, 2), "reasons": reasons, "rescued": rescued, "heard": heard[:120]}


def wav_stats(path: Path):
    import wave
    with wave.open(str(path)) as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
    return sr, ch, n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", type=Path, required=True)
    ap.add_argument("--ids", type=Path, required=True, help="asset ids, one per line")
    ap.add_argument("--k", type=int, default=8)
    ap.add_argument("--language", default="russian", help="qwen TTS language name")
    ap.add_argument("--lang", default="ru", help="whisper language code")
    ap.add_argument("--speaker", default="ono_anna")
    ap.add_argument("--asr-model", required=True)
    ap.add_argument("--whisper", required=True)
    ap.add_argument("--worker-python", type=Path,
                    default=Path.home() / ".venvs/qwen-tts/bin/python")
    ap.add_argument("--tts-model", type=Path,
                    default=Path.home() / ".cache/lts-bench/tts/qwen3-tts-customvoice-1.7b")
    ap.add_argument("--jobs", type=int, default=4)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    ids = [l.strip() for l in args.ids.read_text().splitlines() if l.strip()]
    manifest_path = args.pack / "media/manifest.jsonl"
    rows = {}
    order = []
    for l in manifest_path.read_text().splitlines():
        if l.strip():
            r = json.loads(l)
            rows[r["id"]] = r
            order.append(r["id"])
    texts = {i: rows[i].get("text", "") for i in ids if i in rows}
    missing = [i for i in ids if i not in rows]
    if missing:
        print(f"ABORT: ids not in manifest: {missing[:10]}", file=sys.stderr)
        return 2

    tmpdir = Path("/tmp/bestof")
    tmpdir.mkdir(exist_ok=True)
    results_lock = threading.Lock()
    results = {}

    def work(asset_id: str):
        sess = TtsSession(args.worker_python, args.tts_model, args.language, args.speaker)
        text = texts[asset_id]
        record = {"id": asset_id, "attempts": 0, "result": "exhausted", "takes": []}
        try:
            for take in range(1, args.k + 1):
                wav = tmpdir / f"{asset_id}__t{take}.wav"
                if not sess.bake(asset_id, text, wav):
                    record["takes"].append({"take": take, "bake": "fail"})
                    continue
                ok, info = grade(wav, asset_id, text, args.lang, args.asr_model, args.whisper)
                record["attempts"] = take
                record["takes"].append({"take": take, **info})
                if ok:
                    dest = args.pack / rows[asset_id]["file"]
                    sr, ch, nframes = wav_stats(wav)
                    shutil.move(str(wav), str(dest))
                    row = rows[asset_id]
                    row["sha256"] = hashlib.sha256(dest.read_bytes()).hexdigest()
                    row["bytes"] = dest.stat().st_size
                    row["sample_rate"], row["channels"] = sr, ch
                    row["seconds"] = round(nframes / sr, 3)
                    row["generated"] = datetime.date.today().isoformat()
                    base = (row.get("notes") or "").split("; best-of-K:")[0]
                    row["notes"] = f"{base}; best-of-K: take {take} of up to {args.k} passed full gate (speaker {args.speaker})".lstrip("; ")
                    record["result"] = f"pass@{take}"
                    break
        finally:
            try:
                sess.p.stdin.close()
                sess.p.terminate()
            except Exception:
                pass
        with results_lock:
            results[asset_id] = record
            done = len(results)
        if done % 10 == 0:
            print(f"bestof: {done}/{len(ids)} assets settled", file=sys.stderr)

    with cf.ThreadPoolExecutor(max_workers=args.jobs) as ex:
        list(ex.map(work, ids))

    # manifest rewritten whole (ordered) only if any winner
    winners = [i for i, r in results.items() if r["result"].startswith("pass@")]
    if winners:
        with open(manifest_path, "w", encoding="utf-8") as f:
            for asset_id in order:
                f.write(json.dumps(rows[asset_id], ensure_ascii=False) + "\n")

    with open(args.out, "w", encoding="utf-8") as f:
        for asset_id in ids:
            f.write(json.dumps(results[asset_id], ensure_ascii=False) + "\n")
    n_pass = len(winners)
    print(f"bestof: {n_pass}/{len(ids)} solved, {len(ids) - n_pass} exhausted at K={args.k}")
    print(f"manifest rows updated: {n_pass}; summary -> {args.out}")
    return 0 if n_pass == len(ids) else 1


if __name__ == "__main__":
    sys.exit(main())
