#!/usr/bin/env python3
"""Hermetic tests for tools/audit_content_templates.py.

Fixtures are tiny tempdir packs built inside each test — never the real
languages/** packs.
"""
import argparse
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

import audit_content_templates as act


def opts(**over):
    base = dict(leading_n=1, leading_share=0.15, skeleton_min=2, group_min=2)
    base.update(over)
    return argparse.Namespace(**base)


def make_pack(root, sentences=None, units=None, goals=None):
    pack = Path(root)
    if sentences is not None:
        d = pack / "sentences"
        d.mkdir(parents=True, exist_ok=True)
        (d / "entries.jsonl").write_text(
            "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in sentences),
            encoding="utf-8",
        )
    if units is not None:
        d = pack / "curriculum" / "units"
        d.mkdir(parents=True, exist_ok=True)
        for name, text in units.items():
            (d / f"{name}.yaml").write_text(text, encoding="utf-8")
    if goals is not None:
        (pack / "curriculum" / "goals.yaml").write_text(goals, encoding="utf-8")
    return pack


def sent(id_, text, **extra):
    row = {"id": id_, "text": text}
    row.update(extra)
    return row


def unit(id_, goal_id, grammar, types, extra_refs=None):
    lines = [
        f"id: {id_}",
        f"goal_id: {goal_id}",
        "generation_contract:",
        f"  allowed_grammar: {('[' + ', '.join(grammar) + ']') if grammar else '[]'}",
        "activities:",
    ]
    for n, t in enumerate(types):
        lines += [
            f"- id: {id_}.act{n}",
            f"  type: {t}",
            f"  modality: reading",
            "  support_level: 2",
        ]
        if extra_refs:
            # exercise the multi-line flow-sequence form the real ru units use
            lines.append("  content_refs:")
            lines.append("    [")
            for r in extra_refs:
                lines.append(f'      "{r}",')
            lines.append("    ]")
    return "\n".join(lines) + "\n"


class LeadingTokenRule(unittest.TestCase):
    ROWS = [
        sent("p.x.1", "Я учу́ ру́сский."),
        sent("p.x.2", "Я встаю́ у́тром."),
        sent("p.x.3", "Она́ чита́ет."),
        sent("p.x.4", "Мы еди́м."),
    ]

    def test_fires_at_and_above_threshold(self):
        # 2/4 = 0.5 -> fires at share 0.5 and above it (0.5 exact), not at 0.51.
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, sentences=self.ROWS)
            r = act.audit_pack(pack, opts(leading_share=0.5))
            self.assertEqual(len(r["leading_token"]), 1)
            f = r["leading_token"][0]
            self.assertEqual((f["prefix"], f["count"], f["sentences"]), ("я", 2, 4))
            self.assertAlmostEqual(f["share"], 0.5)
            r = act.audit_pack(pack, opts(leading_share=0.51))
            self.assertEqual(r["leading_token"], [])

    def test_does_not_fire_below_threshold(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, sentences=[sent("p.x.1", "Я иду́."), *self.ROWS[2:]])
            r = act.audit_pack(pack, opts(leading_share=0.5))
            self.assertEqual(r["leading_token"], [])


class SkeletonRule(unittest.TestCase):
    def test_repeated_skeleton_grouped_by_band(self):
        rows = [
            sent("p.a2.1", "Я пью́ чай."),
            sent("p.a2.2", "Я пью́ кофе́."),
            sent("p.a2.3", "Она́ ест суп."),
            sent("p.b1.1", "Мы пишем письмо."),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, sentences=rows)
            r = act.audit_pack(pack, opts())
            a2 = [f for f in r["skeleton"] if f["band"] == "a2"]
            self.assertIn("я _ _", [f["skeleton"] for f in a2])  # "я" kept, content slotted
            self.assertTrue(all(f["count"] >= 2 for f in a2))

    def test_romaji_fallback_for_unspaced_text(self):
        rows = [
            sent("p.a2.1", "コーヒーをのみます。", romaji="koohii wo nomimasu"),
            sent("p.a2.2", "みずをのみます。", romaji="mizu wo nomimasu"),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, sentences=rows)
            r = act.audit_pack(pack, opts())
            skels = [f["skeleton"] for f in r["skeleton"]]
            self.assertIn("_ wo _", skels)


