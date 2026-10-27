#!/usr/bin/env python3
"""Tests for scripts/qa-asr.py checkpointing (stdlib only, no network).

Pins the contract that makes a multi-hour audit survivable:

* every verdict lands in --out the moment ITS asset settles, not at the end of
  the run (a killed run keeps the work it already did);
* re-running with the same --out carries the settled rows and asks the
  recognizer only for what is still missing (the counter the stub whisper
  writes proves no asset is re-transcribed);
* carrying rows does not launder their statuses: a carried MISMATCH still
  fails the run and still prints in the FAIL list.

Latin pseudo-words are used for the declared text so the compare stays on the
pure-python path (no espeak-ng / pykakasi needed for these cases).

Run: python3 scripts/test_qa_asr.py
"""

import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "qa-asr.py"

STUB = """#!/bin/sh
# stub whisper-cli: counts invocations, prints the canned transcript for the
# asset it is asked about, optionally sleeps so one asset settles later.
wav=""
for a in "$@"; do wav="$a"; done
printf x >> "$QA_STUB_COUNT"
case "$wav" in
  *slow*) sleep 1.5 ;;
esac
grep -m1 "^$(basename "$wav" .wav)=" "$QA_STUB_MAP" | cut -d= -f2-
"""


class QaAsrCheckpointTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="qa-asr-test-"))
        (self.tmp / "stub.sh").write_text(STUB)
        (self.tmp / "stub.sh").chmod(0o755)
        self.counter = self.tmp / "count"
        self.counter.write_text("")

        # id -> (declared text, canned transcript): fast-a/fast-b pass, slow-c
        # is a truncation landing just under the 0.75 ratio.
        assets = (("fast-a", "alpha", "alpha"),
                  ("fast-b", "beta", "beta"),
                  ("slow-c", "gamma delta epsilon", "gamma delta"))
        media = self.tmp / "media"
        media.mkdir()
        lines, rows = [], []
        for asset_id, text, heard in assets:
            (media / f"{asset_id}.wav").write_bytes(b"RIFF")  # stub ignores bytes
            rows.append({"id": asset_id, "file": f"media/{asset_id}.wav", "text": text})
            lines.append(f"{asset_id}={heard}")
        self.map = self.tmp / "map"
        self.map.write_text("\n".join(lines) + "\n")
        (media / "manifest.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows))
        self.pack = self.tmp

    def env(self):
        e = dict(os.environ)
        e["QA_STUB_COUNT"] = str(self.counter)
        e["QA_STUB_MAP"] = str(self.map)
        return e


    def run_gate(self, out: Path, ids: Path | None = None):
        cmd = [sys.executable, str(SCRIPT), "--pack", str(self.pack),
               "--model", "unused.bin", "--lang", "xx", "--workers", "2",
               "--whisper", str(self.tmp / "stub.sh"), "--out", str(out)]
        if ids:
            cmd += ["--ids", str(ids)]
        return subprocess.run(cmd, capture_output=True, text=True, env=self.env())

    def test_verdicts_are_written_as_assets_settle(self):
        out = self.tmp / "asr.jsonl"
        proc = subprocess.Popen(
            [sys.executable, str(SCRIPT), "--pack", str(self.pack),
             "--model", "unused.bin", "--lang", "xx", "--workers", "2",
             "--whisper", str(self.tmp / "stub.sh"), "--out", str(out)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=self.env())
        settled = []
        deadline = time.time() + 1.2
        while time.time() < deadline:
            if out.exists():
                settled = [json.loads(l) for l in out.read_text().splitlines() if l.strip()]
                if settled:
                    break
            time.sleep(0.05)
        self.assertTrue(settled, "no row reached --out while the slow asset was still running")
        self.assertNotIn("slow-c", {r["id"] for r in settled},
                         "the still-running asset must not be recorded yet")
        self.assertEqual(proc.poll(), None, "gate should still be waiting on the slow asset")
        proc.wait(timeout=30)
        rows = [json.loads(l) for l in out.read_text().splitlines() if l.strip()]
        self.assertEqual(len(rows), 3)
        self.assertEqual([r["id"] for r in rows if r["status"] == "MISMATCH"], ["slow-c"])
        self.assertEqual(proc.returncode, 1)

    def test_rerun_carries_rows_and_retranscribes_nothing(self):
        out = self.tmp / "asr.jsonl"
        two = self.tmp / "two.txt"
        two.write_text("fast-a\nfast-b\n")
        res = self.run_gate(out, two)
        self.assertEqual(res.returncode, 0, res.stdout + res.stderr)
        self.assertEqual(len([l for l in out.read_text().splitlines() if l.strip()]), 2)
        self.assertEqual(len(self.counter.read_text()), 2)

        res = self.run_gate(out)  # all three ids: only slow-c is unsettled
        self.assertIn("carrying 2 settled rows", res.stderr)
        self.assertEqual(len(self.counter.read_text()), 3,
                         "carried assets must not be re-transcribed")
        rows = [json.loads(l) for l in out.read_text().splitlines() if l.strip()]
        self.assertEqual(len(rows), 3)
        self.assertEqual(res.returncode, 1)
        self.assertIn("FAIL slow-c", res.stdout)

    def test_carried_mismatch_still_fails_the_run(self):
        out = self.tmp / "asr.jsonl"
        one = self.tmp / "one.txt"
        one.write_text("slow-c\n")
        first = self.run_gate(out, one)
        self.assertEqual(first.returncode, 1)
        second = self.run_gate(out, one)
        self.assertEqual(len(self.counter.read_text()), 1, "the mismatch was carried, not re-run")
        self.assertEqual(second.returncode, 1)
        self.assertIn("MISMATCH=1", second.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
