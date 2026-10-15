#!/usr/bin/env python3
"""Re-apply the generate-pack-audio loudness target to shipped audio, in place.

Loudness normalization is part of synthesis (owner decision 2026-10-10, O-06;
see `normalize_wav` in scripts/generate-pack-audio.py): every freshly
synthesized file is gain-matched to `TARGET_ACTIVE_RMS` under `PEAK_CEILING`.
That stage is pure Python — it never needed sox — so an asset can only drift
off target if it was written by a path that skipped the stage. This script
closes that gap for assets already on disk: it reuses `normalize_wav` itself
(no DSP copy) and rewrites exactly the manifest rows whose bytes it changed.

Rules this script enforces:
  * The DSP is scripts/generate-pack-audio.py's `normalize_wav`, imported, so
    the applied gain and the note wording can never disagree with synthesis.
  * A candidate's normalized bytes are first produced in a scratch copy. The
    asset is only replaced when that copy actually differs from the bytes on
    disk; already-conforming assets keep their bytes AND their manifest row
    untouched. A gain the DSP reports within +/-1% of 1.00x also counts as
    conforming: 16-bit rounding can shift LSBs without any audible change,
    and rewrites at that scale would break idempotence without helping.
  * `--all-tracked` expands to manifest rows whose file is tracked by git
    under the pack's media dir; gitignored bulk audio is never touched even
    when present on disk.
  * Anything the manifest does not name is refused with a non-zero exit: an
    id with no row, a path passed instead of an id, a duplicated row, and a
    row whose file is missing on disk. Nothing is written when the run is
    refused, so a half-applied batch cannot happen.
  * Only `sha256`, `bytes`, and `notes` change on an updated row (the DSP is
    length-preserving), and every untouched line is re-emitted verbatim.
  * Final line: `summary <pack>: rows updated=N rows unchanged=M rows
    failing=K`, matching the fetch-pack-audio.sh summary style.

Usage:
  scripts/renormalize_pack_audio.py languages/ja-JP ja.sent.office-notice-time
  scripts/renormalize_pack_audio.py languages/ru-RU --all-tracked
Tests: scripts/test_renormalize_pack_audio.py
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

def say(msg: str) -> None:
    print(f"renormalize-pack-audio: {msg}", file=sys.stderr)

_gen_path = Path(__file__).with_name("generate-pack-audio.py")
_spec = importlib.util.spec_from_file_location("generate_pack_audio", _gen_path)
_gen = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_gen)
normalize_wav = _gen.normalize_wav
sha256_file = _gen.sha256_file

# A reported gain this close to unity is a no-op: rounding noise, not drift.
GAIN_TOLERANCE = 0.01
_GAIN_RE = re.compile(r"gain ([0-9.]+)x")


def tracked_media(pack: Path) -> set[str]:
    """media/ files git tracks under `pack` (empty set outside a git repo)."""
    done = subprocess.run(
        ["git", "-C", str(pack), "ls-files", "--", "media"],
        capture_output=True, text=True,
    )
    if done.returncode != 0:
        say(f"--all-tracked needs git: {done.stderr.strip()[:160]}")
        raise SystemExit(1)
    return {line for line in done.stdout.split("\n") if line.strip()}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("pack", type=Path, help="pack directory, e.g. languages/ja-JP")
    ap.add_argument("ids", nargs="*", help="audio ids named by the media manifest")
    ap.add_argument("--all-tracked", action="store_true",
                    help="every manifest row whose media file is git-tracked")
    args = ap.parse_args()

    manifest_path = args.pack / "media" / "manifest.jsonl"
    if not manifest_path.is_file():
        say(f"no manifest at {manifest_path}")
        return 1
    lines = manifest_path.read_text().splitlines(keepends=True)
    rows: dict[str, tuple[int, dict]] = {}
    for i, line in enumerate(lines):
        if not line.strip():
            continue
        row = json.loads(line)
        if row["id"] in rows:
            say(f"manifest has duplicate rows for {row['id']}; refusing")
            return 1
        rows[row["id"]] = (i, row)

    if args.all_tracked:
        tracked = tracked_media(args.pack)
        targets = [rid for rid, (_, row) in sorted(rows.items())
                   if row["file"] in tracked]
    else:
        targets = list(args.ids)
    if not targets:
        say("give audio ids or --all-tracked")
        return 1

    # Refusals happen before any byte is written.
    missing_ids, missing_files = [], []
    for rid in targets:
        if rid not in rows:
            missing_ids.append(rid)
        elif not (args.pack / rows[rid][1]["file"]).is_file():
            missing_files.append(rid)
    if missing_ids:
        say(f"refusing: ids not named by {manifest_path} (audio ids only, "
            f"not paths): {', '.join(missing_ids)}")
        return 1
    if missing_files:
        say(f"refusing: manifest rows name files missing on disk: "
            f"{', '.join(missing_files)}")
        return 1

    updated = unchanged = failing = 0
    for rid in targets:
        idx, row = rows[rid]
        path = args.pack / row["file"]
        before = path.read_bytes()
        fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), suffix=".wav.tmp")
        with open(fd, "wb") as fh:
            fh.write(before)
        tmp = Path(tmp_name)
        try:
            try:
                note = normalize_wav(tmp)
            except (wave.Error, EOFError) as exc:
                say(f"{rid}: cannot read wav: {exc}")
                failing += 1
                continue
            if note is None:
                say(f"{rid}: normalization skipped (format or silence); left alone")
                failing += 1
                continue
            after = tmp.read_bytes()
            gain = float(_GAIN_RE.search(note).group(1))
            if after == before or abs(gain - 1.0) <= GAIN_TOLERANCE:
                unchanged += 1
                continue
            tmp.replace(path)
        finally:
            tmp.unlink(missing_ok=True)
        row["sha256"] = sha256_file(path)
        row["bytes"] = path.stat().st_size
        row["notes"] = f"{row.get('notes') or ''}; {note}".lstrip("; ")
        lines[idx] = json.dumps(row, ensure_ascii=False) + "\n"
        updated += 1
        say(f"{rid}: {note}")

    if updated:
        manifest_path.write_text("".join(lines))
    say(f"summary {args.pack}: rows updated={updated} rows unchanged={unchanged} rows failing={failing}")
    return 1 if failing else 0


if __name__ == "__main__":
    sys.exit(main())
