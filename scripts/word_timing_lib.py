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

# WORD-TIMING-002 (ja): whisper fragments heard ja into mora-level word
# tokens ("ぶん けん"), so one expected token may need to absorb a CHAIN of
# adjacent ASR fragments. Contract: chains up to 3, and unlike the 2-fragment
# absorb (threshold ABSORB=0.8) a 3-fragment glue must reach a stricter
# concatenated ratio (ABSORB_LONG=0.9) — longer glues are more coincidental.
# The ru path keeps absorb_chain=2 and is byte-identical to WORD-TIMING-001.
ABSORB_CHAIN = 2
ABSORB_LONG = 0.9

# pykakasi instance for kana folding, built lazily (pykakasi is only
# installed in the ja interpreter, ~/.venvs/wordtiming-ja).
_KAKASI = None

# kanji (incl. ext-A) or katakana: the only scripts the kana fold touches.
_FOLD_NEEDED = re.compile(r"[\u30a1-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")


def kana_fold(s: str) -> str:
    """Fold a heard ASR token to hiragana (WORD-TIMING-002 contract:
    pykakasi K2H/E2H/J2H — whisper kanji-converts its ja transcription,
    hearing "ぶんせき" as "分析", even with a kana initial_prompt).

    Uses the modern pykakasi.Kakasi API; joining each morpheme's `hira`
    field is exactly the K2H+E2H+J2H fold the legacy setMode('K','H') /
    setMode('E','H') / setMode('J','H') calls produce (pykakasi >= 2.1
    deprecated the 3-mode setMode('K2H') string form; the 2-arg legacy
    call still works but warns). Kana-only tokens are returned unchanged
    without paying for a conversion. Raises RuntimeError if pykakasi is
    not importable in this interpreter.
    """
    global _KAKASI
    if not _FOLD_NEEDED.search(s):
        return s
    if _KAKASI is None:
        try:
            import pykakasi  # noqa: PLC0415
        except ImportError as e:  # pragma: no cover
            raise RuntimeError(
                "kana_fold needs pykakasi (run ja generation under "
                "~/.venvs/wordtiming-ja)") from e
        _KAKASI = pykakasi.Kakasi()
    return "".join(m["hira"] for m in _KAKASI.convert(s))

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
    if any('\u3041' <= c <= '\u30ff' for c in w):
        # WORD-TIMING-002: fold the long-vowel mark so whisper's fragmented
        # "か/ー/る/い" glue and the pack's かるい compare equal; no-op for
        # kana words without ー and for Cyrillic.
        w = w.replace("\u30fc", "")
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
    absorb_chain: int = ABSORB_CHAIN,
    absorb_long: float = ABSORB_LONG,
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
            # WORD-TIMING-002 (ja): `absorb_chain` extends the glue to up to
            # 3 fragments (whisper hears ja as mora chunks: "お ば さん"),
            # with a stricter concatenated ratio (`absorb_long`) for glues
            # longer than 2. ru keeps chain=2 and is unchanged.
            jj = j1
            for i in range(i1, i2):
                if jj >= j2:
                    break
                if difflib.SequenceMatcher(None, want_tokens[i], got[jj]).ratio() >= ratio:
                    spans[i] = (jj, jj)
                    jj += 1
                else:
                    glued = False
                    for k in range(2, absorb_chain + 1):
                        if jj + k > j2:
                            break
                        thr = absorb if k == 2 else absorb_long
                        if difflib.SequenceMatcher(
                                None, want_tokens[i],
                                "".join(got[jj:jj + k])).ratio() >= thr:
                            spans[i] = (jj, jj + k - 1)
                            jj += k
                            glued = True
                            break
                    if not glued:
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
