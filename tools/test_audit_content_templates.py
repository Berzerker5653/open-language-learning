#!/usr/bin/env python3
"""Hermetic tests for tools/audit_content_templates.py.

Fixtures are tiny tempdir packs built inside each test — never the real
languages/** packs.
"""
import argparse
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

# Tests run from the repo root (`python -m unittest
# tools/test_audit_content_templates.py`); the module under test — and
# the measure_language_coverage it imports for the engine runner table —
# live in tools/.
sys.path.insert(0, str(Path(__file__).resolve().parent))

import audit_content_templates as act  # noqa: E402


def opts(**over):
    base = dict(leading_n=1, leading_share=0.15, skeleton_min=2, group_min=2,
                require_band=[])
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


def ts_unit(id_, goal_id, acts, requires=None, seq=None):
    """Unit YAML with activities and an optional task_sequence. acts:
    (id, type, modality, support_level[, content_refs[, scenario_id]]).
    A dict seq renders the block-style mapping; a string seq renders the
    one-line flow mapping the YAML subset turns into a plain string."""
    lines = [f"id: {id_}", f"goal_id: {goal_id}"]
    if requires:
        # block seq at the SAME indent as its key, like the real packs
        lines.append("requires_unit:")
        for ru in requires:
            lines += [f"- unit: {ru}", "  state: introduced"]
    lines.append("activities:")
    for a in acts:
        aid, type_, mod, support = a[:4]
        lines += [
            f"- id: {aid}",
            f"  type: {type_}",
            f"  modality: {mod}",
            f"  support_level: {support}",
        ]
        if len(a) > 4 and a[4]:
            lines.append(f"  content_refs: [{', '.join(a[4])}]")
        if len(a) > 5 and a[5]:
            lines.append(f"  scenario_id: {a[5]}")
    if isinstance(seq, dict):
        lines.append("task_sequence:")
        for role in act.TASK_SEQUENCE_ROLES:
            lines.append(f"  {role}: {seq[role]}")
    elif seq is not None:
        lines.append(f"task_sequence: {seq}")
    return "\n".join(lines) + "\n"


TS_GOAL = "p.goal.a2.one"
TS_SEQ = {
    "input": "p.act.in",
    "scaffolded": "p.act.sc",
    "independent": "p.act.ind",
    "transfer": "p.act.xfer",
    "reuse": "p.act.reuse",
}
HOME_ACTS = [
    ("p.act.in", "encounter-read", "reading", 5),
    ("p.act.sc", "cloze", "writing", 2, ["p.vocab.food"]),
    ("p.act.ind", "recall", "reading", 0),
]
MATCH_HOME_ACTS = [
    ("p.act.in", "encounter-read", "reading", 5),
    ("p.act.sc", "match", "reading", 2, ["p.vocab.food"]),
    ("p.act.ind", "recall", "reading", 0),
]


def ts_fixture(home_seq=None, home_acts=None, xfer_goal=TS_GOAL,
               xfer_acts=None, reuse_requires=("p.a2.seq-home",)):
    """Three a2-band units forming one complete claim unless varied: the
    declaring home unit plus the transfer/reuse units every auxiliary
    unit carries two activity kinds to stay out of the
    no-stage-progression rule's way."""
    return {
        "home": ts_unit(
            "p.a2.seq-home",
            TS_GOAL,
            home_acts or HOME_ACTS,
            seq=TS_SEQ if home_seq is None else home_seq,
        ),
        "xfer": ts_unit(
            "p.a2.seq-xfer",
            xfer_goal,
            xfer_acts
            or [
                ("p.act.xenc", "encounter-read", "reading", 5),
                ("p.act.xfer", "recall", "writing", 0, ["p.vocab.food"]),
            ],
        ),
        "reuse": ts_unit(
            "p.a2.seq-reuse",
            TS_GOAL,
            [
                ("p.act.reuse", "cloze", "writing", 1, ["p.vocab.food"]),
                ("p.act.rind", "recall", "writing", 2),
            ],
            requires=list(reuse_requires),
        ),
    }


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
            for key in ("task_sequence", "task_sequences"):
                self.assertIn(key, p)
            for key in ("task_sequences_declared", "task_sequences_complete"):
                self.assertIn(key, p["counts"])

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


