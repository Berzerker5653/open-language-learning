#!/usr/bin/env python3
"""Golden-form tests for scripts/build-morphology-table.py (READER-FLOW-001 Lane E).

The card names them: norm-token normalization (stress removal, case,
attached punctuation), хле́ба -> хлеб resolution, refusal of tokens the
dictionary does not attest, and deterministic byte-order sorting. Pure
pymorphy3 decisions — no network, no cargo.

Run: python3 scripts/test_build_morphology_table.py   (repo .venv has the
pinned pymorphy3==2.0.6 / pymorphy3-dicts-ru==2.4.417150.4580142)
"""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

import pymorphy3

_spec = importlib.util.spec_from_file_location(
    "build_morphology_table", Path(__file__).with_name("build-morphology-table.py")
)
bmt = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bmt)

MORPH = pymorphy3.MorphAnalyzer()


class NormToken(unittest.TestCase):
    """norm-token: remove U+0301, lowercase, strip outer non-letters, NFC."""

    def test_stress_and_attached_punctuation_are_stripped(self):
        self.assertEqual(bmt.norm_token("хле́ба,"), "хлеба")
        self.assertEqual(bmt.norm_token("«Ведь»"), "ведь")

    def test_capitalized_initials_lowercase(self):
        self.assertEqual(bmt.norm_token("Хлеб"), "хлеб")

    def test_punctuation_only_keys_collapse_to_empty(self):
        self.assertEqual(bmt.norm_token("—"), "")
        self.assertEqual(bmt.norm_token("..."), "")

    def test_digits_are_stripped_but_letters_kept(self):
        self.assertEqual(bmt.norm_token("3дом9"), "дом")


class LemmaRows(unittest.TestCase):
    def test_inflected_form_resolves_to_its_lemma(self):
        row = bmt.row_for(MORPH, "хлеба")
        self.assertIsNotNone(row)
        self.assertEqual(row["lemma"], "хлеб")
        self.assertEqual(row["surface"], "хлеба")
        # tag is pymorphy3's grammeme string verbatim: it must carry the
        # noun/case/number grammemes the reader's card line needs.
        for g in ("NOUN", "gent", "sing"):
            self.assertIn(g, row["tag"])

    def test_verb_form_resolves_with_aspect(self):
        row = bmt.row_for(MORPH, "читал")
        self.assertEqual(row["lemma"], "читать")
        self.assertIn("VERB", row["tag"])

    def test_tokens_not_in_the_dictionary_get_no_row(self):
        # pymorphy's predictive model tags "щзщщж"; the build refuses
        # non-dictionary parses (same gate as build-grammar-labels.py).
        self.assertIsNone(bmt.row_for(MORPH, "щзщщж"))


class TableBuild(unittest.TestCase):
    def test_rows_are_unique_per_norm_token_key(self):
        rows = bmt.build_rows(
            MORPH, ["Хле́ба было мало.", "Хлеба — это еда.", "ХЛЕБ свежий."]
        )
        surfaces = [r["surface"] for r in rows]
        self.assertEqual(surfaces.count("хлеб"), 1)
        self.assertEqual(surfaces.count("хлеба"), 1)

    def test_rows_sort_in_byte_order_over_the_key(self):
        rows = bmt.build_rows(MORPH, ["я ем хлеб", "было мало", "хлеба нет"])
        surfaces = [r["surface"] for r in rows]
        self.assertEqual(surfaces, sorted(surfaces, key=lambda s: s.encode("utf-8")))
        # Cyrillic code-point order sanity: было < хлеб < я.
        self.assertLess(
            "было".encode("utf-8"), "хлеб".encode("utf-8")
        )

    def test_punctuation_only_and_unattested_tokens_produce_nothing(self):
        self.assertEqual(bmt.build_rows(MORPH, ["— ... щзщщж"]), [])

    def test_authored_stress_in_text_shares_the_unaccented_key(self):
        rows = bmt.build_rows(MORPH, ["Я учу́ ру́сский язы́к."])
        self.assertIn("русский", [r["surface"] for r in rows])
        self.assertIn("язык", [r["lemma"] for r in rows])


if __name__ == "__main__":
    unittest.main(verbosity=2)
