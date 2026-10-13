#!/usr/bin/env python3
"""Tests for scripts/fetch-pack-audio.sh (stdlib only, no network, no cargo).

Pins the restore contract a fresh clone depends on: --verify-only passes only
when every tracked manifest row (file present, sha256, byte length) is
satisfied on disk; a corrupted or missing .wav fails naming its id; catalog
resolution fails naming pack_id+version when the archive was never published;
a catalog entry missing its sha256/size_bytes pin is refused; an archive whose
size or sha256 disagrees with the catalog pins is refused; and a restore
copies exactly the manifest rows while leaving a hash-valid .wav
byte-for-byte untouched (idempotent).

The archive is a local file:// URL and the langpack CLI is stubbed through
LTS_LANGPACK_CLI: the stub only reproduces the documented store layout
(<store>/<pack_id>/<version>/media/, see archive::install), so these checks
stay hermetic. The real install gate is exercised by CI itself.

Run: python -m unittest scripts.test_fetch_pack_audio -v
"""

import hashlib
import json
import os
import subprocess
import tempfile
import sys
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "fetch-pack-audio.sh"

PACK_ID = "org.openlanguage.test-restore"
VERSION = "0.1.0"
IDS = ["t.lex.alpha", "t.lex.bravo", "t.lex.charlie"]

# Store-layout stand-in for `lts-langpack-cli install`: unzip the archive at
# <store>/<pack_id>/<version>/, identity read from the pack manifest inside.
INSTALL_STUB = r'''
import re, sys, zipfile
from pathlib import Path
argv = sys.argv[1:]
assert argv[0] == "install", argv
store = Path(argv[argv.index("--store") + 1])
with zipfile.ZipFile(argv[-1]) as zf:
    name = next(n for n in zf.namelist() if n.endswith("manifest.yaml"))
    text = zf.read(name).decode()
    pack_id = re.search(r'^pack_id:\s*"([^"]+)"', text, re.M).group(1)
    version = re.search(r'^version:\s*"([^"]+)"', text, re.M).group(1)
    dest = store / pack_id / version
    for entry in zf.namelist():
        target = dest / entry
        if not str((dest / entry).resolve()).startswith(str(dest.resolve())):
            raise SystemExit("archive entry escapes store: " + entry)
        if entry.endswith("/"):
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(zf.read(entry))
'''


def wav_bytes(seed: int, n: int = 96) -> bytes:
    return bytes((seed * 7 + i) % 256 for i in range(n))


def good_wavs() -> dict[str, bytes]:
    return {name: wav_bytes(i + 1) for i, name in enumerate(IDS)}


class FetchPackAudioTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.tmp = Path(self._tmp.name)

    def write_pack(self, pack_dir: Path, wavs: dict[str, bytes] | None) -> Path:
        (pack_dir / "media").mkdir(parents=True)
        (pack_dir / "manifest.yaml").write_text(
            "schema_version: \"0.2\"\n"
            f"pack_id: \"{PACK_ID}\"\n"
            "display_name: \"Restore Test Pack\"\n"
            f"version: \"{VERSION}\"\n"
        )
        rows = []
        for name in IDS:
            rows.append(json.dumps({
                "id": name,
                "file": f"media/{name}.wav",
                "sha256": hashlib.sha256(wav_bytes(IDS.index(name) + 1)).hexdigest(),
                "bytes": len(wav_bytes(IDS.index(name) + 1)),
            }))
        (pack_dir / "media" / "manifest.jsonl").write_text("\n".join(rows) + "\n")
        if wavs is not None:
            for name, data in wavs.items():
                (pack_dir / "media" / f"{name}.wav").write_bytes(data)
        return pack_dir

    def make_archive(self) -> Path:
        """A pack-complete archive (manifest + all wavs valid) at tmp/archive.lpk."""
        source = self.tmp / "source-pack"
        self.write_pack(source, good_wavs())
        archive = self.tmp / "archive.lpk"
        with zipfile.ZipFile(archive, "w") as zf:
            for path in sorted(source.rglob("*")):
                if path.is_file():
                    zf.write(path, path.relative_to(source).as_posix())
        return archive

    def write_catalog(self, url: str, archive: Path, omit: tuple[str, ...] = (),
                      version: str = VERSION, sha: str | None = None,
                      size: int | None = None) -> Path:
        entry = {
            "pack_id": PACK_ID,
            "version": version,
            "url": url,
            "size_bytes": size if size is not None else archive.stat().st_size,
            "sha256": sha if sha is not None
            else hashlib.sha256(archive.read_bytes()).hexdigest(),
        }
        for key in omit:
            del entry[key]
        catalog = self.tmp / "catalog.json"
        catalog.write_text(json.dumps({"catalog_version": "0.1.0", "packs": [entry]}))
        return catalog

    def run_script(self, *args: str, stub: bool = False) -> subprocess.CompletedProcess:
        env = dict(os.environ)
        if stub:
            stub_path = self.tmp / "stub-install.py"
            stub_path.write_text(INSTALL_STUB)
            env["LTS_LANGPACK_CLI"] = f"{sys.executable} {stub_path}"
        return subprocess.run(
            ["bash", str(SCRIPT), *args],
            capture_output=True, text=True, env=env, cwd=ROOT,
        )

    # ------------------------------------------------------------- verify-only

    def test_verify_only_passes_when_everything_matches(self):
        pack = self.write_pack(self.tmp / "pack", good_wavs())
        r = self.run_script("--pack-dir", str(pack), "--verify-only")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("rows checked=3", r.stderr)
        self.assertIn("rows failing=0", r.stderr)

    def test_verify_only_fails_naming_the_corrupt_wav_id(self):
        wavs = good_wavs()
        wavs["t.lex.bravo"] = wavs["t.lex.bravo"][:-1] + b"\x00"  # same length
        pack = self.write_pack(self.tmp / "pack", wavs)
        r = self.run_script("--pack-dir", str(pack), "--verify-only")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("t.lex.bravo: sha256 does not match", r.stderr)
        for other in ("t.lex.alpha", "t.lex.charlie"):
            self.assertNotIn(f"{other}: file", r.stderr)
        self.assertIn("rows failing=1", r.stderr)

    def test_verify_only_fails_naming_the_missing_wav_id(self):
        pack = self.write_pack(self.tmp / "pack", good_wavs())
        (pack / "media" / "t.lex.charlie.wav").unlink()
        r = self.run_script("--pack-dir", str(pack), "--verify-only")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("t.lex.charlie: file missing", r.stderr)
        self.assertIn("rows failing=1", r.stderr)

    def test_verify_only_without_audio_fails_naming_every_id(self):
        pack = self.write_pack(self.tmp / "pack", {})
        r = self.run_script("--pack-dir", str(pack), "--verify-only")
        self.assertNotEqual(r.returncode, 0)
        for name in IDS:
            self.assertIn(f"{name}: file missing", r.stderr)
        self.assertIn("rows failing=3", r.stderr)

    # --------------------------------------------------------------- catalog

    def test_catalog_resolution_names_pack_and_version_when_absent(self):
        pack = self.write_pack(self.tmp / "pack", {})
        archive = self.make_archive()
        catalog = self.write_catalog(
            f"file://{archive}", archive, version="9.9.9")
        r = self.run_script("--pack-dir", str(pack), "--catalog", str(catalog),
                            "--work-dir", str(self.tmp / "work"))
        self.assertNotEqual(r.returncode, 0)
        self.assertIn(PACK_ID, r.stderr)
        self.assertIn(VERSION, r.stderr)
        self.assertIn("published", r.stderr)

    def test_catalog_entry_missing_pins_is_refused(self):
        pack = self.write_pack(self.tmp / "pack", {})
        archive = self.make_archive()
        catalog = self.write_catalog(f"file://{archive}", archive,
                                     omit=("sha256",))
        r = self.run_script("--pack-dir", str(pack), "--catalog", str(catalog),
                            "--work-dir", str(self.tmp / "work"))
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("missing (or does not pin) sha256", r.stderr)
        catalog = self.write_catalog(f"file://{archive}", archive,
                                     omit=("size_bytes",))
        r = self.run_script("--pack-dir", str(pack), "--catalog", str(catalog),
                            "--work-dir", str(self.tmp / "work"))
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("missing (or does not pin) size_bytes", r.stderr)

    # --------------------------------------------------------------- restore

    def test_restore_copies_missing_rows_and_never_touches_valid_ones(self):
        wavs = good_wavs()
        wavs["t.lex.bravo"] = bytes((b + 1) % 256 for b in wavs["t.lex.bravo"])
        del wavs["t.lex.charlie"]  # absent target
        pack = self.write_pack(self.tmp / "pack", wavs)
        alpha = pack / "media" / "t.lex.alpha.wav"
        alpha_ino = alpha.stat().st_ino

        archive = self.make_archive()
        catalog = self.write_catalog(f"file://{archive}", archive)
        r = self.run_script("--pack-dir", str(pack), "--catalog", str(catalog),
                            "--work-dir", str(self.tmp / "work"), stub=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("files restored=2", r.stderr)
        self.assertIn("files already valid=1", r.stderr)
        self.assertIn("rows failing=0", r.stderr)
        # The hash-valid wav was never rewritten; the other two now match.
        self.assertEqual(alpha.stat().st_ino, alpha_ino)
        self.assertEqual(alpha.read_bytes(), good_wavs()["t.lex.alpha"])
        for name in ("t.lex.bravo", "t.lex.charlie"):
            self.assertEqual(
                (pack / "media" / f"{name}.wav").read_bytes(), good_wavs()[name])
        # Idempotent: a second run restores nothing and stays green.
        r = self.run_script("--pack-dir", str(pack), "--catalog", str(catalog),
                            "--work-dir", str(self.tmp / "work"), stub=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("files restored=0", r.stderr)
        # The offline path agrees.
        r = self.run_script("--pack-dir", str(pack), "--verify-only")
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_archive_disagreeing_with_the_catalog_pins_is_refused(self):
        pack = self.write_pack(self.tmp / "pack", {})
        archive = self.make_archive()
        other = self.tmp / "other.lpk"
        other.write_bytes(b"some other archive bytes")
        catalog = self.write_catalog(
            f"file://{archive}", archive,
            sha=hashlib.sha256(other.read_bytes()).hexdigest())
        r = self.run_script("--pack-dir", str(pack), "--catalog", str(catalog),
                            "--work-dir", str(self.tmp / "work"), stub=True)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("archive sha256", r.stderr)
        self.assertIn("refusing to use it", r.stderr)
        catalog = self.write_catalog(
            f"file://{archive}", archive, size=archive.stat().st_size + 1)
        r = self.run_script("--pack-dir", str(pack), "--catalog", str(catalog),
                            "--work-dir", str(self.tmp / "work"), stub=True)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("archive size", r.stderr)
        # Nothing was restored from the refused archive.
        self.assertEqual(list((pack / "media").glob("*.wav")), [])


if __name__ == "__main__":
    unittest.main()
