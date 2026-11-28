#!/usr/bin/env python3
"""Hermetic tests for tools/audit_learner_copy.py.

Fixtures are tiny tempdir source trees built inside each test — never the real
apps/desktop/src tree.
"""
import contextlib
import io
import tempfile
import unittest
from pathlib import Path

import audit_learner_copy as alc

DIRTY = """
export function PaymentPanel() {
  // K-42 keeps the ticket id in the comment, where it belongs.
  const note = "Your card was declined (K-42).";
  return (
    <div data-testid="K-42-panel">
      <p>See ADR-0020 for the rule behind this message.</p>
    </div>
  );
}
"""

CLEAN = """
import { PackText } from "@openlang/ui";

export function PaymentPanel() {
  // K-42: the declined path is the one learners actually hit.
  const note = "Your card was declined. Check the details and try again.";
  return (
    <div data-testid="payment-panel">
      <PackText>Check the details and try again.</PackText>
    </div>
  );
}
"""


def write_tree(root, files):
    for name, text in files.items():
        path = Path(root) / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    return Path(root)


class AuditTests(unittest.TestCase):
    def scan(self, files):
        with tempfile.TemporaryDirectory() as td:
            root = write_tree(td, files)
            return alc.audit_file(next(root.rglob("*.ts*")))

    def test_rendered_string_literal_with_a_ticket_id_is_a_finding(self):
        findings = self.scan({"panel.tsx": DIRTY})
        rendered = [f for f in findings if f["kind"] == "string"]
        self.assertEqual([f["id"] for f in rendered], ["K-42"])
        self.assertIn("card was declined", rendered[0]["text"])
        self.assertEqual(rendered[0]["line"], 4)

    def test_jsx_text_naming_an_adr_is_a_finding(self):
        findings = self.scan({"panel.tsx": DIRTY})
        jsx = [f for f in findings if f["kind"] == "jsx-text"]
        self.assertEqual([f["id"] for f in jsx], ["ADR-0020"])

    def test_a_test_file_is_outside_the_learner_surface(self):
        with tempfile.TemporaryDirectory() as td:
            write_tree(td, {"panel.test.tsx": DIRTY})
            scanned, skipped, found = alc.audit_roots([td])
            self.assertEqual((scanned, skipped), (0, 1))
            self.assertEqual(found, [])
            # the same text in a component is copy, so it is scanned.
            write_tree(td, {"panel.tsx": DIRTY})
            scanned, skipped, found = alc.audit_roots([td])
            self.assertEqual((scanned, skipped), (1, 1))
            self.assertEqual(len(found), 2)

    def test_clean_copy_scans_clean(self):
        self.assertEqual(self.scan({"panel.tsx": CLEAN}), [])

    def test_a_raw_content_token_in_learner_copy_is_a_finding(self):
        # UI-HYGIENE-001 (market audit U13): pack/lexicon tokens must
        # not render as copy, in JSX text or in a string literal.
        source = """
export function ProgressPanel() {
  const note = "You last practised ja.lex.demo.obaasan yesterday.";
  return (
    <p>Recorded detail for ru.sent.b2.</p>
  );
}
"""
        findings = self.scan({"panel.tsx": source})
        ids = sorted(f["id"] for f in findings)
        self.assertEqual(ids, ["ja.lex.demo.obaasan", "ru.sent.b2"])
        kinds = {f["id"]: f["kind"] for f in findings}
        self.assertEqual(kinds["ja.lex.demo.obaasan"], "string")
        self.assertEqual(kinds["ru.sent.b2"], "jsx-text")

    def test_a_token_in_wiring_not_copy_is_not_a_finding(self):
        source = """
export function PlanRow() {
  return (
    <button data-content="ja.lex.demo.obaasan" className="ru.sent.b2-row">
      Listen and type
    </button>
  );
}
"""
        self.assertEqual(self.scan({"row.tsx": source}), [])

    def test_journey_harnesses_are_outside_the_learner_surface(self):
        with tempfile.TemporaryDirectory() as td:
            write_tree(td, {"src/journeys/harness.tsx": DIRTY})
            scanned, skipped, found = alc.audit_roots([td])
            self.assertEqual((scanned, skipped, found), (0, 1, []))

    def test_the_gate_exit_code_follows_the_findings(self):
        with tempfile.TemporaryDirectory() as dirty, tempfile.TemporaryDirectory() as clean:
            write_tree(dirty, {"panel.tsx": DIRTY})
            write_tree(clean, {"panel.tsx": CLEAN})
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                dirty_code = alc.main([dirty])
            self.assertEqual(dirty_code, 1)
            self.assertIn("findings: 2", out.getvalue())
            with contextlib.redirect_stdout(io.StringIO()):
                clean_code = alc.main([clean])
            self.assertEqual(clean_code, 0)


