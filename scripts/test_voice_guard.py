#!/usr/bin/env python3
"""Tests for the VOICE-CONSISTENCY-001 guard in scripts/generate-pack-audio.py.

Pure decision (narrator_conflict) plus the media/narrator.json reading path
(load_narrator). No network, no TTS, no cargo.

Run: python3 scripts/test_voice_guard.py
"""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "generate_pack_audio", Path(__file__).with_name("generate-pack-audio.py")
)
gpa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gpa)

DECLARED = {"runtime": "qwen3-tts", "voice": "ono_anna"}
QWEN_SYNTHER = {"runtime": "qwen3-tts", "model": "m", "model_sha256": "0" * 64, "voice": "ono_anna"}
PIPER_SYNTHER = {"runtime": "piper-onnx", "model": "ruslan", "voice": "ruslan"}


class NarratorConflictTest(unittest.TestCase):
    def test_sentence_mismatch_errors_and_names_the_id(self):
        err = gpa.narrator_conflict(DECLARED, "ru.sent.cp.p37.a1.b1.c1", PIPER_SYNTHER)
        self.assertIsNotNone(err)
        self.assertIn("ru.sent.cp.p37.a1.b1.c1", err)
        # The error must name BOTH identities so the operator can act:
        self.assertIn("qwen3-tts", err)
        self.assertIn("ono_anna", err)
        self.assertIn("piper-onnx", err)
        self.assertIn("ruslan", err)

    def test_sentence_match_is_clean(self):
        self.assertIsNone(gpa.narrator_conflict(DECLARED, "ru.sent.cp.p37.a1.b1.c1", QWEN_SYNTHER))

    def test_voice_only_mismatch_is_caught(self):
        other = {"runtime": "qwen3-tts", "voice": "ryan"}
        err = gpa.narrator_conflict(DECLARED, "ru.sent.cp.p37.a1.b1.c1", other)
        self.assertIsNotNone(err)
        self.assertIn("ryan", err)

    def test_non_sentence_mismatch_is_never_guarded(self):
        # Owner rule 2026-11-17: word/drill and contrast audio may be any voice.
        for asset_id in (
            "ru.lex.argue2.dokazuemyy",
            "ru.contrast.stress.muka-0",
            "ru.phon.demo.nasal-1",
        ):
            self.assertIsNone(
                gpa.narrator_conflict(DECLARED, asset_id, PIPER_SYNTHER),
                f"{asset_id} is not continuous narration and must not be guarded",
            )

    def test_no_declaration_means_no_guard(self):
        # Absent media/narrator.json (e.g. the ja pack): behavior unchanged.
        self.assertIsNone(gpa.narrator_conflict(None, "ru.sent.cp.p37.a1.b1.c1", PIPER_SYNTHER))

    def test_extra_synthesizer_keys_are_not_part_of_the_identity(self):
        # The row dict carries model/model_sha256 (and kokoro a speed); only
        # runtime+voice identify the narrator.
        declared = {"runtime": "sherpa-onnx-x", "voice": "37"}
        synth = {"runtime": "sherpa-onnx-x", "model": "kokoro", "model_sha256": "f" * 64, "voice": "37", "speed": 1.0}
        self.assertIsNone(gpa.narrator_conflict(declared, "ja.sent.greet.a1.b1.c1", synth))


class LoadNarratorTest(unittest.TestCase):
    def sidecar(self, content: str) -> Path:
        d = Path(tempfile.mkdtemp())
        (d / "media").mkdir()
        (d / "media" / "narrator.json").write_text(content)
        return d

    def test_absent_sidecar_is_None(self):
        d = Path(tempfile.mkdtemp())
        self.assertIsNone(gpa.load_narrator(d))

    def test_valid_sidecar_parses(self):
        d = self.sidecar('{"runtime": "qwen3-tts", "voice": "ono_anna"}\n')
        self.assertEqual(gpa.load_narrator(d), DECLARED)

    def test_malformed_json_raises(self):
        # The caller (main) must refuse loudly on this, never bake unguarded.
        with self.assertRaises(ValueError):
            gpa.load_narrator(self.sidecar("{not json"))

    def test_missing_identity_keys_raise(self):
        with self.assertRaises(ValueError):
            gpa.load_narrator(self.sidecar('{"runtime": "qwen3-tts"}'))
        with self.assertRaises(ValueError):
            gpa.load_narrator(self.sidecar('{"voice": "ono_anna"}'))

    def test_non_object_raises(self):
        with self.assertRaises(ValueError):
            gpa.load_narrator(self.sidecar('["qwen3-tts", "ono_anna"]'))


class EndToEndGuardTest(unittest.TestCase):
    """The decision + reading path combine into the run-time contract: a
    sentence asset whose fresh synthesizer differs from the declared narrator
    yields a named error, everything else passes through."""

    def test_sentence_row_under_off_voice_synth_is_refused(self):
        pack = Path(tempfile.mkdtemp())
        (pack / "media").mkdir()
        (pack / "media" / "narrator.json").write_text(json.dumps(DECLARED))
        declared = gpa.load_narrator(pack)
        err = gpa.narrator_conflict(declared, "ru.sent.cp.p37.a1.b1.c1", PIPER_SYNTHER)
        self.assertIsNotNone(err)
        self.assertIn("ru.sent.cp.p37", err)
        # A word clip in the same run is untouched by the guard.
        self.assertIsNone(gpa.narrator_conflict(declared, "ru.lex.argue2.dokazuemyy", PIPER_SYNTHER))


if __name__ == "__main__":
    unittest.main(verbosity=2)
