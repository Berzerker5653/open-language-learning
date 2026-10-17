#!/usr/bin/env python3
"""Tests for scripts/derive-kanji-radicals.py (JA-KANJI-REFRESH-001).

Run by scripts/ci.sh via: python -m unittest discover -s scripts -p
'test_derive_kanji_radicals.py'
"""
import hashlib
import importlib.util
import io
import json
import tarfile
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    "derive_kanji_radicals", HERE / "derive-kanji-radicals.py"
)
dkr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dkr)

PINNED_RELEASE = "3.6.2+20260928191014"


def make_tgz(krad_doc: dict) -> bytes:
    buf = io.BytesIO()
    payload = json.dumps(krad_doc, ensure_ascii=False).encode("utf-8")
    with tarfile.open(fileobj=buf, mode="w:gz") as tf:
        info = tarfile.TarInfo("kradfile.json")
        info.size = len(payload)
        tf.addfile(info, io.BytesIO(payload))
    return buf.getvalue()


class PinTest(unittest.TestCase):
    def test_pack_pin_is_the_single_stored_pin(self):
        """The release version must live only in the pack's sources.jsonl; the
        hash-pin table is keyed by that same value. If the pack pin and the
        shipped data (via the pin table) diverge, this fails."""
        text = dkr.SOURCES_PATH.read_text(encoding="utf-8")
        self.assertEqual(dkr.parse_pin(text), PINNED_RELEASE)
        self.assertEqual(set(dkr.EXPECTED_SHA256), {dkr.parse_pin(text)})

    def test_parse_pin_rejects_row_without_pin(self):
        row = json.dumps({"id": "jmdict-simplified", "title": "jmdict-eng JSON"})
        with self.assertRaises(dkr.Abort):
            dkr.parse_pin(row)
        with self.assertRaises(dkr.Abort):
            dkr.parse_pin('{"id": "other", "title": "x 1.2.3+20260101000000"}')


class ConversionTest(unittest.TestCase):
    def test_dedup_preserves_source_order(self):
        self.assertEqual(
            dkr.convert(["一", "大", "一", "二", "大"]), ["一", "大", "二"]
        )
        self.assertEqual(dkr.convert(["气", "丶", "ノ", "乞"]), ["气", "丶", "ノ", "乞"])

    def test_rejects_bad_components(self):
        with self.assertRaises(dkr.Abort):
            dkr.convert(["ab"])
        with self.assertRaises(dkr.Abort):
            dkr.convert([1])


class DriftTest(unittest.TestCase):
    FIXTURE = [
        '{"id": "ja.kanji.ten", "character": "天", "radicals": ["一", "大", "二"], '
        '"sources": ["jf-standard", "kradfile"]}',
        '{"id": "ja.kanji.kuu", "character": "空", "radicals": ["穴", "工"], '
        '"sources": ["jf-standard", "kradfile"]}',
    ]

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "entries.jsonl"
        self.original = "\n".join(self.FIXTURE) + "\n"
        self.path.write_text(self.original, encoding="utf-8")

    def tearDown(self):
        self.dir.cleanup()

    def test_drift_reports_change_and_removal_and_writes_nothing(self):
        krad = {"天": ["大", "二", "三"], "穴": ["穴"]}
        records = dkr.load_pack_records([self.path])
        stats = dkr.compare_pack(records, krad)
        changed = {r["id"]: r for r in stats["changed_records"]}
        self.assertIn("ja.kanji.ten", changed)
        self.assertEqual(changed["ja.kanji.ten"]["old"], ["一", "大", "二"])
        self.assertEqual(changed["ja.kanji.ten"]["new"], ["大", "二", "三"])
        self.assertEqual(changed["ja.kanji.ten"]["kind"], "set")
        removed = [r["character"] for r in stats["removed_characters"]]
        self.assertEqual(removed, ["空"])
        self.assertEqual(stats["byte_identical_radicals"], 0)
        self.assertEqual(self.path.read_text(encoding="utf-8"), self.original)
        self.assertEqual(
            sorted(p.name for p in Path(self.dir.name).iterdir()), ["entries.jsonl"]
        )

    def test_clean_reproduction_detected(self):
        krad = {"天": ["一", "大", "二"], "空": ["穴", "穴", "工"]}
        stats = dkr.compare_pack(dkr.load_pack_records([self.path]), krad)
        self.assertEqual(stats["changed_records"], [])
        self.assertEqual(stats["removed_characters"], [])
        self.assertEqual(stats["byte_identical_radicals"], 2)
        self.assertEqual(stats["byte_identical_sources"], 2)

    def test_diverged_sources_are_a_real_abort(self):
        bad = [
            '{"id": "ja.kanji.ten", "character": "天", "radicals": ["一", "大", "二"], '
            '"sources": ["totally-made-up"]}',
        ]
        self.path.write_text("\n".join(bad) + "\n", encoding="utf-8")
        with self.assertRaises(dkr.Abort):
            dkr.compare_pack(dkr.load_pack_records([self.path]), {"天": ["一"]})


class HashPinTest(unittest.TestCase):
    DOC = {"kanji": {"一": ["一"], "二": ["一", "一", "二"]}}

    def test_hash_mismatch_aborts_before_derivation(self):
        tgz = make_tgz(self.DOC)
        member = json.dumps(self.DOC, ensure_ascii=False).encode("utf-8")
        good = {
            "release": "9.9.9+20260101000000",
            "asset": hashlib.sha256(tgz).hexdigest(),
            "json": hashlib.sha256(member).hexdigest(),
        }
        # control: pins match -> derivation returns the kanji map
        self.assertEqual(dkr.load_krad_verified(tgz, good), self.DOC["kanji"])
        # asset pin mismatch aborts
        with self.assertRaises(dkr.Abort) as ctx:
            dkr.load_krad_verified(tgz, {**good, "asset": "0" * 64})
        self.assertIn("sha256 mismatch", str(ctx.exception))
        self.assertIn("before any derivation", str(ctx.exception))
        # extracted-JSON pin mismatch aborts
        with self.assertRaises(dkr.Abort) as ctx:
            dkr.load_krad_verified(tgz, {**good, "json": "0" * 64})
        self.assertIn("sha256 mismatch", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
