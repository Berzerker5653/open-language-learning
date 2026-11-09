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


# ---------------------------------------------------------------------------
# WORD-TIMING-002 (ja kana path). These need pykakasi; run them under
# ~/.venvs/wordtiming-ja (the ru suite stays green under plain python3 with
# pykakasi absent — the kana tests then skip via the guards below).
# ---------------------------------------------------------------------------

def _kana_fold_or_skip():
    try:
        return wt.kana_fold("分析")
    except RuntimeError:
        return None  # pykakasi not importable in this interpreter


def test_kana_fold_heard_kanji_matches_expected_kana():
    # Contract case 1: whisper kanji-converts heard ja ("ぶんせき" heard as
    # "分析", even with a kana initial_prompt); pykakasi K2H folds it back
    # and the aligned expected kana token matches.
    folded = _kana_fold_or_skip()
    if folded is None:
        return
    assert folded == "ぶんせき"
    assert wt.kana_fold("ブンセキ") == "ぶんせき"   # katakana heard folds too
    assert wt.kana_fold("ぶんせき") == "ぶんせき"   # kana-only passes through
    words = [W(wt.norm(folded), 0.0, 0.6)]
    spans = wt.align_tokens(words, [wt.norm("ぶんせき")], duration=0.7)
    assert spans == [(0, 0)]


def test_mora_fragment_chain_absorbs_up_to_three():
    # Contract case 2: whisper chops heard ja into mora chunks ("お ば さん"
    # for expected おばさん). Chain absorb (ja passes absorb_chain=3) glues
    # 3 fragments when the concatenated ratio >= 0.9; the ru default
    # (chain=2) must NOT glue them.
    words = [W("お", 0.0, 0.15), W("ば", 0.15, 0.3), W("さん", 0.3, 0.6)]
    want = [wt.norm("おばさん")]  # generator passes norm()ed want tokens
    spans = wt.align_tokens(words, want, duration=0.7, absorb_chain=3)
    assert spans == [(0, 2)]
    assert wt.align_tokens(words, want, duration=0.7) is None


def test_three_chain_below_long_threshold_is_abstain():
    # "ぶん き ん" for ぶんけん: concatenated ratio 0.75 < 0.9 -> abstain,
    # not a glue at a different word. (The 2-fragment glue is 0.571, also
    # below the 0.8 absorb threshold.)
    words = [W("ぶん", 0.0, 0.2), W("き", 0.2, 0.3), W("ん", 0.3, 0.45)]
    assert wt.align_tokens(words, ["ぶんけん"], duration=0.6,
                           absorb_chain=3) is None


def test_expected_kana_text_segments_into_multiple_tokens():
    # Contract case 3: expected-side segmentation. The ja pack's word
    # boundaries ARE its whitespace (658/4911 rows are pre-spaced kana
    # sentences); pykakasi 2.3.0 wakati adds morpheme boundaries only
    # across kanji, so kana-only rows segment via whitespace and alignment
    # must cover several kana tokens at once.
    want = [wt.norm(t) for t in "でんわを かけます".split()]
    assert len(want) == 2  # two ja word tokens from one expected-text row
    assert want[1] == "かけます"
    words = [W("でんわを", 0.0, 0.5), W("かけ", 0.5, 0.7), W("ます", 0.7, 0.9)]
    spans = wt.align_tokens(words, want, duration=1.0, absorb_chain=3)
    assert spans == [(0, 0), (1, 2)]


def test_duplicate_heard_takes_first_match():
    # Contract case 4: short clips are sometimes heard twice; the duplicate
    # is an ASR-side insert and must not block coverage, and the token is
    # timed on the FIRST matched block.
    words = [W("ぶんけん", 0.0, 0.5), W("ぶんけん", 0.7, 1.1)]
    assert wt.align_tokens(words, ["ぶんけん"], duration=1.2) == [(0, 0)]