class CopyRuleTests(unittest.TestCase):
    """LETTER-DRILL-TEXT-001 ratchet: un-interpolated drill copy, answer
    hints and engine jargon in learner-visible strings fail the gate."""

    def test_pack_reading_metadata_and_summary_leaks_fail(self):
        with tempfile.TemporaryDirectory() as td:
            write_tree(
                td,
                {
                    "pack/orthography/cyr.jsonl": '{"id":"x.orth.cyr.a","reading":"Letter name: а (a); uppercase.","mnemonic":"fine"}\n',
                    "pack/curriculum/units/010.yaml": 'id: u1\nsummary: "Start here before unit 000. Recognize these printed case pairs, copy the requested case."\n',
                },
            )
            scanned, found = alc.audit_packs(td)
            self.assertGreaterEqual(scanned, 2)
            self.assertEqual(
                {f["kind"] for f in found}, {"pack-reading", "pack-summary"}
            )

    def test_clean_pack_copy_passes(self):
        with tempfile.TemporaryDirectory() as td:
            write_tree(
                td,
                {
                    "pack/orthography/cyr.jsonl": '{"id":"x.orth.cyr.a","reading":"sound a — name а","mnemonic":"Recognize the A-shaped form."}\n',
                    "pack/curriculum/units/010.yaml": 'id: u1\nsummary: "Start here: your first letters. Each letter is one sound."\n',
                },
            )
            _, found = alc.audit_packs(td)
            self.assertEqual(found, [])

    def test_per_case_orthography_entity_ids_fail(self):
        """ORTHO-LETTER-UNITS-001: one entity per letter. A -upper/-lower
        row id is the ghost-duplicate-row bug the owner dogfooded; case
        forms ride on the letter as a forms array, never as entities."""
        with tempfile.TemporaryDirectory() as td:
            write_tree(
                td,
                {
                    "pack/orthography/cyr.jsonl": (
                        '{"id":"x.orth.cyr.a-upper","reading":"sound a","mnemonic":"cap"}\n'
                        '{"id":"x.orth.cyr.a-lower","reading":"sound a","mnemonic":"bowl"}\n'
                        '{"id":"x.orth.cyr.b","reading":"sound b","mnemonic":"stick",'
                        '"forms":[{"symbol":"\u0411","case":"upper"},{"symbol":"\u0431","case":"lower"}]}\n'
                    ),
                },
            )
            _, found = alc.audit_packs(td)
            split = [f for f in found if f["kind"] == "pack-case-split"]
            self.assertEqual(len(split), 2, found)

    def test_answer_hint_and_jargon_copy_fail(self):
        src = (
            "export function P({ x }: { x: string }) {\n"
            "  const v = `Not quite — the answer is \"${x}\"`;\n"
            "  const s = \"Served by the typed runner.\";\n"
            "  return <p>{v}{s}</p>;\n"
            "}\n"
        )
        with tempfile.TemporaryDirectory() as td:
            write_tree(td, {"panel.tsx": src})
            _, _, found = alc.audit_roots([td])
            self.assertEqual(len(found), 2)
            self.assertEqual({f["kind"] for f in found}, {"copy"})

    def test_wiring_tokens_are_not_copy_findings(self):
        src = 'const COPY = {"no-runner": "that skill is not available yet"};\nexport const C = COPY;\n'
        with tempfile.TemporaryDirectory() as td:
            write_tree(td, {"panel.tsx": src})
            _, _, found = alc.audit_roots([td])
            self.assertEqual(found, [])


    def test_interpolation_failure_dogfood_strings_red(self):
        """LETTER-UNIT-MODEL-001: the exact copy from
        state/evidence/DOGFOOD-2026-11-21/ (complaint-01 drill rows,
        complaint-04 case-quiz options/hint) fails the audit."""
        with tempfile.TemporaryDirectory() as td:
            write_tree(
                td,
                {
                    "pack/orthography/cyr.jsonl": (
                        '{"id":"x.orth.cyr.a-upper","reading":"Letter name: \u0430 (a); uppercase.","mnemonic":"ok"}\n'
                        '{"id":"x.orth.cyr.a-lower","reading":"Letter name: \u0430 (a); lowercase.","mnemonic":"ok"}\n'
                        '{"id":"x.orth.cyr.b-lower","reading":"Lowercase:","mnemonic":"ok"}\n'
                        '{"id":"x.orth.cyr.c","reading":"fine","mnemonic":"h: find guide"}\n'
                    ),
                    "panel.tsx": (
                        "export const HINT = 'Not quite \u2014 the answer is \"Letter name: \u0430 (a); uppercase.\"';\n"
                        "export const C = 'appearance';\n"
                    ),
                },
            )
            scanned, found = alc.audit_packs(td)
            kinds = [f["kind"] for f in found]
            # three bad readings (two property rows, one stray-colon
            # interpolation) plus the debug mnemonic all land.
            self.assertEqual(kinds.count("pack-reading"), 3)
            self.assertEqual(kinds.count("pack-mnemonic"), 1)
            _, _, src_found = alc.audit_roots([td])
            self.assertEqual(len(src_found), 2)


