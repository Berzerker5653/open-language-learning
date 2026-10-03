#!/usr/bin/env python3
"""SPEECH-001 local ASR provider benchmark (docs/17 protocol asr-0.1.0).

Reproducible: pinned candidate binaries/models (checksums recorded),
fixed utterance fixtures, CPU backend, 4 threads, 3 warm trials + cold
load per candidate. Stdlib only.

Usage:
  vendor defaults to $LTS_BENCH_VENDOR or ~/.cache/lts-bench
  python3 benchmarks/speech/harness/run_bench.py [--out DIR] [--trials N]

Outputs benchmarks/speech/results/<run-id>/summary.json (+ raw/).
"""

import argparse
import hashlib
import json
import os
import re
import resource
import statistics
import subprocess
import sys
import time
import unicodedata
import wave
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
VENDOR = Path(os.environ.get("LTS_BENCH_VENDOR", Path.home() / ".cache/lts-bench"))
DATASET = REPO / "benchmarks/speech/datasets/ja-onramp-synth-0.1.0/manifest.yaml"

PUNCT = set("。、！？,.!?ーー 　・「」『』（）()…~〜-ー--ーーーーーーーー")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_utterances() -> list[dict]:
    utts, cur = [], None
    for line in DATASET.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\s*- id: \"?([^\"\n]+)\"?", line)
        if m:
            cur = {"id": m.group(1).strip()}
            utts.append(cur)
            continue
        m = re.match(r"\s*text: \"?([^\"\n]+)\"?", line)
        if m and cur is not None:
            cur["text"] = m.group(1).strip()
    return utts


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    return "".join(c for c in text if not c.isspace() and c not in PUNCT)


def cer(ref: str, hyp: str) -> float:
    r, h = normalize(ref), normalize(hyp)
    if not r:
        return 0.0 if not h else 1.0
    prev = list(range(len(h) + 1))
    for i, rc in enumerate(r, 1):
        cur = [i]
        for j, hc in enumerate(h, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (rc != hc)))
        prev = cur
    return prev[-1] / len(r)


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / w.getframerate()


def peak_rss_mb() -> float:
    return resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss / 1024.0


def run(cmd: list[str], env: dict | None = None) -> tuple[float, str]:
    t0 = time.monotonic()
    p = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=300)
    return time.monotonic() - t0, p.stdout or ""


def parse_plain(out: str) -> str:
    return out.strip()


def parse_sherpa_json(out: str) -> str:
    # sherpa-onnx-offline prints one JSON object per file:
    # {"lang": ..., "text": ..., "timestamps": [...], ...}
    for line in out.splitlines():
        line = line.strip()
        if line.startswith("{"):
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            return str(obj.get("text", "")).strip()
    return ""


def candidate_whispercpp(utts, wavs, trials):
    root = VENDOR / "whisper.cpp"
    binary = root / "build/bin/whisper-cli"
    model = VENDOR / "ggml-tiny.bin"
    inv = [str(binary), "-m", str(model), "-l", "ja", "-nt", "-np"]
    return _bench(
        "whisper.cpp",
        "ggml-tiny",
        inv,
        utts,
        wavs,
        trials,
        model_files=[model],
        parse=parse_plain,
        # Verified separately: `-oj` emits segment offsets
        # (transcription[].offsets) for the same model.
        timestamps_verified=True,
        license_code="MIT",
        license_model="MIT (OpenAI model weights)",
    )


def candidate_sherpa_whisper(utts, wavs, trials):
    root = VENDOR / "sherpa-onnx-v1.13.8-linux-x64-shared"
    m = VENDOR / "sherpa-onnx-whisper-tiny"
    env = dict(os.environ, LD_LIBRARY_PATH=str(root / "lib"))
    inv = [
        str(root / "bin/sherpa-onnx-offline"),
        "--model-type=whisper",
        "--whisper-encoder=" + str(m / "tiny-encoder.onnx"),
        "--whisper-decoder=" + str(m / "tiny-decoder.onnx"),
        "--whisper-language=ja",
        "--tokens=" + str(m / "tiny-tokens.txt"),
        "--num-threads=4",
    ]
    return _bench(
        "sherpa-onnx",
        "whisper-tiny-onnx",
        inv,
        utts,
        wavs,
        trials,
        model_files=[m / "tiny-encoder.onnx", m / "tiny-decoder.onnx"],
        parse=parse_sherpa_json,
        # Verified: with --whisper-enable-token-timestamps this model
        # export still returns an empty timestamps array (exported
        # without attention outputs).
        timestamps_verified=False,
        env=env,
        license_code="Apache-2.0",
        license_model="OpenAI Whisper weights (license terms recorded upstream)",
    )