class GrammarSetRule(unittest.TestCase):
    GOALS = (
        "goals:\n"
        "- id: ja.goal.a2.one\n  band: A2\n"
        "- id: ja.goal.a2.two\n  band: A2\n"
        "- id: ja.goal.b1.three\n  band: B1\n"
    )

    def test_reports_largest_identical_set_and_band(self):
        units = {
            "u1": unit("ja.unit.u1", "ja.goal.a2.one",
                       ["ja.grammar.a", "ja.grammar.b", "ja.grammar.c"],
                       ["cloze"]),
            "u2": unit("ja.unit.u2", "ja.goal.a2.two",
                       ["ja.grammar.a", "ja.grammar.b", "ja.grammar.c"],
                       ["cloze"]),
            "u3": unit("ja.unit.u3", "ja.goal.b1.three",
                       ["ja.grammar.a", "ja.grammar.b"],
                       ["cloze"]),
        }
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, units=units, goals=self.GOALS)
            r = act.audit_pack(pack, opts())
            self.assertEqual(len(r["grammar_sets"]), 1)
            f = r["grammar_sets"][0]
            self.assertEqual(f["band"], "a2")
            self.assertEqual(f["set_size"], 3)
            self.assertEqual(f["units"], ["ja.unit.u1", "ja.unit.u2"])

    def test_empty_sets_are_not_findings(self):
        units = {
            "u1": unit("ja.unit.u1", "ja.goal.a2.one", [], ["cloze"]),
            "u2": unit("ja.unit.u2", "ja.goal.a2.two", [], ["cloze"]),
        }
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, units=units, goals=self.GOALS)
            r = act.audit_pack(pack, opts())
            self.assertEqual(r["grammar_sets"], [])


class StageKindRule(unittest.TestCase):
    def test_single_kind_fires_staged_does_not(self):
        units = {
            "flat": unit("p.unit.flat", "p.goal.g1", [],
                         ["encounter-read", "cloze", "cloze"]),
            "staged": unit("p.unit.staged", "p.goal.g1", [],
                           ["encounter-read", "cloze", "scenario"]),
        }
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, units=units)
            r = act.audit_pack(pack, opts())
            ids = [f["unit"] for f in r["stage_kinds"]]
            self.assertEqual(ids, ["p.unit.flat"])
            self.assertEqual(r["stage_kinds"][0]["stage_kinds"], ["scaffolded"])
            self.assertIn("progression", r["stage_kinds"][0]["detail"])


class CliAndRobustness(unittest.TestCase):
    def test_json_shape(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, sentences=[sent("p.a2.1", "Я иду́.")])
            buf = io.StringIO()
            with redirect_stdout(buf):
                rc = act.main([str(pack), "--json"])
            self.assertEqual(rc, 0)
            doc = json.loads(buf.getvalue())
            self.assertEqual(doc["tool"], "audit_content_templates")
            self.assertIn("disclaimer", doc)
            self.assertEqual(len(doc["packs"]), 1)
            p = doc["packs"][0]
            for key in ("counts", "leading_token", "skeleton", "grammar_sets",
                        "stage_kinds", "finding_count"):
                self.assertIn(key, p)

    def test_missing_optional_dirs_no_crash(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp)  # empty pack: no sentences/, no curriculum/
            r = act.audit_pack(pack, opts())
            self.assertEqual(r["counts"]["sentences"], 0)
            self.assertEqual(r["counts"]["units"], 0)
            self.assertEqual(r["finding_count"], 0)
            self.assertEqual(act.main([tmp]), 0)

    def test_fail_on_findings_only_with_flag(self):
        rows = [sent("p.a2.1", "Я иду́."), sent("p.a2.2", "Я стою́.")]
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, sentences=rows)
            with redirect_stdout(io.StringIO()):
                self.assertEqual(act.main([str(pack)]), 0)
                self.assertEqual(act.main([str(pack), "--fail-on-findings",
                                           "--leading-share", "0.5"]), 1)

    def test_write_review_appends_section(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, sentences=[sent("p.a2.1", "Я иду́."),
                                             sent("p.a2.2", "Я стою́.")])
            out = Path(tmp) / "FINDINGS.md"
            out.write_text("# existing\n", encoding="utf-8")
            with redirect_stdout(io.StringIO()):
                act.main([str(pack), "--write-review", str(out),
                          "--date", "2026-10-14", "--leading-share", "0.5"])
            text = out.read_text(encoding="utf-8")
            self.assertTrue(text.startswith("# existing"))
            self.assertIn("Content-template repetition audit (2026-10-14)", text)
            self.assertIn("needs calibrated human review", text)
            self.assertNotIn("CEFR level of this pack is", text)


if __name__ == "__main__":
    unittest.main()