class LocaleRulesTests(unittest.TestCase):
    """SESSION-FLOW-COPY-001 + RU-REPUBLISH-046-001 ratchets: en-US is the
    documented copy standard, and internal unit ids never reach learners."""

    def test_british_spelling_in_source_string_fails(self):
        src = (
            "export function P() {\n"
            '  return <button>{"Start practising"}</button>;\n'
            "}\n"
        )
        with tempfile.TemporaryDirectory() as td:
            write_tree(td, {"app/src/x.tsx": src})
            _, _, found = alc.audit_roots([td])
            self.assertEqual([f["kind"] for f in found], ["locale-uk"])
            self.assertEqual(found[0]["id"], "practising")

    def test_british_spelling_in_jsx_text_fails(self):
        src = (
            "export function P() {\n"
            "  return <h2>Recognise the script</h2>;\n"
            "}\n"
        )
        with tempfile.TemporaryDirectory() as td:
            write_tree(td, {"app/src/x.tsx": src})
            _, _, found = alc.audit_roots([td])
            self.assertEqual([f["kind"] for f in found], ["locale-uk"])

    def test_us_spelling_is_clean(self):
        src = (
            "export function P() {\n"
            '  const a = "Start practicing";\n'
            "  return <h2>Recognize the script · Unlabeled · The color</h2>;\n"
            "}\n"
        )
        with tempfile.TemporaryDirectory() as td:
            write_tree(td, {"app/src/x.tsx": src})
            _, _, found = alc.audit_roots([td])
            self.assertEqual(found, [])

    def test_unit_id_leak_in_source_and_pack_copy_fails(self):
        src = (
            "export function P() {\n"
            '  const a = "Start with unit 010-cyrillic-a-o-m-t";\n'
            "  return null;\n"
            "}\n"
        )
        with tempfile.TemporaryDirectory() as td:
            write_tree(
                td,
                {
                    "app/src/x.tsx": src,
                    "pack/curriculum/units/010-a.yaml": (
                        "id: u-010\ntitle: Unit 000 basics\n"
                        "summary: Meet letters, then recognise them.\n"
                    ),
                    "pack/lexicon/w.jsonl": (
                        '{"id":"x.lex.w.a","glosses":{"en-US":["colour; flower"]}}\n'
                    ),
                },
            )
            _, _, src_found = alc.audit_roots([td])
            self.assertEqual([f["kind"] for f in src_found], ["unit-id-leak"])
            scanned, found = alc.audit_packs(str(Path(td) / "pack"))
            kinds = {f["kind"]: f["id"] for f in found}
            self.assertEqual(kinds.get("pack-title"), "Unit 000")
            self.assertEqual(kinds.get("pack-summary"), "recognise")
            self.assertEqual(kinds.get("pack-gloss"), "colour")


