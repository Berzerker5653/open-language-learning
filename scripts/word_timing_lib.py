#!/usr/bin/env python3
"""Pure alignment primitives for WORD-TIMING-001 (word-level clip timings).

Shared by scripts/generate-word-timings.py and tools/test_word_timing.py:
no IO, no model — hand it ASR word timestamps plus the pack text and it
returns per-token spans (indices into asr_words), or None when the
alignment cannot be trusted. Same lineage as the runtime constrained
matcher in speech-runtime/alignment.rs: alignment output is presentation
data, never proof of pronunciation.

Critical pitfall (spike 2026-11-07, same one qa-asr.py hit in the gate):
Russian lexical stress is a COMBINING mark (U+0301, мука\u0301). Combining
marks must be stripped BEFORE tokenizing, otherwise `[\\w']+` fragments a
single stressed word into two tokens.
"""
from __future__ import annotations

import difflib
import re
import unicodedata

# Tuned on the WORD-TIMING spike (experiments/word-timing/spike-ru.jsonl):
# turbo pass needs RATIO (per-token) 0.75 and ABSORB (token vs two adjacent
# ASR words glued together, e.g. whisper's "до" + "ёброе" for доброе) 0.8.
RATIO = 0.75
ABSORB = 0.8
# ASR word timestamps are segment-clamped, not gap-free: consecutive aligned
# words may overlap by a hair without being untrustworthy.
MONO_TOL = 0.05
# Whisper can report an end slightly past the end of a trimmed clip; that is
# clamping noise, not a broken alignment.
SLACK = 0.3


def strip_accents(s: str) -> str:
    """Remove combining marks (NFKD then drop combining) — stress-safe."""
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c))


def norm(w: str) -> str:
    """Comparison form of one word: NFKC-kana-folded, lowercase, combining
    marks and punctuation stripped (spike's norm, kept identical on both
    sides). NFKC first folds small/half-width kana (ぁ->あ, ﾅ->ナ) so whisper's
    kana transcription aligns with the pack's kana text (WORD-TIMING-002);
    it is a no-op for Cyrillic."""
    w = unicodedata.normalize("NFKC", w)
    w = unicodedata.normalize("NFKD", w.lower())
    w = "".join(c for c in w if not unicodedata.combining(c))
    return re.sub(r"[^\w']+|[']$", "", w, flags=re.UNICODE)


def tokens(text: str) -> list[str]:
    """Normalized content tokens of the pack text.

    Strip stress/diacritic marks BEFORE splitting: Russian packs mark stress
    with a combining acute inside words (мука\u0301), which otherwise fragments
    single words into multiple tokens.
    """
    return [t for t in (norm(x) for x in re.findall(r"[\w']+", strip_accents(text))) if t]


def align_tokens(
    asr_words: list[dict],
    want_tokens: list[str],
    duration: float | None = None,
    ratio: float = RATIO,
    absorb: float = ABSORB,
) -> list[tuple[int, int]] | None:
    """Constrained fuzzy token match: one span (first..last ASR word index,
    inclusive) per expected token, or None if the clip's alignment must be
    abstained on.

    asr_words: [{"w": str, "start": float, "end": float}, ...] in time order
    (the faster-whisper word_timestamps shape).
    want_tokens: normalized expected tokens (norm() of the pack text).

    Rules (validated by the 2026-11-07 spike):
      * difflib opcodes over the two token sequences, autojunk off;
      * "equal" blocks map 1:1;
      * inside a "replace" block an expected token matches one ASR word when
        difflib ratio >= `ratio`, or absorbs a split (the ASR word plus the
        next one, joined without a space — whisper heard "до" + "ёброе") when
        the combined ratio >= `absorb`;
      * every expected token must get a span (a token with no ASR support is
        a hallucination-shaped gap -> None);
      * the aligned word stream must be time-monotonic within MONO_TOL
        (overlapping ASR words beyond jitter -> None), and the last aligned
        word must end within `duration` + SLACK when the clip length is given.
    """
    if not asr_words or not want_tokens:
        return None
    got = [norm(w["w"]) for w in asr_words]
    spans: list[tuple[int, int] | None] = [None] * len(want_tokens)
    sm = difflib.SequenceMatcher(None, want_tokens, got, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                spans[i1 + k] = (j1 + k, j1 + k)
        elif tag == "replace":
            # Greedy left-to-right: try a 1:1 fuzzy hit first, then the
            # split-absorb (one expected token == two adjacent ASR words).
            jj = j1
            for i in range(i1, i2):
                if jj >= j2:
                    break
                if difflib.SequenceMatcher(None, want_tokens[i], got[jj]).ratio() >= ratio:
                    spans[i] = (jj, jj)
                    jj += 1
                elif (jj + 1 < j2
                      and difflib.SequenceMatcher(
                          None, want_tokens[i], got[jj] + got[jj + 1]).ratio() >= absorb):
                    spans[i] = (jj, jj + 1)
                    jj += 2
                else:
                    jj += 1  # ASR-side junk; skip it, the token stays unmatched
        # "delete" (expected token with zero ASR words) and leftover gaps
        # leave spans[i] = None and fail coverage below.
    if any(s is None for s in spans):
        return None
    resolved = [s for s in spans if s is not None]
    seq = [k for a, b in resolved for k in range(a, b + 1)]  # jj advances, so indices rise
    for a, b in zip(seq, seq[1:]):
        if asr_words[b]["start"] < asr_words[a]["end"] - MONO_TOL:
            return None  # non-monotonic / overlapping timestamps: untrustworthy
    if duration is not None and asr_words[seq[-1]]["end"] > duration + SLACK:
        return None  # timing runs past the clip (whisper hallucination tail)
    return resolved
