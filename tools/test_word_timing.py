#!/usr/bin/env python3
"""Hermetic tests for scripts/word_timing_lib.py (WORD-TIMING-001).

No audio, no model: pure alignment logic. Run:
    python3 -m pytest tools/test_word_timing.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import word_timing_lib as wt  # noqa: E402


def W(w, s, e):
    return {"w": w, "start": s, "end": e}


def test_stress_marks_do_not_fragment_tokens():
    # The spike's critical pitfall: U+0301 inside a word must not split it.
    assert wt.tokens("му\u0301ка не му\u0301ка") == ["мука", "не", "мука"]
    assert wt.tokens("кио\u0301ск") == ["киоск"]
    assert wt.strip_accents("до\u0301лг") == "долг"


def test_equal_opcodes_map_one_to_one():
    words = [W("привет", 0.0, 0.4), W("мир", 0.4, 0.7)]
    spans = wt.align_tokens(words, ["привет", "мир"], duration=0.8)
    assert spans == [(0, 0), (1, 1)]


def test_replace_opcode_accepts_near_miss():
    # whisper mis-hears "метро" as "маетро": ratio 10/11 >= 0.75 -> aligned.
    words = [W("маетро", 0.1, 0.6)]
    spans = wt.align_tokens(words, ["метро"], duration=0.7)
    assert spans == [(0, 0)]


def test_replace_opcode_rejects_far_miss():
    # "район" vs "Драй гой"-class garble: ratio < 0.75, no absorb -> abstain.
    words = [W("драй", 0.0, 0.3), W("гой", 0.3, 0.6)]
    assert wt.align_tokens(words, ["район"], duration=0.7) is None


def test_split_merge_absorb():
    # The spike's "до-ёброе" split: neither half matches доброе alone
    # ("до" ratio 0.4), but the joined pair reaches 0.92 >= 0.8.
    words = [W("до", 0.0, 0.2), W("ёброе", 0.2, 0.6)]
    spans = wt.align_tokens(words, ["доброе"], duration=0.7)
    assert spans == [(0, 1)]


def test_absorb_threshold_not_met_is_abstain():
    # Split pair "во" + "ды" for expected "вода": joined ratio 0.75 is under
    # the 0.8 absorb threshold (and "во" alone is 0.667) -> abstain, not a
    # guess at a different word.
    words = [W("во", 0.0, 0.2), W("ды", 0.2, 0.6)]
    assert wt.align_tokens(words, ["вода"], duration=0.7) is None


def test_abstain_on_non_monotonic_timestamps():
    # A token matched, but the ASR word stream overlaps beyond jitter:
    # presentation timings would interleave -> untrustworthy.
    words = [W("привет", 0.0, 2.0), W("мир", 1.0, 2.5)]
    assert wt.align_tokens(words, ["привет", "мир"], duration=2.6) is None


def test_abstain_on_missing_token():
    # A want token with no ASR support at all (whisper dropped a word).
    words = [W("привет", 0.0, 0.4)]
    assert wt.align_tokens(words, ["привет", "мир"], duration=1.0) is None


def test_duration_slack():
    # Whisper tail past the clip end fails only beyond the +0.3 s slack.
    words = [W("привет", 0.0, 1.5)]
    assert wt.align_tokens(words, ["привет"], duration=1.0) is None
    assert wt.align_tokens(words, ["привет"], duration=1.2) == [(0, 0)]