class GoalsScrubTests(unittest.TestCase):
    """RU-GOALS-SCRUB-001 ratchet: the goals layer and assessment rubrics
    render live (Next-up panel, mastery criteria); case-framed letter copy
    fails the gate. Bare 'case' is NOT banned — 'Weigh the case aloud' is
    legitimate argumentation copy."""

    def test_case_framed_goal_description_and_rubric_fail(self):
        with tempfile.TemporaryDirectory() as td:
            write_tree(
                td,
                {
                    "pack/curriculum/goals.yaml": (
                        "goals:\n"
                        "- id: x.goal.cyr\n"
                        "  description: Recognize and copy all printed Cyrillic"
                        " letter case forms and interpret the teaching stress mark.\n"
                        "- id: x.goal.greet\n"
                        "  description: Read and write taught greetings.\n"
                    ),
                    "pack/assessments/definitions.jsonl": (
                        '{"id":"x.assess.rec","rubric":{"criteria":['
                        '"Recognize all 33 printed uppercase/lowercase pairs '
                        'from letter-name prompts.",'
                        '"Weigh the case aloud with a taught chunk.",'
                        '"Copy each of the 66 printed letter forms with the '
                        'requested case."]}}\n'
                    ),
                },
            )
            _, found = alc.audit_packs(str(Path(td) / "pack"))
            goals = [f for f in found if f["kind"] == "pack-goal"]
            rubrics = [f for f in found if f["kind"] == "pack-rubric"]
            self.assertEqual([f["id"].lower() for f in goals], ["letter case"])
            self.assertEqual(
                sorted(f["id"].lower() for f in rubrics),
                ["letter forms", "uppercase"],
            )

    def test_scrubbed_goal_copy_and_bare_case_pass(self):
        with tempfile.TemporaryDirectory() as td:
            write_tree(
                td,
                {
                    "pack/curriculum/goals.yaml": (
                        "goals:\n"
                        "- id: x.goal.cyr\n"
                        "  description: Recognize and copy every printed Cyrillic"
                        " letter, one sound per letter, and interpret the teaching"
                        " stress mark.\n"
                    ),
                    "pack/assessments/definitions.jsonl": (
                        '{"id":"x.assess.spk","rubric":{"criteria":['
                        '"Weigh the case aloud with a taught chunk."]}}\n'
                    ),
                    "pack/curriculum/units/019.yaml": (
                        "id: u19\n"
                        "summary: Review every taught letter with its sound.\n"
                    ),
                },
            )
            _, found = alc.audit_packs(str(Path(td) / "pack"))
            self.assertEqual(found, [])


class WireSlugTests(unittest.TestCase):
    """FIX-M1-PATH-VIS-001 (LEARNER-REVIEW-M1-001 D-006): internal enum slugs
    (`weak-skill`, `due-review`, `acc.pl`) must stay off the learner surface."""

    def scan_src(self, src):
        with tempfile.TemporaryDirectory() as td:
            write_tree(td, {"app/src/x.tsx": src})
            _, _, found = alc.audit_roots([td])
            return found

    def test_string_cast_of_a_wire_field_fails(self):
        src = (
            "export function P({ item }: any) {\n"
            '  const shown = String(item.reason);\n'
            "  return <p>{shown}</p>;\n"
            "}\n"
        )
        found = [f for f in self.scan_src(src) if f["kind"] == "wire-slug"]
        self.assertEqual([f["id"] for f in found], ["String(wire field)"])

    def test_bare_wire_field_in_jsx_text_fails(self):
        src = (
            "export function P({ status }: any) {\n"
            "  return <small>{status.reason} — nothing was stored.</small>;\n"
            "}\n"
        )
        found = [f for f in self.scan_src(src) if f["kind"] == "wire-slug"]
        self.assertEqual([f["id"] for f in found], ["status.reason"])

    def test_lookup_into_a_label_map_is_the_allowed_shape(self):
        src = (
            "const REASON_LABELS: Record<string, string> = {\n"
            '  "due-review": "Due for review",\n'
            "};\n"
            "export function P({ item }: any) {\n"
            "  return <span>{REASON_LABELS[item.reason]}</span>;\n"
            "}\n"
        )
        self.assertEqual(self.scan_src(src), [])

    def test_a_wire_comparison_is_not_an_interpolation(self):
        src = (
            "export function P({ item }: any) {\n"
            "  return <span>{item.reason === \"due-review\" ? \"Due\" : \"New\"}</span>;\n"
            "}\n"
        )
        self.assertEqual(self.scan_src(src), [])

    def test_enum_slug_rendered_as_jsx_text_fails(self):
        src = (
            "export function P() {\n"
            "  return <p>Ranked by weak-skill today.</p>;\n"
            "}\n"
        )
        found = [f for f in self.scan_src(src) if f["kind"] == "wire-slug"]
        self.assertEqual([f["id"] for f in found], ["weak-skill"])


if __name__ == "__main__":
    unittest.main()
