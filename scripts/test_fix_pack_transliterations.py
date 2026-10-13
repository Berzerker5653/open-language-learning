"""Tests for the romaji generator the lexicon repair uses.

These pin the transliteration rules that were read off the pack's own
well-formed rows (long vowels spelled, sokuon `t` before ち/つ, ん always `n`,
single-kana particles read as particles), plus the two repair-safety rules:
a row the converter cannot render is left alone, and an edit never rewrites
the parts of a line it did not touch.
"""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

TOOL = Path(__file__).with_name("fix-pack-transliterations.py")
spec = importlib.util.spec_from_file_location("fixpt", TOOL)
fixpt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixpt)

# (declared kana reading, romaji the pack's conventions produce)
CASES = [
    ("がっこう", "gakkou"),          # geminate + spelled long vowel
    ("きっと", "kitto"),
    ("きって", "kitte"),
    ("とうきょう", "toukyou"),
    ("べんきょう", "benkyou"),
    ("コーヒー", "koohii"),           # katakana ー repeats the mora vowel
    ("じっさい", "jissai"),
    ("テーブル", "teeburu"),
    ("インターネット", "intaanetto"),
    ("りょうり", "ryouri"),
    ("ほん", "hon"),
    ("はんばい", "hanbai"),           # pack convention, not hepburn's "m"
    ("しんぱい", "shinpai"),
    ("いっち", "itchi"),             # sokuon before ち is t
    ("まっち", "matchi"),
    ("みっつ", "mittsu"),
    ("ずっと", "zutto"),              # long u, no sokuon
    ("でんわ", "denwa"),
    ("やさしい", "yasashii"),
    ("は", "ha"),                     # no particle exception: は alone is "tooth"
    ("しごと", "shigoto"),
    ("へ", "he"),
    ("はな", "hana"),
    ("めろでぃ", "merodi"),           # small kana re-vowelise the mora before them
    ("めでぃあ", "media"),
    ("ふぉーく", "fooku"),
    ("えでぃとりある", "editoriaru"),
    ("ぼらんてぃあ", "borantia"),
    ("さーふぃん", "saafin"),
    ("ふぁいる", "fairu"),
]


class RomajiTest(unittest.TestCase):
    def test_generator_matches_the_pack_conventions(self):
        for kana, want in CASES:
            self.assertEqual(want, fixpt.romaji(kana), msg=f"{kana} -> {want}")

    def test_phrase_readings_keep_their_word_break(self):
        self.assertEqual("denwao kakemasu", fixpt.romaji("でんわを かけます"))

    def test_classifier_separates_style_from_defect(self):
        self.assertEqual("agrees", fixpt.classify("kentou", "kentou", "consideration"))
        self.assertEqual("spacing", fixpt.classify("jaa ne", "jaane", "see you"))
        self.assertEqual("long-vowel-collapsed", fixpt.classify("koka", "kouka", "effect"))
        self.assertEqual(
            "gemination-collapsed", fixpt.classify("haken", "hakken", "discovery")
        )
        self.assertEqual(
            "particle-exception", fixpt.classify("konbanwa", "konbanha", "good evening")
        )
        self.assertEqual("english-word", fixpt.classify("app", "appu", "app"))
        self.assertEqual("divergent", fixpt.classify("ukuu", "kiku", "ask"))
        self.assertEqual("kana-unrenderable", fixpt.classify("koka", None, "effect"))

    def test_unrenderable_kana_returns_none_rather_than_guessing(self):
        self.assertIsNone(fixpt.romaji("かいっ"))       # word-final sokuon
        self.assertIsNone(fixpt.romaji("こんー"))        # ー with no vowel to repeat
        self.assertIsNone(fixpt.romaji(""))              # nothing to transliterate

    def test_malformed_detection_matches_the_lint_rule(self):
        for bad in ("kentoう", "ronso2", "jiゅnり", "danbooール", "mainambaa2", "3-nen"):
            self.assertTrue(fixpt.is_malformed(bad), msg=bad)
        # Digits are illegal in a lexicon transliteration but legal in a
        # sentence's romaji ("3-nen shokumu keiken…"); that asymmetry is
        # pinned on the Rust side by sentence_romaji_may_contain_digits.
        for good in ("koukouryoukin", "juuminhyou", "danbooru", "konbanwa"):
            self.assertFalse(fixpt.is_malformed(good), msg=good)

    def test_script_label_expectation(self):
        self.assertEqual("katakana", fixpt.expected_script("マナー"))
        self.assertEqual("hiragana", fixpt.expected_script("まなぶ"))
        self.assertEqual("katakana", fixpt.expected_script("段ボール"))   # mixed form
        self.assertIsNone(fixpt.expected_script("プレーンな"))             # both kana sets

