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
        # UI-HYGIENE-001 (visual-ui-audit U13): pack/lexicon tokens must
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


if __name__ == "__main__":
    unittest.main()
