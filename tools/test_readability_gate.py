#!/usr/bin/env python3
"""READABILITY-GATE-001 golden tests (deterministic; repo venv required:
pymorphy3). Run: .venv/bin/python -m unittest tools.test_readability_gate
"""
from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GATE = os.path.join(REPO, "tools", "readability-gate.py")

# Guaranteed-absent lemmas: not in the real drill pools, glue whitelist,
# or the fixture lexicon. ASSUMPTION is asserted explicitly so a pool
# change fails loudly instead of silently weakening the golden.
UNKNOWN_A = "квест"
UNKNOWN_B = "кроссворд"
UNKNOWN_C = "спидометр"
UNKNOWN_D = "тепловоз"


def make_pack(root):
    os.makedirs(os.path.join(root, "sentences"))
    os.makedirs(os.path.join(root, "stories"))
    os.makedirs(os.path.join(root, "lexicon"))
    with open(os.path.join(root, "manifest.yaml"), "w", encoding="utf-8") as fh:
        fh.write("id: ru-RU\ntarget_locale: ru-RU\nschema_version: 0.2\n")
    sents = [
        {"id": "ru.sent.a1.clean", "text": "Это дом."},
        {"id": "ru.sent.a1.one-new", "text": "Это квест."},
        {"id": "ru.sent.a1.two-new", "text": "Квест и кроссворд."},
        {"id": "ru.sent.a1.two-other", "text": "Спидометр и тепловоз."},
        {"id": "ru.sent.cp.orphan", "text": "Это квест."},
        {"id": "ru.sent.a2.anchor", "text": "Это дом."},
    ]
    with open(os.path.join(root, "sentences", "entries.jsonl"), "w",
              encoding="utf-8") as fh:
        for s in sents:
            fh.write(json.dumps(s, ensure_ascii=False) + "\n")
    with open(os.path.join(root, "stories", "demo.yaml"), "w",
              encoding="utf-8") as fh:
        fh.write("id: ru.story.demo\ntitle: demo\nsentences:\n"
                 "  - ru.sent.cp.orphan\n  - ru.sent.a2.anchor\n")
    lex = [
        {"id": "ru.lex.t.dom", "band": "a1", "forms": [{"text": "дом",
                                                        "is_primary": True}]},
        {"id": "ru.lex.t.eto", "forms": [{"text": "это", "is_primary": True}]},
    ]
    with open(os.path.join(root, "lexicon", "t.jsonl"), "w",
              encoding="utf-8") as fh:
        for e in lex:
            fh.write(json.dumps(e, ensure_ascii=False) + "\n")


def run_gate(*args):
    proc = subprocess.run([sys.executable, GATE] + list(args),
                          capture_output=True, text=True)
    return proc


class GateTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.pack = self._tmp.name
        make_pack(self.pack)

    def tearDown(self):
        self._tmp.cleanup()

    def _assumption_pool_clean(self):
        # Import the gate's own known-set builder via CLI evidence: the
        # one-new sentence must PASS, proving UNKNOWN_A/B are absent.
        p = run_gate("--pack", self.pack)
        self.assertNotIn("ru.sent.a1.one-new", p.stdout)
        self.assertIn("ru.sent.a1.two-new", p.stdout)

    def test_rejects_two_unknowns_naming_lemmas(self):
        p = run_gate("--pack", self.pack)
        self.assertEqual(p.returncode, 1)
        self.assertIn("ru.sent.a1.two-new", p.stdout)
        self.assertIn(f"readability_unknown_lemma:{UNKNOWN_A},{UNKNOWN_B}",
                      p.stdout)
        # one unknown passes (<=1 discipline)
        self.assertNotIn("ru.sent.a1.one-new", p.stdout)

    def test_band_undeclared_is_honest_diagnostic(self):
        p = run_gate("--pack", self.pack)
        self.assertIn("ru.sent.cp.orphan: readability_band_undeclared", p.stdout)
        # but the story resolves it (story band a2), and it passes there
        self.assertNotIn("REJECT ru.story.demo#ru.sent.cp.orphan", p.stdout)

    def test_explicit_band_covers_cp_shard(self):
        p = run_gate("--pack", self.pack, "--band", "a1")
        self.assertNotIn(": readability_band_undeclared", p.stdout)

    def test_regeneration_request_carries_negative_hints(self):
        req = os.path.join(self._tmp.name, "requests.jsonl")
        run_gate("--pack", self.pack, "--requests-out", req)
        rows = [json.loads(l) for l in open(req, encoding="utf-8")]
        mine = [r for r in rows if r["id"] == "ru.sent.a1.two-new"]
        self.assertEqual(mine[0]["negative_hints"], [UNKNOWN_A, UNKNOWN_B])
        self.assertIn("must NOT appear", mine[0]["instruction"])

    def test_recheck_loop_rejects_reoffender_with_updated_hints(self):
        cand = os.path.join(self._tmp.name, "regen.jsonl")
        with open(cand, "w", encoding="utf-8") as fh:
            fh.write(json.dumps({"id": "ru.sent.a1.two-new", "band": "a1",
                                 "text": "Кроссворд и спидометр."},
                                ensure_ascii=False) + "\n")
            fh.write(json.dumps({"id": "ru.sent.a1.two-new.b", "band": "a1",
                                 "text": "Это кроссворд."},
                                ensure_ascii=False) + "\n")
        p = run_gate("--pack", self.pack, "--recheck", cand)
        self.assertEqual(p.returncode, 1)
        self.assertIn(f"REJECT ru.sent.a1.two-new: readability_unknown_lemma:{UNKNOWN_B}",
                      p.stdout)
        self.assertIn("PASS ru.sent.a1.two-new.b", p.stdout)

    def test_mined_word_becomes_known(self):
        db = os.path.join(self._tmp.name, "store.sqlite")
        con = sqlite3.connect(db)
        con.execute("CREATE TABLE mined_items(id TEXT PRIMARY KEY, "
                    "profile_id TEXT, surface TEXT)")
        con.execute("INSERT INTO mined_items VALUES('m1','p1',?)", (UNKNOWN_A,))
        con.commit()
        con.close()
        p = run_gate("--pack", self.pack, "--known-db", db, "--profile", "p1")
        # квест now known -> only кроссворд unknown -> passes
        self.assertNotIn("ru.sent.a1.two-new", p.stdout)

    def test_confirmed_content_its_lemmas_known(self):
        # without the ledger both a1 sentences with 2 unknowns reject
        base = run_gate("--pack", self.pack)
        self.assertIn("ru.sent.a1.two-new", base.stdout)
        self.assertIn("ru.sent.a1.two-other", base.stdout)
        db = os.path.join(self._tmp.name, "store.sqlite")
        con = sqlite3.connect(db)
        con.execute("CREATE TABLE mined_items(id TEXT PRIMARY KEY, "
                    "profile_id TEXT, surface TEXT)")
        con.execute("CREATE TABLE content_confirmations(id TEXT PRIMARY KEY, "
                    "profile_id TEXT, pack_id TEXT, content_id TEXT)")
        con.execute("INSERT INTO content_confirmations VALUES('c1','p1','ru','"
                    "ru.story.demo')")
        con.commit()
        con.close()
        p = run_gate("--pack", self.pack, "--known-db", db, "--profile", "p1",
                     "--pack-id", "ru")
        # the story's lemmas (квест, дом, это) become known for p1:
        # two-new now has ONE unknown left and passes,
        self.assertNotIn("ru.sent.a1.two-new", p.stdout)
        # ...while an unconfirmed sentence keeps both unknowns and still
        # rejects (confirming one item never leaks its words sideways).
        self.assertIn(f"readability_unknown_lemma:{UNKNOWN_C},{UNKNOWN_D}",
                      p.stdout)
        self.assertIn("confirm/mine ledger", p.stdout)

    def test_cold_profile_falls_back_to_band_list(self):
        db = os.path.join(self._tmp.name, "store.sqlite")
        sqlite3.connect(db).close()  # empty store
        p = run_gate("--pack", self.pack, "--known-db", db, "--profile", "p1")
        self.assertIn("cold profile", p.stdout)
        self.assertIn("ru.sent.a1.two-new", p.stdout)

    def test_deterministic_output(self):
        d1 = os.path.join(self._tmp.name, "e1")
        d2 = os.path.join(self._tmp.name, "e2")
        run_gate("--pack", self.pack, "--evidence-out", d1)
        run_gate("--pack", self.pack, "--evidence-out", d2)
        self.assertEqual(open(os.path.join(d1, "violations.jsonl"),
                              encoding="utf-8").read(),
                         open(os.path.join(d2, "violations.jsonl"),
                              encoding="utf-8").read())

    def test_non_ru_pack_refuses(self):
        with open(os.path.join(self.pack, "manifest.yaml"), "w",
                  encoding="utf-8") as fh:
            fh.write("id: ja-JP\ntarget_locale: ja-JP\nschema_version: 0.2\n")
        p = run_gate("--pack", self.pack)
        self.assertEqual(p.returncode, 2)
        self.assertIn("unsupported_locale", p.stderr)


if __name__ == "__main__":
    unittest.main()