class TaskSequenceRule(unittest.TestCase):
    def audit(self, units, sentences=None, **over):
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, sentences=sentences, units=units)
            return act.audit_pack(pack, opts(**over))

    def test_runner_table_is_the_shared_parser_not_a_literal(self):
        entries, err = act.runner_table()
        self.assertIsNone(err)
        self.assertTrue(entries)
        # the same table the coverage tool parses straight from lib.rs
        self.assertIsNone(act.M.runner_for(entries, "match", "reading"))
        self.assertIsNotNone(
            act.M.runner_for(entries, "encounter-read", "reading")
        )

    def test_block_style_claim_complete_representative_zero_findings(self):
        r = self.audit(ts_fixture(), require_band=["a2"])
        self.assertEqual(r["task_sequence"], [])
        self.assertEqual(r["finding_count"], 0)
        ts = r["task_sequences"]
        self.assertEqual((ts["declared"], ts["complete"]), (1, 1))
        self.assertEqual(ts["by_band"], {"a2": 1})
        self.assertEqual(
            ts["representatives"],
            [
                {
                    "unit": "p.a2.seq-home",
                    "goal": TS_GOAL,
                    "band": "a2",
                    "stages": dict(TS_SEQ),
                }
            ],
        )
        self.assertEqual(r["counts"]["task_sequences_declared"], 1)
        self.assertEqual(r["counts"]["task_sequences_complete"], 1)

    def test_transfer_by_scenario_id_in_own_unit_passes(self):
        acts = [*HOME_ACTS,
                ("p.act.tr", "recall", "writing", 0, None, "p.scenario.cafe")]
        seq = dict(TS_SEQ, transfer="p.act.tr")
        r = self.audit(ts_fixture(home_seq=seq, home_acts=acts))
        self.assertEqual(r["task_sequence"], [])
        self.assertEqual(r["task_sequences"]["complete"], 1)

    def test_unrunnable_stage_match_reading(self):
        r = self.audit(ts_fixture(home_acts=MATCH_HOME_ACTS))
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs], ["task-sequence-unrunnable"])
        f = fs[0]
        self.assertEqual(f["unit"], "p.a2.seq-home")
        self.assertEqual(f["band"], "a2")
        self.assertEqual(
            (f["role"], f["activity"], f["type"], f["modality"]),
            ("scaffolded", "p.act.sc", "match", "reading"),
        )

    def test_no_scaffold_when_independent_carries_support(self):
        acts = [
            ("p.act.in", "encounter-read", "reading", 5),
            ("p.act.sc", "cloze", "writing", 2, ["p.vocab.food"]),
            ("p.act.ind", "recall", "reading", 1),
        ]
        r = self.audit(ts_fixture(home_acts=acts))
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs], ["task-sequence-no-scaffold"])
        self.assertIn("independent support_level '1'", fs[0]["detail"])

    def test_no_context_change_for_same_unit_transfer_without_scenario(self):
        acts = [*HOME_ACTS, ("p.act.tr", "recall", "writing", 0)]
        seq = dict(TS_SEQ, transfer="p.act.tr")
        r = self.audit(ts_fixture(home_seq=seq, home_acts=acts))
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs],
                         ["task-sequence-no-context-change"])
        self.assertIn("no scenario_id", fs[0]["detail"])

    def test_no_reuse_when_prereq_edge_missing(self):
        r = self.audit(ts_fixture(reuse_requires=()))
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs], ["task-sequence-no-reuse"])
        self.assertIn("does not list p.a2.seq-home in requires_unit",
                      fs[0]["detail"])

    def test_incomplete_role_names_unknown_activity(self):
        seq = dict(TS_SEQ, reuse="p.act.nope")
        r = self.audit(ts_fixture(home_seq=seq))
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs], ["task-sequence-incomplete"])
        self.assertIn("unknown activity id p.act.nope", fs[0]["detail"])
        self.assertEqual(
            (r["counts"]["task_sequences_declared"],
             r["counts"]["task_sequences_complete"]),
            (1, 0),
        )

    def test_string_valued_sequence_is_block_mapping_error(self):
        r = self.audit(ts_fixture(home_seq="{ input: p.act.in }"))
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs], ["task-sequence-incomplete"])
        self.assertEqual(fs[0]["detail"], "task_sequence must be a block mapping")
        self.assertEqual(r["task_sequences"]["complete"], 0)

    def test_two_roles_may_not_name_the_same_activity(self):
        seq = dict(TS_SEQ, independent="p.act.sc")
        r = self.audit(ts_fixture(home_seq=seq))
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs], ["task-sequence-incomplete"])
        self.assertIn("name the same activity p.act.sc", fs[0]["detail"])

    def test_duplicate_activity_id_across_units(self):
        xfer_acts = [
            ("p.act.xfer", "encounter-read", "reading", 5),
            ("p.act.xfer", "recall", "writing", 0, ["p.vocab.food"]),
        ]
        r = self.audit(ts_fixture(xfer_acts=xfer_acts))
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs], ["task-sequence-incomplete"])
        self.assertIn("duplicate activity id p.act.xfer", fs[0]["detail"])

    def test_sequence_crossing_goals_is_incomplete(self):
        r = self.audit(ts_fixture(xfer_goal="p.goal.a2.two"))
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs], ["task-sequence-incomplete"])
        self.assertIn("sequence crosses goals", fs[0]["detail"])

    def test_missing_band_reported_once_per_band_case_insensitive(self):
        r = self.audit(ts_fixture(),
                       require_band=["A2", "a2", "b1", "b2", "b1"])
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs],
                         ["task-sequence-missing-band"] * 2)
        self.assertEqual([f["band"] for f in fs], ["b1", "b2"])

    def test_unverifiable_table_skips_runnability_keeps_the_rest(self):
        saved = act._RUNNER_TABLE
        act._RUNNER_TABLE = (None, "injected table drift")
        try:
            r = self.audit(ts_fixture(home_acts=MATCH_HOME_ACTS),
                           sentences=[sent("p.a2.1", "Я иду́."),
                                      sent("p.a2.2", "Я стою́.")],
                           leading_share=0.5)
        finally:
            act._RUNNER_TABLE = saved
        fs = r["task_sequence"]
        self.assertEqual([f["rule"] for f in fs],
                         ["task-sequence-unverifiable"])
        self.assertIn("injected table drift", fs[0]["detail"])
        self.assertEqual(len(r["leading_token"]), 1)
        # with runnability unverifiable the claim itself is complete
        self.assertEqual(r["task_sequences"]["complete"], 1)

    def test_cli_text_report_prints_task_sequences_section(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, units=ts_fixture())
            buf = io.StringIO()
            with redirect_stdout(buf):
                rc = act.main([str(pack)])
            self.assertEqual(rc, 0)
            text = buf.getvalue()
            self.assertIn("Task sequences: declared 1, complete 1", text)
            self.assertIn(
                "band a2: unit p.a2.seq-home (goal p.goal.a2.one): input="
                "p.act.in scaffolded=p.act.sc independent=p.act.ind "
                "transfer=p.act.xfer reuse=p.act.reuse",
                text,
            )
            # defaults a2/b1/b2: only a2 is covered by the representative
            missing = [ln for ln in text.splitlines()
                       if "[task-sequence-missing-band]" in ln]
            self.assertEqual(len(missing), 2)
            self.assertTrue(all("band b1" in ln or "band b2" in ln
                                for ln in missing))

    def test_review_section_gets_task_sequence_groups(self):
        with tempfile.TemporaryDirectory() as tmp:
            pack = make_pack(tmp, units=ts_fixture(home_acts=MATCH_HOME_ACTS))
            out = Path(tmp) / "FINDINGS.md"
            out.write_text("# existing\n", encoding="utf-8")
            with redirect_stdout(io.StringIO()):
                act.main([str(pack), "--write-review", str(out),
                          "--date", "2026-10-18"])
            text = out.read_text(encoding="utf-8")
            self.assertIn("task-sequence-unrunnable — 1 finding(s):", text)
            self.assertIn("type `match`/modality `reading` has no engine "
                          "runner", text)


if __name__ == "__main__":
    unittest.main()
