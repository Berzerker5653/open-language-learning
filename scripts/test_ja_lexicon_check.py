"""FIX-M1-CONTENT-JA-001: gate tests for scripts/check_ja_lexicon.py.

Runs the checker against the real ja-JP pack (ratchet: zero hard violations,
allow-list may only shrink — an entry that no longer violates is itself a
failure until the list is edited in the same change), and unit-tests the
rules on synthetic rows reproducing the D-009 defect class.
"""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_ja_lexicon as chk  # noqa: E402

PACK = Path(__file__).resolve().parent.parent / "languages/ja-JP"


def make_row(rid, pos="verb-masu", form="かえります", reading="かえります", romaji="kaerimasu"):
    return {
        "id": rid,
        "part_of_speech": pos,
        "forms": [{"text": form, "script": "hiragana", "is_primary": True}],
        "readings": [
            {"text": reading, "script": "hiragana"},
            {"text": romaji, "transliteration_system": "modified-hepburn"},
        ],
        "glosses": {"en-US": ["to go back"]},
    }


class PackRatchet(unittest.TestCase):
    def test_no_hard_violations(self):
        hard, all_v, _ = chk.check(PACK)
        self.assertEqual(hard, [], "ja-JP verb-card integrity violations")

    def test_allowlist_is_exactly_the_known_set(self):
        _, all_v, _ = chk.check(PACK)
        seen = {v.split()[0] for v in all_v}
        self.assertEqual(seen, set(chk.ALLOW),
                         "allow-list drifted: fix rows and shrink ALLOW, never add silently")

    def test_pinned_d009_rows_are_fixed(self):
        rows = {r["id"]: r for _, _, r in chk.iter_rows(PACK)}
        for rid, form, romaji in [
            ("ja.lex.verbs.kaerimasu", "かえります", "kaerimasu"),
            ("ja.lex.verbs.arukimasu", "あるきます", "arukimasu"),
            ("ja.lex.verbs.nemasu", "ねます", "nemasu"),
        ]:
            r = rows[rid]
            primary = next(f["text"] for f in r["forms"] if f.get("is_primary"))
            readings = [x["text"] for x in r["readings"]]
            self.assertEqual(primary, form, rid)
            self.assertIn(romaji, readings, rid)


class RuleUnitCases(unittest.TestCase):
    def run_row(self, row):
        with tempfile.TemporaryDirectory() as d:
            pack = Path(d)
            (pack / "lexicon").mkdir()
            (pack / "lexicon" / "t.jsonl").write_text(
                json.dumps(row, ensure_ascii=False) + "\n", encoding="utf-8")
            hard, _, _ = chk.check(pack)
            return hard

    def test_d009_shape_rejected(self):
        # exactly the shipped defect: slug kaerimasu, wrong word kaerizaku
        self.assertTrue(self.run_row(make_row(
            "ja.lex.verbs.kaerimasu", form="かえりざく", reading="かえりざく", romaji="kaerizaku")))

    def test_compound_verb_gloss_mismatch_rejected(self):
        # あるきだす under slug arukimasu (the second pinned defect)
        self.assertTrue(self.run_row(make_row(
            "ja.lex.verbs.arukimasu", form="あるきだす", reading="あるきだす", romaji="arukidasu")))

    def test_form_reading_drift_rejected(self):
        self.assertTrue(self.run_row(make_row(
            "ja.lex.x.test", form="ねかす", reading="ねます", romaji="nemasu")))

    def test_fixed_rows_accepted(self):
        self.assertEqual(self.run_row(make_row("ja.lex.verbs.kaerimasu")), [])
        ichidan = make_row("ja.lex.t.hanashimasu", form="はなす", reading="はなす", romaji="hanasu")
        self.assertEqual(self.run_row(ichidan), [])

    def test_masu_surface_accepted(self):
        row = make_row("ja.lex.verbs.nemasu", form="ねます", reading="ねます", romaji="nemasu")
        self.assertEqual(self.run_row(row), [])


if __name__ == "__main__":
    unittest.main()
