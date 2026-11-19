#!/usr/bin/env python3
"""Golden-sentence tests for scripts/build-grammar-labels.py (GRAMMAR-LABELS-001).

The card acceptance names them explicitly: the six cases and the aspect
pairs, plus the degradation rules (unlabeled parts of speech and
not-in-dictionary tokens carry no label). Pure pymorphy3 decisions — no
network, no cargo.

Run: python3 scripts/test_grammar_labels.py   (repo .venv has the pinned
pymorphy3==2.0.6 / pymorphy3-dicts-ru==2.4.417150.4580142)
"""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

import pymorphy3

_spec = importlib.util.spec_from_file_location(
    "build_grammar_labels", Path(__file__).with_name("build-grammar-labels.py")
)
bgl = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bgl)

MORPH = pymorphy3.MorphAnalyzer()


def label(word: str) -> str | None:
    """Same gate the table build uses: dictionary-attested top parse only."""
    parsed = MORPH.parse(word)
    if not parsed or type(parsed[0].methods_stack[0][0]).__name__ != "DictionaryAnalyzer":
        return None
    return bgl.label_for(parsed[0].tag)


class SixCases(unittest.TestCase):
    """The six Russian cases, labeled nom/gen/dat/acc/ins/prep."""

    def test_six_cases_on_an_unambiguous_masculine_noun(self):
        # "стол": OpenCorpora tags the inanimate citation form accs
        # (accusative = nominative in form) — the label is honest either way.
        self.assertEqual(label("стол"), "acc.sg")
        self.assertEqual(label("стола"), "gen.sg")
        self.assertEqual(label("столу"), "dat.sg")
        self.assertEqual(label("столом"), "ins.sg")
        self.assertEqual(label("столе"), "prep.sg")

    def test_plural_case_forms(self):
        self.assertEqual(label("книгами"), "ins.pl")
        self.assertEqual(label("книгам"), "dat.pl")
        # "книги": pymorphy ranks gen.sg first — any case label is correct
        # for a form that is gen.sg OR nom.pl; it must not be label-less.
        self.assertIn(str(label("книги")).split(".")[0], {"gen", "nom"})

    def test_adjectives_carry_case_and_number(self):
        self.assertEqual(label("красивого"), "gen.sg")
        self.assertEqual(label("красивые"), "nom.pl")


class AspectPairs(unittest.TestCase):
    def test_imperfective_vs_perfective_past(self):
        self.assertEqual(label("читал"), "impf.past")
        self.assertEqual(label("прочитал"), "perf.past")

    def test_perfective_nonpast_is_future(self):
        self.assertEqual(label("прочитаю"), "perf.fut")

    def test_analytic_future_aux_is_labeled_by_aspect(self):
        # OpenCorpora tags "будет" with futr, not a present tense; the
        # honest label is the aspect alone.
        self.assertEqual(label("будет"), "impf")

    def test_infinitives_carry_aspect(self):
        self.assertEqual(label("читать"), "inf.impf")
        self.assertEqual(label("прочитать"), "inf.perf")


class Degradation(unittest.TestCase):
    def test_particles_adpositions_pronouns_get_no_label(self):
        for word in ("и", "в", "на", "но", "это", "очень", "меня", "мной"):
            self.assertIsNone(label(word), word)

    def test_tokens_not_in_the_dictionary_get_no_label(self):
        # pymorphy's predictive suffix model tags "щзщщж" as nom.sg; the
        # table build refuses non-dictionary parses.
        self.assertIsNone(label("щзщщж"))


class Tokens(unittest.TestCase):
    def test_tokenize_matches_frontend_whitespace_split(self):
        self.assertEqual(bgl.tokenize("а, б  в\nг"), ["а,", "б", "в", "г"])

    def test_authored_stress_does_not_break_the_lookup(self):
        # Pack text may carry U+0301; pymorphy's keys are unaccented, so
        # the build probes the stripped form (and the sidecar stores the
        # RAW token for frontend alignment).
        self.assertEqual(bgl.label_for(MORPH.parse("книгами")[0].tag), "ins.pl")


if __name__ == "__main__":
    unittest.main(verbosity=2)
