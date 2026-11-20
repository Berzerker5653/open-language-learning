#!/usr/bin/env python3
"""WORD-TIMING-003: phoneme-level forced alignment for the ja pack (build-time).

WORD-TIMING-002 proved the coverage floor is structurally unreachable with
ASR + difflib token matching on this pack's isolated short TTS clips
(state/evidence/WORD-TIMING-002/final-report.md): whisper mis-hears the very
long-vowel/geminate contrasts the pack drills and degenerates into repeat
loops. This lane instead feeds the KNOWN pack text to a CTC phoneme model
(MMS-300m-1130 forced aligner via ctc-forced-aligner) — there is no
transcription step to mis-hear the clip. The accept score is the mean
phoneme posterior of the CTC-aligned path, NOT a difflib token ratio
(card acceptance criterion).

Run on omarchy only (heavyweight model; never GamingPC's GPU, never the TV
computer). The pack is READ-ONLY: manifest.jsonl and words.jsonl are never
touched. Output lands in a separate aligner sidecar + a per-clip report;
merging into words.jsonl is a separate reviewed commit.

Per clip:
  1. text -> hiragana (NFKC; katakana folded +0x60; kanji rows use pykakasi
     kana_fold when importable, else abstain 'expected-kanji');
  2. hiragana -> ASCII romaji via an explicit mora table (deterministic;
     っ gemination doubles the next mora's onset — the exact distinction the
     ASR route could not hear; ️ extension of the previous vowel).
     Any unmapped kana abstains 'unmapped-mora';
  3. emissions = MMS CTC forward (ctc-forced-aligner generate_emissions;
     char mode: every romanized letter is a target, <star> at index 31 sits
     between tokens, per the package's convention);
  4. Viterbi = the package's forced_align; confidence = exp(mean log-prob)
     over the non-blank segments of the alignment; accept iff
     confidence >= --min-score (calibrate on the probe);
  5. spans: tokens are letters grouped per whitespace piece (piece order ==
     token order); piece span = first..last letter segment, padded across
     the adjacent blank by get_spans; times = frames * stride.

Honesty gates: low posterior abstains WITH the score logged; spans must be
monotonic and end within clip duration + SLACK (word_timing_lib's slack);
every emitted line passes the WORD-TIMING-001 check_schema (copied, kept in
sync deliberately — the dash in that script's name makes it non-importable).

Probe mode (--limit N): stratified sample by prior abstain reason over the
unsettled rows, ALWAYS including the ja.contrast minimal pairs, and prints
the contrast cross-score matrix (each contrast clip must score better
against its OWN text than against its twin's — the pack's built-in proof
that the phoneme path hears the contrast).

Usage (omarchy):
  venv/bin/python scripts/align-word-timings.py --pack languages/ja-JP \
    --settled languages/ja-JP/media/words.jsonl \
    --prior state/evidence/WORD-TIMING-002/abstains-ja.jsonl \
    --report align-report.jsonl [--limit 40] [--min-score 0.35] [--skip-done]

NOTE the flag split: --settled marks ids that ALREADY HAVE timings (they are
skipped); --prior files only contribute prior abstain reasons for probe
stratification. An id that ASR abstained on has no timings — it is a TARGET.
--skip-done makes a rerun idempotent by skipping ids already in --report.
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import random
import re
import sys
import time
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from word_timing_lib import kana_fold, norm  # noqa: E402

SLACK = 0.3          # same clip-tail slack as word_timing_lib
MIN_SCORE = 0.35     # provisional; calibrate from the probe distribution
STRATA_PER_CELL = 4
SEED = 20261120

_KANJI = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")

# mora table: hiragana -> romaji, ASCII-only so the aligner's 27-letter
# vocab covers every phoneme. Built once; longest-match greedy at runtime.
_MORA: dict[str, str] = {}


def _build_mora() -> None:
    # consonant rows x plain vowels (Hepburn-ish ASCII romaji)
    plain = {"か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
             "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
             "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
             "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
             "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
             "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
             "や": "ya", "ゆ": "yu", "よ": "yo",
             "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
             "わ": "wa", "を": "o", "ん": "n",
             "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
             "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
             "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
             "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
             "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
             "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
             "ゐ": "wi", "ゑ": "we", "ぅ": "u", "ぇ": "e", "っ": "",
             "ゃ": "ya", "ゅ": "yu", "ょ": "yo", "ー": "", "〜": "",
             "ゎ": "wa", "ヵ": "ka", "ヶ": "ga",
             "ぃ": "i", "ぉ": "o", "ヷ": "wa", "ヸ": "va", "ヹ": "ve",
             "ヺ": "vo", "ヶ": "ga", "ヽ": "", "ヾ": ""}
    _MORA.update(plain)
    # y-combos: base consonant romaji (minus the い-row that defines it) + ya/yu/yo
    combos = {"きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
              "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
              "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
              "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
              "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
              "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
              "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
              "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
              "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
              "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
              "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo"}
    _MORA.update(combos)


_build_mora()
_MORA_MAXLEN = max(len(k) for k in _MORA)
_ONSETS = "kgsztdbpw"


def fold_text(text: str) -> str | None:
    """Full row text -> hiragana. Kanji rows fall back to pykakasi kana_fold
    when importable; None = abstain (expected-kanji)."""
    t = unicodedata.normalize("NFKC", text)
    if _KANJI.search(t):
        try:
            t = unicodedata.normalize("NFKC", kana_fold(t))
        except RuntimeError:
            return None
    out = []
    for c in t:
        if "\u30a1" <= c <= "\u30fa":  # katakana -> hiragana (-0x60:
            out.append(chr(ord(c) - 0x60))  # U+30A1 -> U+3041; +0x20 is WRONG
        elif c == "\u303d":                       # 〜 wave dash -> long mark
            out.append("\u30fc")
        else:
            out.append(c)
    return "".join(out)


def kana_to_romaji(hira: str) -> str | None:
    """Greedy longest-match mora -> romaji. っ doubles the NEXT mora's
    onset; ー extends the previous vowel. None on any unmapped char."""
    out: list[str] = []
    prev_vowel = ""
    i = 0
    while i < len(hira):
        c = hira[i]
        if c in " \u3000":
            out.append(" ")
            prev_vowel = ""
            i += 1
            continue
        if c == "\u30fc":
            if prev_vowel:
                out.append(prev_vowel)
            i += 1
            continue
        matched = None
        for L in range(min(_MORA_MAXLEN, len(hira) - i), 0, -1):
            cand = hira[i:i + L]
            if cand in _MORA:
                matched = cand
                break
        if matched is None:
            # romaji mixed into pack text (e.g. "rajio") passes through:
            # these letters are directly in the aligner's 27-letter vocab.
            if ("a" <= c <= "z") or ("A" <= c <= "Z"):
                lc = c.lower()
                out.append(lc)
                prev_vowel = lc if lc in "aiueo" else ""
                i += 1
                continue
            # punctuation/symbols (。、「」…%) carry no mora: skip silently.
            # Any non-letter that is not mapped (e.g. an unfolded kanji,
            # category Lo) still abstains.
            if not unicodedata.category(c).startswith("L"):
                i += 1
                continue
            return None
        if matched == "っ":
            nxt = ""
            for L in range(min(_MORA_MAXLEN, len(hira) - i - 1), 0, -1):
                cand = hira[i + 1:i + 1 + L]
                if cand in _MORA and _MORA[cand]:
                    nxt = _MORA[cand]
                    break
            if nxt and nxt[0] in _ONSETS:
                out.append(nxt[0])
            i += 1
            continue
        rom = _MORA[matched]
        out.append(rom)
        prev_vowel = rom[-1] if rom and rom[-1] in "aiueo" else ""
        i += len(matched)
    return "".join(out)


def check_schema(words_obj: dict) -> str | None:
    """WORD-TIMING-001 sidecar schema check (byte-identical behavior to
    generate-word-timings.check_schema; copied because that script's name
    contains a dash and is not importable)."""
    if not isinstance(words_obj.get("id"), str) or not isinstance(words_obj.get("words"), list):
        return "id/words missing"
    prev_s = -1.0
    for w in words_obj["words"]:
        if not isinstance(w.get("w"), str) or not isinstance(w.get("s"), (int, float)) \
                or not isinstance(w.get("e"), (int, float)):
            return "bad word fields"
        if w["e"] < w["s"] or w["s"] < prev_s:
            return "non-monotonic times"
        prev_s = w["s"]
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pack", type=Path, required=True)
    ap.add_argument("--settled", type=Path, action="append", default=[],
                    help="jsonl whose ids already HAVE timings (skipped); "
                         "repeatable")
    ap.add_argument("--prior", type=Path, action="append", default=[],
                    help="prior abstain-report jsonl: ids keep prior reasons "
                         "for probe strata but remain targets; repeatable")
    ap.add_argument("--skip-done", action="store_true",
                    help="skip ids already present in --report (resume)")
    ap.add_argument("--out", type=Path,
                    help="aligner sidecar (default <pack>/media/words-aligner.jsonl)")
    ap.add_argument("--report", type=Path, required=True,
                    help="this run's per-clip report jsonl (resolved + abstain)")
    ap.add_argument("--limit", type=int, help="probe: N stratified clips")
    ap.add_argument("--min-score", type=float, default=MIN_SCORE)
    ap.add_argument("--model", default="MahmoudAshraf/mms-300m-1130-forced-aligner")
    ap.add_argument("--skip-contrast", action="store_true")
    args = ap.parse_args()

    pack = args.pack
    out = args.out or (pack / "media" / "words-aligner.jsonl")
    rows = [json.loads(l) for l in
            (pack / "media" / "manifest.jsonl").read_text(encoding="utf-8").splitlines()
            if l.strip()]
    settled: set[str] = set()
    prior_reason: dict[str, str] = {}
    for f in args.settled:
        if f.exists():
            for l in f.read_text(encoding="utf-8").splitlines():
                if l.strip():
                    o = json.loads(l)
                    settled.add(o["id"])
    for f in args.prior:
        if f.exists():
            for l in f.read_text(encoding="utf-8").splitlines():
                if l.strip():
                    o = json.loads(l)
                    if "reason" in o:
                        prior_reason[o["id"]] = o["reason"]
    unsettled = [r for r in rows if r["id"] not in settled]
    targets = [r for r in unsettled if (pack / r["file"]).exists()]
    missing_wav = len(unsettled) - len(targets)
    if args.skip_done and args.report.exists():
        done = set()
        for l in args.report.read_text(encoding="utf-8").splitlines():
            if l.strip():
                done.add(json.loads(l)["id"])
        targets = [r for r in targets if r["id"] not in done]

    cells: dict[str, list[dict]] = collections.defaultdict(list)
    for r in targets:
        cells[prior_reason.get(r["id"], "no-prior")].append(r)
    contrast = [r for r in targets if r["id"].startswith("ja.contrast.")]
    probe = bool(args.limit)

    if probe:
        rng = random.Random(SEED)
        picked: list[dict] = []
        seen: set[str] = set()
        for r0 in contrast:            # contrasts are always in the probe
            picked.append(r0)
            seen.add(r0["id"])
        for cell in sorted(cells):
            for r in rng.sample(cells[cell], min(STRATA_PER_CELL, len(cells[cell]))):
                if r["id"] not in seen:
                    picked.append(r)
                    seen.add(r["id"])
        targets = picked[:args.limit]
    print(f"unsettled={len(unsettled)} missing_wav={missing_wav} "
          f"strata={ {c: len(v) for c, v in sorted(cells.items())} } "
          f"targets={len(targets)}", file=sys.stderr, flush=True)

    import torch  # noqa: E402
    from ctc_forced_aligner import (  # noqa: E402
        generate_emissions, get_alignments, get_spans, load_alignment_model,
        load_audio,
    )

    model, tokenizer = load_alignment_model(
        "cpu", model_path=args.model, dtype=torch.float32)
    # The package's convention: star id == len(get_vocab()), and
    # generate_emissions appends exactly that one column.
    vocab = {k.lower(): v for k, v in tokenizer.get_vocab().items()}
    star = len(vocab)
    char_id = {ch: vocab[ch] for ch in "abcdefghijklmnopqrstuvwxyz'"}

    def align_clip(row: dict):
        """Return (words, conf, fit, reason); words None on abstain.
        conf = exp(mean log-prob) over phoneme-labelled frames — the
        acceptance floor (alignment proof: phoneme posteriors, not token
        ratios). fit = exp(mean log-prob) over ALL path frames incl. blanks
        — penalizes blank frames sitting on real speech energy, which is
        exactly the discriminative axis for the contrast cross-scores
        (a too-short text absorbs unmatched audio as low-posterior blanks).
        """
        pieces = [p for p in row["text"].split() if norm(p)]
        if not pieces:
            return None, None, None, "empty-text"
        hira = fold_text(row["text"])
        if hira is None:
            return None, None, None, "expected-kanji"
        rom = kana_to_romaji(hira)
        if rom is None:
            return None, None, None, "unmapped-mora"
        rom_pieces = [p for p in rom.split() if p]
        if len(rom_pieces) != len(pieces):
            return None, None, None, f"piece-drift:{len(rom_pieces)}!={len(pieces)}"
        letters = [ch for rp in rom_pieces for ch in rp]
        if any(ch not in char_id for ch in letters):
            bad = sorted({ch for ch in letters if ch not in char_id})
            return None, None, None, f"unmapped-letter:{bad}"
        tokens_starred: list[str] = []
        tgt_ids: list[int] = []
        for rp in rom_pieces:
            tokens_starred.append("<star>")
            tgt_ids.append(star)
            for ch in rp:
                tokens_starred.append(ch)
                tgt_ids.append(char_id[ch])
        wav = load_audio(str(pack / row["file"]), model.dtype, "cpu")
        emissions, stride = generate_emissions(model, wav, batch_size=8)
        if emissions.shape[1] != star + 1:
            return None, None, None, f"emission-vocab:{emissions.shape[1]}!={star + 1}"
        # package convention: tokens are the starred STRING tokens; ids are
        # resolved via its dictionary (star appended at len(vocab)).
        segments, path_scores, blank_label = get_alignments(
            emissions, tokens_starred, tokenizer)
        spans = get_spans(tokens_starred, segments, blank_label)
        if len(spans) != len(tokens_starred):
            return None, None, None, f"span-count:{len(spans)}!={len(tokens_starred)}"
        import math
        import numpy as np
        # path_scores is forced_align's per-INPUT-FRAME log-prob of the path
        # label (len == emission frames; blank frames included).
        ps = np.asarray(
            path_scores.numpy() if hasattr(path_scores, "numpy") else path_scores,
            dtype=float).reshape(-1)
        mask = np.zeros(ps.size, dtype=bool)
        for seg in segments:
            if seg.label != blank_label:
                mask[seg.start:seg.end + 1] = True
        conf = math.exp(float(ps[mask].mean())) if mask.any() else 0.0
        fit = math.exp(float(ps.mean())) if ps.size else 0.0
        # letter spans -> piece spans (letters in order, piece boundaries by
        # cumulative romanized length)
        letter_spans = [sp for tk, sp in zip(tokens_starred, spans) if tk != "<star>"]
        words = []
        li = 0
        prev_e = -1.0
        for p, rp in zip(pieces, rom_pieces):
            grp = letter_spans[li:li + len(rp)]
            li += len(rp)
            if not grp:
                return None, conf, fit, "empty-letter-span"
            # get_spans returns, per token, a LIST of Segments (blank-padded
            # at the edges); word span = first segment of first letter's
            # span .. last segment of last letter's span.
            s_t = grp[0][0].start * stride / 1000.0
            e_t = (grp[-1][-1].end + 1) * stride / 1000.0
            if e_t > row.get("seconds", 1e9) + SLACK or s_t < -0.01 \
                    or s_t < prev_e - 0.05:
                return None, conf, fit, "span-out-of-clip"
            words.append({"w": p, "s": round(s_t, 3), "e": round(e_t, 3)})
            prev_e = e_t
        return words, conf, fit, ""

    # contrast cross-score matrix: each clip must align better to its OWN
    # text than to its minimal-pair twin's text (the pack's built-in proof).
    if contrast and not args.skip_contrast:
        pairs: dict[str, list[dict]] = collections.defaultdict(list)
        for r in contrast:
            pairs[r["id"].rsplit("-", 1)[0]].append(r)
        contrast_out = []
        for stem, pair in sorted(pairs.items()):
            if len(pair) != 2:
                continue
            a, b = pair
            sa = align_clip(a)
            sb = align_clip(b)
            xa = align_clip(dict(b, file=a["file"]))   # B's text on A's audio
            yb = align_clip(dict(a, file=b["file"]))   # A's text on B's audio
            rom_a = kana_to_romaji(fold_text(a["text"]) or "")
            rom_b = kana_to_romaji(fold_text(b["text"]) or "")
            if rom_a is not None and rom_a == rom_b:
                verdict = "indistinguishable-romaji"
            else:
                # compare FIT (full-path posterior): the axis that penalizes
                # a mismatched-length text absorbing audio as blank frames.
                win_a = (sa[2] or 0) > (xa[2] or 0)
                win_b = (sb[2] or 0) > (yb[2] or 0)
                verdict = "correct" if win_a and win_b else "WRONG"
            contrast_out.append({"pair": stem, "metric": "fit",
                                 "own_a": sa[2], "cross_a": xa[2],
                                 "own_b": sb[2], "cross_b": yb[2],
                                 "conf_a": sa[1], "conf_b": sb[1],
                                 "verdict": verdict})
            print(f"contrast {stem}: own_fit_a={sa[2]} cross_fit_a={xa[2]} "
                  f"own_fit_b={sb[2]} cross_fit_b={yb[2]} {verdict}",
                  file=sys.stderr, flush=True)
        Path(str(args.report) + ".contrast.json").write_text(
            json.dumps(contrast_out, ensure_ascii=False, indent=1), encoding="utf-8")

    sink = None if probe else out.open("a", encoding="utf-8")
    rsink = args.report.open("a", encoding="utf-8")
    n_ok = n_ab = 0
    scores_all: list[float] = []
    t0 = time.time()
    try:
        for i, row in enumerate(targets, 1):
            words, conf, fit, reason = align_clip(row)
            line = None
            if words is not None and conf < args.min_score:
                reason = f"low-posterior:{conf:.4f}"
                words = None
            if words is not None:
                line = {"id": row["id"], "words": words}
                bad = check_schema(line)
                if bad:
                    reason = f"schema-violation:{bad}"
                    words, line = None, None
            if words is not None and sink is not None:
                sink.write(json.dumps(line, ensure_ascii=False) + "\n")
                sink.flush()
                os.fsync(sink.fileno())
            rec = {"id": row["id"]}
            if conf is not None and fit is not None:
                rec["score"] = round(conf, 4)
                rec["fit"] = round(fit, 4)
            if words is not None:
                rec["via"] = "forced-align"
                n_ok += 1
            else:
                rec["reason"] = reason
                rec["text"] = row["text"]
                n_ab += 1
            rsink.write(json.dumps(rec, ensure_ascii=False) + "\n")
            rsink.flush()
            if conf is not None:
                scores_all.append(conf)
            if probe or i % 100 == 0 or i == len(targets):
                el = time.time() - t0
                print(f"{i}/{len(targets)} ok={n_ok} abstain={n_ab} "
                      f"({el / max(i, 1):.2f}s/clip, {el / 60:.1f} min)",
                      file=sys.stderr, flush=True)
    finally:
        if sink is not None:
            sink.close()
        rsink.close()

    if scores_all:
        import statistics
        print(f"scores: n={len(scores_all)} min={min(scores_all):.4f} "
              f"median={statistics.median(scores_all):.4f} "
              f"max={max(scores_all):.4f}", file=sys.stderr, flush=True)
    print(f"run done: ok={n_ok} abstain={n_ab}", file=sys.stderr, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