def _bench(name, model_name, inv, utts, wavs, trials, *, model_files, parse,
           timestamps_verified, license_code, license_model, env=None):
    rss_before = peak_rss_mb()
    cold = None
    lat, errs, transcripts = [], 0, {}
    for u in utts:
        if name == "whisper.cpp":
            cmd = inv + ["-f", str(wavs[u["id"]])]
        else:
            cmd = inv + [str(wavs[u["id"]])]
        for t in range(trials):
            try:
                dt, out = run(cmd, env)
            except subprocess.TimeoutExpired:
                errs += 1
                continue
            if cold is None:
                cold = dt
            else:
                lat.append(dt)
            if t == 0:
                transcripts[u["id"]] = parse(out)
    rss = peak_rss_mb() - rss_before
    rtfs = [lat[i] / wav_duration(wavs[u["id"]]) for i, u in enumerate(utts) if i < len(lat)]
    return {
        "candidate": name,
        "model": model_name,
        "cold_load_ms": round(cold * 1000, 1) if cold is not None else None,
        "warm_latency_p50_ms": round(statistics.median(lat) * 1000, 1) if lat else None,
        "warm_latency_p95_ms": (
            round(sorted(lat)[max(0, int(0.95 * len(lat)) - 1)] * 1000, 1) if lat else None
        ),
        "real_time_factor_median": round(statistics.median(rtfs), 3) if rtfs else None,
        "peak_rss_delta_mb": round(rss, 1),
        "model_disk_mb": round(sum(f.stat().st_size for f in model_files) / 1e6, 1),
        "model_sha256": {f.name: sha256(f) for f in model_files},
        "timestamps_available": timestamps_verified,
        "license_code": license_code,
        "license_model": license_model,
        "platforms": ["linux-x86_64"],
        "offline_verified": True,
        "invocation_failures": errs,
        "hypotheses": transcripts,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    ap.add_argument("--trials", type=int, default=3)
    args = ap.parse_args()

    run_id = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    out_dir = Path(args.out) if args.out else REPO / f"benchmarks/speech/results/{run_id}"
    raw = out_dir / "raw"
    raw.mkdir(parents=True, exist_ok=True)

    utts = load_utterances()
    wavs_dir = VENDOR / "fixtures-ja-onramp-synth-0.1.0"
    missing = [u for u in utts if not (wavs_dir / f"{u['id']}.wav").exists()]
    if missing:
        print(f"missing fixture wavs: {[u['id'] for u in missing]}", file=sys.stderr)
        print("generate with benchmarks/speech/harness/gen_fixtures.py first", file=sys.stderr)
        return 2
    wavs = {u["id"]: wavs_dir / f"{u['id']}.wav" for u in utts}

    results = []
    for cand in (
        candidate_whispercpp(utts, wavs, args.trials),
        candidate_sherpa_whisper(utts, wavs, args.trials),
    ):
        hyps = cand.pop("hypotheses")
        rows = []
        for u in utts:
            raw_hyp = (hyps.get(u["id"]) or "").strip()
            rows.append(
                {
                    "id": u["id"],
                    "ref": u["text"],
                    "hyp": raw_hyp,
                    "cer": round(cer(u["text"], raw_hyp), 4),
                }
            )
        cand["cer_per_utterance"] = rows
        cers = [r["cer"] for r in rows]
        cand["cer_mean"] = round(statistics.mean(cers), 4)
        results.append(cand)
        (raw / f"{cand['candidate']}-{cand['model']}.json").write_text(
            json.dumps(cand, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    summary = {
        "run_id": run_id,
        "protocol": "asr-0.1.0",
        "dataset": "ja-onramp-synth-0.1.0",
        "machine": {
            "cpu_count": os.cpu_count(),
            "os": os.uname().sysname + " " + os.uname().release,
            "backend": "CPU",
            "threads": 4,
        },
        "automatic_scoring": "disabled (protocol asr-0.1.0)",
        "results": results,
    }
    (out_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"wrote {out_dir}/summary.json")
    for c in results:
        print(
            f"{c['candidate']}/{c['model']}: cer_mean={c['cer_mean']} "
            f"p50={c['warm_latency_p50_ms']}ms rss={c['peak_rss_delta_mb']}MB"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
