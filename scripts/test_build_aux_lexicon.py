"""Unit tests for scripts/build-aux-lexicon.py (READER-FLOW-001 off-pack
slice). Synthetic kaikki entries — no network, no 948 MB input."""

from __future__ import annotations

import importlib.util
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "build_aux_lexicon", Path(__file__).with_name("build-aux-lexicon.py")
)
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)


def entry(word, pos="noun", glosses=("a domesticated canine",), forms=(), tags=(), sense_tags=(), lang_code="ru"):
    return {
        "word": word,
        "pos": pos,
        "lang_code": lang_code,
        "lang": "Russian",
        "tags": list(tags),
        "senses": [{"glosses": list(glosses), "tags": list(sense_tags)}] if glosses else [],
        "forms": [{"form": f} for f in forms],
    }


class KeepReject(unittest.TestCase):
    def test_rejects_other_languages(self):
        self.assertFalse(B.keep_entry(entry("dog", lang_code="en")))

    def test_rejects_redirect_entries(self):
        self.assertFalse(B.keep_entry({"word": "Алтын", "pos": "hard-redirect", "lang_code": "ru"}))

    def test_rejects_non_cyrillic_headword(self):
        self.assertFalse(B.keep_entry(entry("blini (plural of blin)")))

    def test_rejects_proper_nouns(self):
        self.assertFalse(B.keep_entry(entry("москва", tags=["proper-noun"])))
        self.assertFalse(B.keep_entry(entry("иванов", sense_tags=["surname"])))

    def test_strips_stress_and_accepts_hyphenated_token(self):
        self.assertTrue(B.keep_entry(entry("кто-то")))
        self.assertTrue(B.keep_entry(entry("собака")))

    def test_refuses_hard_sign_and_age_tags(self):
        self.assertFalse(B.keep_entry(entry("молокъ")))
        self.assertFalse(B.keep_entry(entry("тогда", tags=["archaic"])))
        self.assertFalse(B.keep_entry(entry("хче", sense_tags=["dialectal"])))

    def test_forms_refuse_hard_sign(self):
        rows = B.build_rows([entry("молоко", forms=["молокамъ", "молоками"])])
        self.assertEqual(rows[0]["forms"], ["молоками"])

    def test_trailing_hyphen_normalizes_away(self):
        # norm_token strips edge non-letters, so "кто-" keeps as "кто"
        # — the same normalization the wire contract uses everywhere.
        self.assertEqual(B.norm_token("кто-"), "кто")
        self.assertTrue(B.keep_entry(entry("кто-")))


class Build(unittest.TestCase):
    def test_inflected_forms_become_lookup_surfaces(self):
        rows = B.build_rows([entry("собака", forms=["соба́ки", "соба́ку", "sobaki"])])
        self.assertEqual(rows[0]["forms"], ["собаки", "собаку"])  # romanization falls out

    def test_gloss_caps_and_truncation(self):
        long = "word " * 100
        e = entry("стол", glosses=(long,))
        rows = B.build_rows([e, entry("стол", pos="verb", glosses=("g2", "g3"))])
        row = rows[0]
        self.assertLessEqual(len(row["glosses"]), B.MAX_SENSES)
        for g in row["glosses"]:
            self.assertLessEqual(len(g), B.MAX_GLOSS_CHARS + 1)
            self.assertTrue(g.endswith("\u2026") if len(g) == B.MAX_GLOSS_CHARS + 1 else True)
        self.assertEqual(sorted(row["pos"]), ["noun", "verb"])

    def test_word_without_glosses_dropped(self):
        self.assertEqual(B.build_rows([entry("фу", glosses=())]), [])

    def test_deterministic_sort_and_dedup(self):
        rows = B.build_rows([entry("яблоко"), entry("абажур"), entry("абажур", pos="noun")])
        self.assertEqual([r["word"] for r in rows], ["абажур", "яблоко"])
        self.assertEqual(B.serialize(rows), B.serialize(B.build_rows([entry("абажур"), entry("яблоко")])))

    def test_forms_capped(self):
        many = [f"форма{i:03d}".replace("0", "о") for i in range(50)]
        rows = B.build_rows([entry("стол", forms=many)])
        self.assertLessEqual(len(rows[0]["forms"]), B.MAX_FORMS)


class Check(unittest.TestCase):
    def test_slice_roundtrip_check_passes_and_detects_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            inp = os.path.join(tmp, "in.jsonl")
            with open(inp, "w", encoding="utf-8") as f:
                for e in [entry("собака", forms=["соба́ки"]), entry("кот")]:
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")
            shutil.copy(B.LICENSE_AUX, os.path.join(tmp, "LICENSE-kaikki.txt"))
            old_out, old_prov, old_lic = B.OUT, B.PROVENANCE, B.LICENSE_AUX
            B.OUT = os.path.join(tmp, "ru.jsonl")
            B.PROVENANCE = os.path.join(tmp, "ru.provenance.json")
            B.LICENSE_AUX = os.path.join(tmp, "LICENSE-kaikki.txt")
            try:
                self.assertEqual(B.do_write(inp), 0)
                self.assertEqual(B.do_check(), 0)
                # byte-identical re-write from the same input
                first = open(B.OUT, "rb").read()
                self.assertEqual(B.do_write(inp), 0)
                self.assertEqual(open(B.OUT, "rb").read(), first)
                # a CC-BY-SA/GFDL derivative in an Apache-2.0 repo must
                # ship its license text next to the slice (FIX-001b-2)
                os.remove(B.LICENSE_AUX)
                self.assertEqual(B.do_check(), 1)
                shutil.copy(old_lic, B.LICENSE_AUX)
                self.assertEqual(B.do_check(), 0)
                with open(B.OUT, "a", encoding="utf-8") as f:
                    f.write(json.dumps(entry("кот"), ensure_ascii=False) + "\n")
                self.assertEqual(B.do_check(), 1)
            finally:
                B.OUT, B.PROVENANCE, B.LICENSE_AUX = old_out, old_prov, old_lic


class LicenseShips(unittest.TestCase):
    def test_committed_repo_ships_license_aux(self):
        self.assertTrue(
            os.path.exists(B.LICENSE_AUX),
            "aux/lexicon/LICENSE-kaikki.txt missing — the kaikki slice is a "
            "CC-BY-SA/GFDL derivative, not the repo's Apache-2.0",
        )

    def test_license_aux_names_both_licenses_and_excludes_apache(self):
        text = open(B.LICENSE_AUX, encoding="utf-8").read()
        for needle in (
            "Creative Commons Attribution-ShareAlike",
            "GNU Free Documentation License",
            "Apache-2.0",
            B.ATTRIBUTION,
        ):
            self.assertIn(needle, text)

    def test_provenance_points_at_the_license_file(self):
        prov = json.load(open(B.PROVENANCE, encoding="utf-8"))
        self.assertEqual(prov.get("license_file"), "aux/lexicon/LICENSE-kaikki.txt")


if __name__ == "__main__":
    unittest.main()
