#!/usr/bin/env python3
"""Tests for normalize_wav in scripts/generate-pack-audio.py (stdlib only).

Run: python3 scripts/test_generate_pack_audio.py
"""

from __future__ import annotations

import importlib.util
import math
import os
import struct
import tempfile
import unittest
import wave
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "generate_pack_audio", Path(__file__).with_name("generate-pack-audio.py")
)
gpa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gpa)


def write_wav(path: str, samples: list[int], rate: int = 24000) -> None:
    with wave.open(path, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(struct.pack("<%dh" % len(samples), *samples))


def read_wav(path: str) -> list[int]:
    with wave.open(path) as wav:
        frames = wav.readframes(wav.getnframes())
    return list(struct.unpack("<%dh" % (len(frames) // wav.getsampwidth()), frames))


def active_rms(samples: list[int], rate: int = 24000) -> float:
    frame = rate // 100
    rms = [
        math.sqrt(sum(s * s for s in samples[i : i + frame]) / frame)
        for i in range(0, len(samples), frame)
    ]
    loudest = max(rms)
    if loudest == 0:
        return 0.0
    active = [v for v in rms if v > gpa.ACTIVE_GATE * loudest]
    return math.sqrt(sum(v * v for v in active) / len(active))


class NormalizeWavTest(unittest.TestCase):
    def tmp(self) -> str:
        fd, path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        self.addCleanup(os.unlink, path)
        return path

    def speech(self, amp: int, seconds_voiced: float = 0.3) -> list[int]:
        rate = 24000
        voiced = [int(amp * math.sin(2 * math.pi * 220 * t / rate)) for t in range(int(rate * seconds_voiced))]
        return [0] * (rate // 10) + voiced + [0] * (rate // 10)

    def test_quiet_file_is_lifted_to_target(self) -> None:
        path = self.tmp()
        before = self.speech(1500)
        write_wav(path, before)
        note = gpa.normalize_wav(Path(path))
        self.assertIsNotNone(note)
        self.assertGreater(float(note.split("gain ")[1].split("x")[0]), 1.0)
        after = read_wav(path)
        self.assertAlmostEqual(active_rms(after) / 32767.0, gpa.TARGET_ACTIVE_RMS, delta=0.01)
        self.assertLessEqual(max(abs(s) for s in after), gpa.PEAK_CEILING * 32767 + 1)

    def test_hot_file_is_pulled_under_the_ceiling(self) -> None:
        path = self.tmp()
        write_wav(path, self.speech(31000))
        note = gpa.normalize_wav(Path(path))
        self.assertIsNotNone(note)
        self.assertLess(float(note.split("gain ")[1].split("x")[0]), 1.0)
        after = read_wav(path)
        self.assertAlmostEqual(active_rms(after) / 32767.0, gpa.TARGET_ACTIVE_RMS, delta=0.01)
        self.assertLessEqual(max(abs(s) for s in after), gpa.PEAK_CEILING * 32767 + 1)

    def test_silence_is_left_untouched(self) -> None:
        path = self.tmp()
        write_wav(path, [0] * 24000)
        self.assertIsNone(gpa.normalize_wav(Path(path)))
        self.assertEqual(read_wav(path), [0] * 24000)

    def test_non_pcm16_is_skipped_not_corrupted(self) -> None:
        path = self.tmp()
        with wave.open(path, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(1)
            wav.setframerate(24000)
            wav.writeframes(bytes([128] * 48000))
        original = Path(path).read_bytes()
        self.assertIsNone(gpa.normalize_wav(Path(path)))
        self.assertEqual(Path(path).read_bytes(), original)

    def test_roundtrip_preserves_shape(self) -> None:
        # sample count and rate survive normalization (the manifest derives
        # seconds/sample_rate from these).
        path = self.tmp()
        write_wav(path, self.speech(1200))
        gpa.normalize_wav(Path(path))
        with wave.open(path) as wav:
            self.assertEqual(wav.getframerate(), 24000)
        after = read_wav(path)
        self.assertEqual(len(after), len(self.speech(1200)))


class ReusableTest(unittest.TestCase):
    """`--force`-free runs may reuse bytes, but never relabel them."""

    SYNTH = {"engine": "qwen3-tts", "model": "CustomVoice", "speaker": "ono_anna"}

    def setUp(self) -> None:
        fd, self.path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        self.addCleanup(os.unlink, self.path)
        write_wav(self.path, [int(9000 * math.sin(2 * math.pi * 220 * t / 24000)) for t in range(12000)])

    def want(self, speak: str) -> dict:
        return {
            "id": "ja.sent.a2.post.wrap-in-cardboard",
            "file": "media/ja.sent.a2.post.wrap-in-cardboard.wav",
            "text": "段ボールに包みます。",
            "speak": speak,
            "speak_from": "reading",
        }

    def test_matching_row_is_reused(self) -> None:
        want = self.want("だんボールにつつみます。")
        prior = gpa.build_row(want, Path(self.path), self.SYNTH, "2026-10-12", None)
        self.assertTrue(gpa.reusable(prior, Path(self.path), self.SYNTH, want, False))

    def test_corrected_reading_is_not_reused(self) -> None:
        # The bytes were synthesized from the old kana; the pack now declares
        # corrected kana. Reusing would record the new text over old audio.
        old = self.want("だんぽボールにつつみます。")
        prior = gpa.build_row(old, Path(self.path), self.SYNTH, "2026-10-12", None)
        self.assertFalse(gpa.reusable(prior, Path(self.path), self.SYNTH, self.want("だんボールにつつみます。"), False))

    def test_engine_switch_is_not_reused(self) -> None:
        want = self.want("だんボールにつつみます。")
        prior = gpa.build_row(want, Path(self.path), self.SYNTH, "2026-10-12", None)
        other = dict(self.SYNTH, engine="kokoro")
        self.assertFalse(gpa.reusable(prior, Path(self.path), other, want, False))

    def test_tampered_bytes_are_not_reused(self) -> None:
        want = self.want("だんボールにつつみます。")
        prior = gpa.build_row(want, Path(self.path), self.SYNTH, "2026-10-12", None)
        write_wav(self.path, [int(9000 * math.sin(2 * math.pi * 440 * t / 24000)) for t in range(12000)])
        self.assertFalse(gpa.reusable(prior, Path(self.path), self.SYNTH, want, False))

    def test_force_regenerates(self) -> None:
        want = self.want("だんボールにつつみます。")
        prior = gpa.build_row(want, Path(self.path), self.SYNTH, "2026-10-12", None)
        self.assertFalse(gpa.reusable(prior, Path(self.path), self.SYNTH, want, True))

    def test_missing_file_and_missing_row_are_not_reused(self) -> None:
        want = self.want("だんボールにつつみます。")
        prior = gpa.build_row(want, Path(self.path), self.SYNTH, "2026-10-12", None)
        self.assertFalse(gpa.reusable(prior, Path(self.path).with_name("absent.wav"), self.SYNTH, want, False))
        self.assertFalse(gpa.reusable(None, Path(self.path), self.SYNTH, want, False))


if __name__ == "__main__":
    unittest.main()
