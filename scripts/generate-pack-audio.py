#!/usr/bin/env python3
"""Generate pack audio with the pinned TTS payload (ADR-0016).

Media-first is already how the engine resolves listening audio:
`media/<sentence-id>.wav` and `media/<contrast-id>-<item-index>.wav`. The pack
ships zero audio, so every one of those lookups falls through to on-demand
synthesis. This script bakes that synthesis into the pack at build time and
records what produced each file.

Rules this script enforces:
  * Audio binaries are NOT committed. The committed artifact is
    `media/manifest.jsonl`: one schema-valid `media-asset` line per file with
    sha256/size/format plus the synthesizer identity, so any release build can
    regenerate byte-identical media and verify what it shipped.
  * Provenance is declared (`model-output`), never inferred by the app from a
    file's presence — see `declared_media_provenance` in the desktop crate.
  * Synthesis input is the item's declared reading when it declares one —
    sentence/contrast `reading`, lexicon `readings[]` entries tagged with a
    `script` — and falls back to the written form only when the item declares
    no reading at all. Romaji (`transliteration_system`) is NEVER fed: measured
    2026-10-08 (K-65, docs/provenance/ja-jp-greeting-audio-k65.md), the pinned
    Kokoro engine spells romaji input out letter by letter, while its kana
    path pronounces the topic-particle は as wa.
  * The manifest row records the exact string fed to the engine, and its notes
    name the field that string came from, so the lts-langpack guard
    `media_text_not_declared_reading` can tie every asset back to the item's
    declared reading.
  * Loudness normalization is part of synthesis (owner decision 2026-10-10,
    O-06): the pinned Kokoro output is clean but quiet (measured RMS ≈ −24
    dBFS), which learners hear as "tinny". Every freshly synthesized file is
    gain-matched to a target active-speech level under a peak ceiling; the
    row's notes record what was applied. Reused (hash-matched) files are
    never touched, so the manifest and the bytes on disk can never drift.
    Disable with `--no-normalize`.

Usage:
  scripts/generate-pack-audio.py --pack languages/ja-JP
  scripts/generate-pack-audio.py --pack languages/ja-JP --force   # regenerate
  scripts/generate-pack-audio.py --pack languages/ja-JP --dry-run # decisions only
  scripts/generate-pack-audio.py --pack languages/ja-JP \
      --only ja.lex.greeting.konnichiwa                           # one asset
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import math
import struct
import subprocess
import sys
import wave
from pathlib import Path

DEFAULT_VENDOR = Path.home() / ".cache" / "lts-bench"
RUNTIME = "sherpa-onnx-v1.13.8-linux-x64-shared"

# Loudness targets (owner decision 2026-10-10 after the owner measured the
# shipped clips as quiet/thin): active-speech RMS ≈ −16.5 dBFS with a peak
# ceiling ≈ −3 dBFS as a guard. Silence at the edges of a clip does not
# count toward the level, so a short breath gap cannot inflate the gain.
TARGET_ACTIVE_RMS = 0.15
PEAK_CEILING = 0.70
ACTIVE_GATE = 0.02


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]



def normalize_wav(path: Path) -> str | None:
    """Gain-match one freshly synthesized 16-bit PCM file in place.

    The applied gain is chosen so the RMS over *active* (speech) frames
    reaches `TARGET_ACTIVE_RMS`, capped by `PEAK_CEILING` of full scale —
    quiet files get louder, hot files get pulled down, and nothing can clip.
    Returns a human description for the manifest notes; `None` means the
    file was left untouched (unsupported format or pure silence).
    """
    with wave.open(str(path)) as wav:
        rate, channels, width = wav.getframerate(), wav.getnchannels(), wav.getsampwidth()
        frames = wav.readframes(wav.getnframes())
    if width != 2 or not frames:
        return None
    samples = list(struct.unpack("<%dh" % (len(frames) // 2), frames))
    frame_len = max(1, rate // 100)
    rms = [
        math.sqrt(sum(s * s for s in samples[i : i + frame_len * channels]) / (frame_len * channels))
        for i in range(0, len(samples), frame_len * channels)
    ]
    loudest = max(rms)
    if loudest == 0:
        return None
    active = [v for v in rms if v > ACTIVE_GATE * loudest]
    active_rms = math.sqrt(sum(v * v for v in active) / len(active))
    peak = max(abs(s) for s in samples)
    gain = min(TARGET_ACTIVE_RMS * 32767.0 / active_rms, PEAK_CEILING * 32767.0 / peak)
    samples = [max(-32768, min(32767, round(s * gain))) for s in samples]
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(struct.pack("<%dh" % len(samples), *samples))
    return f"loudness normalized, gain {gain:.2f}x to active rms {TARGET_ACTIVE_RMS:.2f}, peak ceiling {PEAK_CEILING:.2f}"


def speak_choice(declared: str | None, written: str) -> tuple[str, str]:
    """(string to feed the engine, name of the field it came from)."""
    if declared:
        return declared, "reading"
    return written, "text (no reading declared)"


def targets(pack: Path) -> list[dict]:
    """Every audio slot the engine will look for, in stable order."""
    out: list[dict] = []
    for shard in sorted((pack / "sentences").glob("*.jsonl")):
        for row in load_jsonl(shard):
            speak, field = speak_choice(row.get("reading"), row["text"])
            out.append(
                {
                    "id": row["id"],
                    "file": f"media/{row['id']}.wav",
                    "text": row["text"],
                    "speak": speak,
                    "speak_from": field,
                }
            )
    for row in load_jsonl(pack / "phonology" / "contrasts.jsonl"):
        for index, item in enumerate(row.get("items", [])):
            asset_id = f"{row['id']}-{index}"
            speak, field = speak_choice(item.get("reading"), item["text"])
            out.append(
                {
                    "id": asset_id,
                    "file": f"media/{asset_id}.wav",
                    "text": item["text"],
                    "speak": speak,
                    "speak_from": field,
                }
            )
    for shard in sorted((pack / "lexicon").glob("*.jsonl")):
        for row in load_jsonl(shard):
            forms = row.get("forms", [])
            written = next(
                (f["text"] for f in forms if f.get("is_primary")),
                forms[0]["text"] if forms else "",
            )
            # A script-tagged reading (kana) is the speakable form; a
            # transliteration_system entry is a romanization scaffold that the
            # engine cannot speak (see the module docstring).
            kana = next(
                (r["text"] for r in row.get("readings", []) if r.get("script")),
                None,
            )
            if kana:
                speak, field = kana, "readings(script)"
            else:
                speak, field = written, "text (no reading declared)"
            out.append(
                {
                    "id": row["id"],
                    "file": f"media/{row['id']}.wav",
                    "text": written,
                    "speak": speak,
                    "speak_from": field,
                }
            )
    return out


def build_row(want: dict, path: Path, synth: dict, today: str, extra: str | None) -> dict:
    """One manifest line for the asset at `path`.

    `text` is the exact string fed to the synthesizer — the item's declared
    reading when it has one — and the notes name the field that string came
    from, so a reader (and the lts-langpack guard) can tie the audio back to
    the pack item instead of guessing which form produced it.
    """
    with wave.open(str(path)) as wav:
        sample_rate, channels, frames = wav.getframerate(), wav.getnchannels(), wav.getnframes()
    notes = (
        "generated by scripts/generate-pack-audio.py; AI output, not a human "
        "recording and not human-reviewed"
    )
    notes += f"; text fed to the engine came from the {want['speak_from']} field"
    if want["speak"] != want["text"]:
        notes += f"; spoken {want['speak']} instead of written {want['text']}"
    if extra:
        notes += f"; {extra}"
    return {
        "id": want["id"],
        "file": want["file"],
        "sha256": sha256_file(path),
        "bytes": path.stat().st_size,
        "sample_rate": sample_rate,
        "channels": channels,
        "seconds": round(frames / sample_rate, 3),
        "provenance": "model-output",
        "synthesizer": synth,
        "text": want["speak"],
        "generated": today,
        "notes": notes,
    }

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", required=True, type=Path)
    ap.add_argument("--vendor", type=Path, default=DEFAULT_VENDOR)
    ap.add_argument("--payload", default="kokoro-multi-lang-v1_1")
    ap.add_argument("--voice", default="37", help="numeric Kokoro speaker id")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--force", action="store_true", help="regenerate existing audio")
    ap.add_argument(
        "--only",
        action="append",
        default=[],
        help="restrict the run to these asset ids (repeatable); manifest rows "
        "outside the selection are carried over verbatim",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="print the input decision (asset id, source field, string) for "
        "every target without synthesizing or touching the manifest",
    )
    ap.add_argument(
        "--note",
        default=None,
        help="extra sentence appended to the notes of every row this run writes",
    )
    ap.add_argument(
        "--no-normalize",
        action="store_true",
        help="skip the loudness normalization applied to every freshly "
        "synthesized file (reuse/hash-match semantics are unchanged)",
    )
    args = ap.parse_args()

    pack = args.pack
    runtime = args.vendor / RUNTIME / "bin" / "sherpa-onnx-offline-tts"
    model_dir = args.vendor / args.payload
    wants = targets(pack)
    if args.only:
        unknown = sorted(set(args.only) - {w["id"] for w in wants})
        if unknown:
            print(f"--only ids not in the pack's targets: {unknown}", file=sys.stderr)
            return 2
        wants = [w for w in wants if w["id"] in set(args.only)]

    if args.dry_run:
        for w in wants:
            print(f"{w['id']}\t{w['speak_from']}\t{w['speak']}")
        return 0

    media = pack / "media"
    media.mkdir(exist_ok=True)
    manifest_path = media / "manifest.jsonl"
    previous = {r["id"]: r for r in load_jsonl(manifest_path)}
    model_sha = sha256_file(model_dir / "model.onnx")
    today = datetime.date.today().isoformat()

    rows: list[dict] = []
    generated = reused = 0
    failures: list[str] = []
    synth = {
        "runtime": RUNTIME,
        "model": args.payload,
        "model_sha256": model_sha,
        "voice": args.voice,
        "speed": args.speed,
    }
    for want in wants:
        out = pack / want["file"]
        prior = previous.get(want["id"])
        # Reuse means the bytes on disk still match the committed hash. The
        # line itself is rebuilt either way, so a documentation fix here never
        # leaves a stale row behind while the audio stays byte-identical.
        if (
            out.exists()
            and prior
            and not args.force
            and prior.get("sha256") == sha256_file(out)
        ):
            rows.append(build_row(want, out, synth, today, args.note))
            reused += 1
            continue
        cmd = [
            str(runtime),
            f"--kokoro-model={model_dir / 'model.onnx'}",
            f"--kokoro-voices={model_dir / 'voices.bin'}",
            f"--kokoro-tokens={model_dir / 'tokens.txt'}",
            f"--kokoro-data-dir={model_dir / 'espeak-ng-data'}",
            "--kokoro-lang=ja",
            f"--sid={args.voice}",
            f"--speed={args.speed:g}",
            f"--output-filename={out}",
            want["speak"],
        ]
        done = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        if done.returncode != 0 or not out.exists():
            failures.append(f"{want['id']}: {done.stderr.strip()[:160] or 'no output file'}")
            if out.exists():
                out.unlink()
            continue
        extras = [args.note]
        if not args.no_normalize:
            extras.append(normalize_wav(out) or "normalization skipped (format or silence)")
        extra = "; ".join(e for e in extras if e) or None
        rows.append(build_row(want, out, synth, today, extra))
        generated += 1

    if args.only:
        # A limited run must not erase the rows it did not touch: a full
        # rebuild is the only operation that rewrites the whole manifest.
        touched = {w["id"] for w in wants}
        rows.extend(prior for rid, prior in previous.items() if rid not in touched)
    rows.sort(key=lambda r: r["id"])
    manifest_path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))
    total = sum(r["bytes"] for r in rows)
    print(f"pack={pack} assets={len(rows)} generated={generated} reused={reused} bytes={total}")
    for failure in failures:
        print(f"FAILED {failure}", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