class RepairTest(unittest.TestCase):
    PACK = (
        '{"id": "ja.lex.t.ok", "status": "draft",'
        ' "forms": [{"text": "学校", "script": "kanji", "is_primary": true}],'
        ' "readings": [{"text": "がっこう", "script": "hiragana"},'
        ' {"text": "gakkou", "transliteration_system": "modified-hepburn"}]}\n'
        '{"id": "ja.lex.t.broken", "status": "draft",'
        ' "forms": [{"text": "マナー", "script": "hiragana", "is_primary": true}],'
        ' "readings": [{"text": "マナー", "script": "katakana"},'
        ' {"text": "manaaー", "transliteration_system": "modified-hepburn"}]}\n'
    )

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.shard = self.root / "lexicon" / "t.jsonl"
        self.shard.parent.mkdir()
        self.shard.write_text(self.PACK, encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_repair_rewrites_only_the_offending_strings(self):
        before = self.shard.read_text(encoding="utf-8")
        fixes = fixpt.analyse(self.shard)
        self.assertEqual(
            ["transliteration", "script"], [f["kind"] for f in fixes]
        )
        applied, notes = fixpt.apply_fixes(
            self.shard, fixes, fixpt.pack_spellings([self.shard])
        )
        self.assertEqual([], notes)
        self.assertEqual(2, len(applied))
        after = self.shard.read_text(encoding="utf-8")
        lines = after.splitlines()
        # Untouched row is byte-identical, and the repaired rows keep every
        # other field (id, status, glosses) exactly as written.
        self.assertEqual(before.splitlines()[0], lines[0])
        self.assertIn('"text": "manaa", "transliteration_system"', lines[1])
        self.assertIn('"forms": [{"text": "マナー", "script": "katakana"', lines[1])
        self.assertIn('"id": "ja.lex.t.broken", "status": "draft"', lines[1])
        # Re-running finds nothing left to repair.
        self.assertEqual([], fixpt.analyse(self.shard))

    def test_rival_sibling_spelling_is_reported_not_copied(self):
        """A sibling row is not authority: the same kana covers different words."""
        shard = self.root / "lexicon" / "s.jsonl"
        shard.write_text(
            '{"id": "ja.lex.t.a", "status": "draft",'
            ' "readings": [{"text": "こうか", "script": "hiragana"},'
            ' {"text": "koka", "transliteration_system": "modified-hepburn"}]}\n'
            '{"id": "ja.lex.t.b", "status": "draft",'
            ' "readings": [{"text": "こうか", "script": "hiragana"},'
            ' {"text": "kouか", "transliteration_system": "modified-hepburn"}]}\n',
            encoding="utf-8",
        )
        fixes = fixpt.analyse(shard)
        applied, _ = fixpt.apply_fixes(shard, fixes, fixpt.pack_spellings([shard]))
        self.assertEqual(1, len(applied))
        self.assertEqual("kouka", applied[0]["after"])       # this row's own kana
        self.assertEqual(["koka"], applied[0]["generated_conflict"])

    def test_every_label_for_the_offending_text_is_relabeled(self):
        """One line carries several script fields; only the wrong ones move."""
        shard = self.root / "lexicon" / "m.jsonl"
        shard.write_text(
            '{"id": "ja.lex.t.m", "status": "draft",'
            ' "forms": [{"text": "マイナンバー", "script": "hiragana", "is_primary": true},'
            ' {"text": "番号", "script": "kanji", "is_primary": false}],'
            ' "readings": [{"text": "マイナンバー", "script": "hiragana"},'
            ' {"text": "mainambaa", "transliteration_system": "modified-hepburn"}]}\n',
            encoding="utf-8",
        )
        fixes = fixpt.analyse(shard)
        self.assertEqual(2, len(fixes))
        applied, notes = fixpt.apply_fixes(shard, fixes, fixpt.pack_spellings([shard]))
        self.assertEqual([], notes)
        self.assertEqual(1, len(applied))
        self.assertEqual(2, applied[0]["labels"])   # both slots, one pass
        line = shard.read_text(encoding="utf-8")
        self.assertEqual(0, line.count('"text": "マイナンバー", "script": "hiragana"'))
        self.assertEqual(2, line.count('"text": "マイナンバー", "script": "katakana"'))
        self.assertIn('"text": "番号", "script": "kanji"', line)   # untouched


if __name__ == "__main__":
    unittest.main()
