#!/usr/bin/env python3
"""Smoke test for tools/qa_stories.py (CONTENT-QA-STORIES-001).

Builds a minimal fixture pack in a temp dir and checks that the gate:
  1. passes a clean story,
  2. fails a story with an unresolvable sentence ref,
  3. fails a story whose counted new lemma has no lexicon gloss,
  4. verifies stress position against the lexicon reading.
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

TOOL = os.path.join(os.path.dirname(__file__), "qa_stories.py")


def write_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


class QaStoriesTest(unittest.TestCase):
    def _pack(self, tmp, story_yaml, sent_rows, lex_rows):
        root = os.path.join(tmp, "pack")
        os.makedirs(os.path.join(root, "stories"))
        os.makedirs(os.path.join(root, "sentences"))
        os.makedirs(os.path.join(root, "lexicon"))
        with open(os.path.join(root, "stories", "s1.yaml"), "w",
                  encoding="utf-8") as f:
            f.write(story_yaml)
        write_jsonl(os.path.join(root, "sentences", "entries.jsonl"),
                    sent_rows)
        write_jsonl(os.path.join(root, "lexicon", "main.jsonl"), lex_rows)
        return root

    def _run(self, root):
        return subprocess.run(
            [sys.executable, TOOL, "--pack", root],
            capture_output=True, text=True)

    def test_clean_story_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self._pack(
                tmp,
                "id: ru.story.a1.s1\nstatus: draft\ntitle: \"T\"\n"
                "sentences:\n  - ru.sent.a1.s1.u001\n",
                [{"id": "ru.sent.a1.s1.u001", "status": "draft",
                  "text": "Мама дома.", "gloss": "Mom is at home.",
                  "cloze_targets": ["Мама"]}],
                [])
            r = self._run(root)
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_missing_sentence_ref_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self._pack(
                tmp,
                "id: ru.story.a1.s1\nstatus: draft\ntitle: \"T\"\n"
                "sentences:\n  - ru.sent.a1.s1.u002\n",
                [{"id": "ru.sent.a1.s1.u001", "status": "draft",
                  "text": "Мама дома.", "gloss": "x"}],
                [])
            r = self._run(root)
            self.assertEqual(r.returncode, 1)
            self.assertIn("missing_sentence", r.stdout)

    def test_uncovered_lemma_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self._pack(
                tmp,
                "id: ru.story.a1.s1\nstatus: draft\ntitle: \"T\"\n"
                "sentences:\n  - ru.sent.a1.s1.u001\n",
                [{"id": "ru.sent.a1.s1.u001", "status": "draft",
                  "text": "Каравай на столе.", "gloss": "x"}],
                [{"id": "ru.lex.x.stol", "status": "draft",
                  "forms": [{"text": "стол"}], "readings": []}])
            r = self._run(root)
            self.assertEqual(r.returncode, 1)
            self.assertIn("uncovered_lemma", r.stdout)

    def test_stress_conflict_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = self._pack(
                tmp,
                "id: ru.story.a1.s1\nstatus: draft\ntitle: \"T\"\n"
                "sentences:\n  - ru.sent.a1.s1.u001\n",
                [{"id": "ru.sent.a1.s1.u001", "status": "draft",
                  "text": "Кру́жка на столе.", "gloss": "x"}],
                [{"id": "ru.lex.x.stol", "status": "draft",
                  "forms": [{"text": "стол"}], "readings": []},
                 {"id": "ru.lex.x.kr", "status": "draft",
                  "forms": [{"text": "кружка"}],
                  "readings": [{"text": "кружка́"}]}])
            r = self._run(root)
            self.assertEqual(r.returncode, 1)
            self.assertIn("stress_conflict", r.stdout)


if __name__ == "__main__":
    unittest.main()
