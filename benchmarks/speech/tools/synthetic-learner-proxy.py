#!/usr/bin/env python3
"""Synthetic learner-proxy study for SPEECH-007 (FEASIBILITY EVIDENCE ONLY).

Answers one question with numbers: can AI-generated audio substitute for
consented learner recordings in the SPEECH-007 calibration gate?

It synthesizes the taught long-vowel minimal pairs with the pack's own TTS
payload, then manufactures "learner" variants by time-stretching the long-vowel
segment, and runs the SAME align -> measure -> interpret path the desktop app
uses (crates/speech-runtime/examples/vowel_length_probe.rs). The ground truth is
invented by this script, which is exactly the point being measured: see the
parameter-dependence table it emits.

NOT a calibration run. It must never feed `crates/speech-api/src/calibration.rs`
(docs/17 §25, benchmarks/speech/datasets/SOURCING.md).

Usage:
  python3 benchmarks/speech/tools/synthetic-learner-proxy.py --out /tmp/lts-synthetic \
      [--models ggml-base.bin,ggml-small.bin] [--payloads kokoro-multi-lang-v1_1] \
      [--skip-probes]
Emits clips/, refs/, and one probe transcript per (model, pair, reference) in
runs/ — the same numbers recorded in benchmarks/speech/results/.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

VENDOR = Path.home() / ".cache" / "lts-bench"
SHERPA = VENDOR / "sherpa-onnx-v1.13.8-linux-x64-shared" / "bin" / "sherpa-onnx-offline-tts"
SID = "37"  # the voice the app uses (apps/desktop/src-tauri/src/lib.rs)
REPO = Path(__file__).resolve().parents[2]

# The two vowel-length contrasts the pack teaches, with their declared targets
# (languages/ja-JP/phonology/contrasts.jsonl, ADR-0013).
PAIRS = {
    "obasan": {"short": "おばさん", "long": "おばあさん", "declared_ratio": 1.25},
    "toi": {"short": "とおい", "long": "問い", "declared_ratio": 1.5},
}

# stretch factor applied to the LONG-word segment of the take.
# Ground truth by construction: a mora-correct Japanese long vowel is audibly
# longer than the short counterpart; Kokoro's own output is not (ADR-0013
# measured 1.04-1.05), so f<=1.05 models the flattened contrast the feature is
# supposed to catch, and f>=1.4 models a correct production.
STRATA = [
    ("f0.85", 0.85, "shortened (over-correction error)"),
    ("f1.00", 1.00, "flattened (the error to catch; Kokoro's own posture)"),
    ("f1.25", 1.25, "target ratio as declared by the pack"),
    ("f1.45", 1.45, "mora-correct production"),
    ("f1.70", 1.70, "over-lengthened (hypercorrection error)"),
]

MODIFIERS = [
    ("clean", []),
    ("noise", ["noise"]),      # broadband noise at ~-34 dBFS amplitude
    ("pitch+3", ["pitch"]),    # +3% formant/pitch shift, duration preserved
]


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def synth(payload: str, text: str, out: Path) -> None:
    model = VENDOR / payload
    run(
        [
            str(SHERPA),
            f"--kokoro-model={model / 'model.onnx'}",
            f"--kokoro-voices={model / 'voices.bin'}",
            f"--kokoro-tokens={model / 'tokens.txt'}",
            f"--kokoro-data-dir={model / 'espeak-ng-data'}",
            "--kokoro-lang=ja",
            f"--sid={SID}",
            f"--output-filename={out}",
            text,
        ]
    )


def wav_filter(inp: Path, out: Path, filters: list[str]) -> None:
    chain = ",".join(filters) if filters else "anull"
    run(["ffmpeg", "-y", "-i", str(inp), "-filter:a", chain, "-ar", "22050", "-ac", "1", str(out)])


def concat(parts: list[Path], out: Path, lists: Path) -> None:
    lst = lists / f"{out.stem}.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts))
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-ar", "22050", "-ac", "1", str(out)])


def add_noise(inp: Path, out: Path) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(inp),
            "-f",
            "lavfi",
            "-i",
            "anoisesrc=color=white:amplitude=0.02:r=22050",
            "-filter_complex",
            "[0:a][1:a]amix=inputs=2:duration=shortest:normalize=0[out]",
            "-map",
            "[out]",
            "-ar",
            "22050",
            "-ac",
            "1",
            str(out),
        ]
    )

def run_probe(clips_dir: Path, ref_short: Path, ref_long: Path, model: str) -> str:
    """Score one clip set through the app's own align -> measure -> interpret path."""
    proc = subprocess.run(
        [
            "cargo", "run", "-q", "-p", "lts-speech-runtime", "--example",
            "vowel_length_probe", "--",
            "--ref-short", str(ref_short),
            "--ref-long", str(ref_long),
            "--clips", str(clips_dir),
            "--model", model,
        ],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return f"probe failed (exit {proc.returncode})\n{proc.stderr.strip()}\n"
    return proc.stdout


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--models", default="ggml-base.bin,ggml-small.bin")
    ap.add_argument("--payloads", default="kokoro-multi-lang-v1_1")
    ap.add_argument("--skip-probes", action="store_true", help="build clips only")
    ap.add_argument("--reuse", action="store_true",
                    help="keep existing audio in --out; TTS output is not byte-reproducible, "
                         "so re-measuring the same audio requires this flag")
    args = ap.parse_args()

    out = Path(args.out)
    if out.exists() and not args.reuse:
        shutil.rmtree(out)
    base = out / "base"
    clips = out / "clips"
    lists = out / "lists"
    refs = out / "refs"
    for d in (base, clips, refs, lists):
        d.mkdir(parents=True, exist_ok=True)

    if not SHERPA.exists():
        print(f"missing TTS runtime: {SHERPA}", file=sys.stderr)
        return 2

    records: list[dict] = []
    for payload in args.payloads.split(","):
        for pair_id, pair in PAIRS.items():
            short_wav = base / f"{payload}__{pair_id}__short.wav"
            long_wav = base / f"{payload}__{pair_id}__long.wav"
            if not (short_wav.exists() and long_wav.exists()):
                synth(payload, pair["short"], short_wav)
                synth(payload, pair["long"], long_wav)

            # Reference pair for the probe. "declared" reproduces the app's
            # current pack-declared path (ADR-0013): the reference ratio equals
            # the pack's expected_ratio, independent of any recording.
            # "tts" reproduces the pre-ADR-0013 path: the TTS output itself is
            # the reference.
            ref_s = refs / f"{payload}__{pair_id}__{pair['declared_ratio']:g}.short.wav"
            shutil.copy(short_wav, ref_s)
            wav_filter(long_wav, refs / f"{payload}__{pair_id}__{pair['declared_ratio']:g}.long.wav",
                       [f"atempo={1.0 / pair['declared_ratio']:.6f}"])
            shutil.copy(short_wav, refs / f"{payload}__{pair_id}__tts.short.wav")
            shutil.copy(long_wav, refs / f"{payload}__{pair_id}__tts.long.wav")

            silence = base / "sil.wav"
            run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", "0.35", str(silence)])

            for stratum, factor, meaning in STRATA:
                stretched = base / f"{payload}__{pair_id}__{stratum}.wav"
                if not stretched.exists():
                    # ffmpeg atempo>1 speeds up, so a duration multiplier of
                    # `factor` needs atempo = 1/factor.
                    wav_filter(long_wav, stretched, [f"atempo={1.0 / factor:.6f}"])
                for mod_name, mods in MODIFIERS:
                    take = clips / f"{pair_id}__{payload}__{stratum}__{mod_name}.wav"
                    if not take.exists():
                        concat([short_wav, silence, stretched], take, lists)
                        if "noise" in mods:
                            noisy = take.with_suffix(".noise.wav")
                            add_noise(take, noisy)
                            noisy.replace(take)
                        if "pitch" in mods:
                            pitched = take.with_suffix(".pitch.wav")
                            wav_filter(take, pitched, ["asetrate=22050*1.03", "aresample=22050", "atempo=0.9709"])
                            pitched.replace(take)
                    (take.with_suffix(".meta")).write_text(f"{pair['short']}\n{pair['long']}\n")
                    records.append(
                        {
                            "clip": take.name,
                            "pair": pair_id,
                            "payload": payload,
                            "stretch": factor,
                            "modifier": mod_name,
                            "meaning": meaning,
                            "intended_long_ratio": factor,
                        }
                    )

    (out / "manifest.json").write_text(json.dumps(records, indent=2, ensure_ascii=False))
    print(f"built {len(records)} clips in {clips}")
    if args.skip_probes:
        return 0

    runs = out / "runs"
    stage = out / "stage"
    runs.mkdir(parents=True, exist_ok=True)
    models = [m.strip() for m in args.models.split(",") if m.strip()]
    for payload in args.payloads.split(","):
        for pair_id, pair in PAIRS.items():
            staged = stage / f"{payload}__{pair_id}"
            staged.mkdir(parents=True, exist_ok=True)
            for wav in clips.glob(f"{pair_id}__{payload}__*.wav"):
                shutil.copy(wav, staged / wav.name)
                shutil.copy(wav.with_suffix(".meta"), staged / wav.with_suffix(".meta").name)
            for ref in (f"{pair['declared_ratio']:g}", "tts"):
                for model in models:
                    text = run_probe(
                        staged,
                        refs / f"{payload}__{pair_id}__{ref}.short.wav",
                        refs / f"{payload}__{pair_id}__{ref}.long.wav",
                        model,
                    )
                    name = f"{model.removesuffix('.bin')}__{pair_id}__{ref}.txt"
                    (runs / name).write_text(text)
                    print(f"probe {name}: {text.count('ABSTAIN')} of {len(records) // len(PAIRS)} abstained")
    print(f"probe transcripts in {runs}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
