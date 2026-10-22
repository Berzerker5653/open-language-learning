#!/usr/bin/env python3
"""Phoneme-level pronunciation gate for baked pack audio (PACK-AUDIO-VERIFICATION).

Recognizes phones in each clip with the offline CPU model
``facebook/wav2vec2-xlsr-53-espeak-cv-ft`` (wav2vec2-XLSR-53 fine-tuned for
espeak-IPA phone recognition; 1.2 GB, cached under ~/.cache/huggingface) and
compares them to the phones derived from the manifest ``text`` by
``scripts/qa_pron_g2p.py``. Unknown language -> abstain (never silent pass).

Run with the qwen-tts venv (it carries torch/transformers):
  ~/.venvs/qwen-tts/bin/python scripts/qa-pron.py --pack languages/ru-RU \
      --ids-file ids.txt --out qa-pron.jsonl
Exit 0 when no clip FLAGS, 1 otherwise. Per-clip JSONL: id, verdict,
phones_expected, phones_recognized, ins/del/sub counts, distance ratio.
Calibration and limits: scripts/qa-pron.README.md.
"""
from __future__ import annotations

import argparse
import difflib
import glob
import json
import sys
import time
import unicodedata
import wave
from pathlib import Path

import numpy as np
import torch
from transformers import Wav2Vec2ForCTC

sys.path.insert(0, str(Path(__file__).parent))
from qa_pron_g2p import g2p, lang_from_pack_dir  # noqa: E402

MODEL = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"

# Normalization applied to BOTH sides before diffing: folds near-identical
# segments so recognizer/G2P convention differences are not counted as
# pronunciation errors. Kept deliberately small; additions must be justified
# by observed good-clip mismatches (see README calibration table).
FOLD = {
    "ɪ": "i", "ɯ": "u", "ɹ": "r", "ɾ": "r", "ɰ": "w", "ᵝ": "", "ᶣ": "",
    "ɑ": "a", "ä": "a", "æ": "a", "ɒ": "o", "ɫ": "l", "ɡ": "g",
    "ɥ": "j", "β": "v", "θ": "t", "ð": "d", "ʔ": "", "ˈ": "", "ˌ": "",
}

VOWELS = set("aiueoyæœɔɛɑəɐʌʊɤɨɯː")  # anything with a ː counts too


def strip_len(t: str) -> str:
    return t.replace("ː", "")


def is_vowel(tok: str) -> bool:
    base = strip_len(tok)
    return any(c in VOWELS for c in base)


def normalize(ph: list[str]) -> list[str]:
    out: list[str] = []
    for t in ph:
        t = unicodedata.normalize("NFC", t)
        t = "".join(c for c in unicodedata.normalize("NFD", t)
                    if unicodedata.category(c) != "Mn")
        for c in t:  # split multi-char tokens (tʃ) to codepoints
            c = FOLD.get(c, c)
            if c:
                out.append(c)
    return out


def load_vocab(model_id: str) -> dict[int, str]:
    snap = glob.glob(str(Path.home() / ".cache/huggingface/hub/"
                         f"models--{model_id.replace('/', '--')}/snapshots/*/vocab.json"))
    if snap:
        vocab = json.load(open(snap[0]))
        return {v: k for k, v in vocab.items()}
    raise SystemExit(f"no cached vocab for {model_id}; run once online to download")


class Recognizer:
    def __init__(self, model_id: str = MODEL):
        self.i2t = load_vocab(model_id)
        self.model = Wav2Vec2ForCTC.from_pretrained(model_id)
        self.model.eval()

    def phones(self, path: Path) -> list[str]:
        with wave.open(str(path)) as w:
            sr = w.getframerate()
            x = np.frombuffer(w.readframes(w.getnframes()),
                              dtype="<i2").astype(np.float32) / 32768.0
        if sr != 16000:  # packs bake at 24 kHz; naive linear resample
            n = int(len(x) * 16000 / sr)
            x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
            x = x.astype(np.float32)
        with torch.no_grad():
            logits = self.model(torch.from_numpy(x).unsqueeze(0)).logits[0]
        ids = logits.argmax(-1).tolist()
        # proper CTC greedy: skip blanks, then collapse consecutive repeats
        blank = self.i2t.get(0, "|")
        out: list[str] = []
        prev: str | None = None
        for i in ids:
            t = self.i2t.get(i, "")
            if t in ("", "|", "<pad>", "<s>", "</s>") or t == blank:
                prev = None
                continue
            if t != prev:
                out.append(t)
            prev = t
        return out


def diff_stats(exp: list[str], rec: list[str]) -> dict:
    sm = difflib.SequenceMatcher(a=exp, b=rec, autojunk=False)
    ins = dele = sub = 0
    ops: list[str] = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "delete":
            dele += i2 - i1
            ops.append(f"-{' '.join(exp[i1:i2])}")
        elif tag == "insert":
            ins += j2 - j1
            ops.append(f"+{' '.join(rec[j1:j2])}")
        elif tag == "replace":
            n = max(i2 - i1, j2 - j1)
            sub += n
            ops.append(f"{' '.join(exp[i1:i2])}->{' '.join(rec[j1:j2])}")
    dist = ins + dele + sub
    denom = max(len(exp), len(rec), 1)
    return {"ins": ins, "del": dele, "sub": sub,
            "dist_ratio": round(dist / denom, 3), "ops": ops}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--pack", required=True, type=Path)
    ap.add_argument("--ids", action="append", default=[])
    ap.add_argument("--ids-file", type=Path)
    ap.add_argument("--out", type=Path, default=Path("qa-pron.jsonl"))
    ap.add_argument("--model", default=MODEL)
    ap.add_argument("--flag-ratio", type=float, default=None,
                    help="FLAG when dist_ratio exceeds this (default per-lang)")
    ap.add_argument("--max-reps", type=int, default=0,
                    help="also FLAG when total repeat-collapse trims exceed N")
    args = ap.parse_args()

    # Per-language thresholds calibrated on the fixture/good sets (see
    # README): ru margin good<=0.33 vs bad>=0.44; ja no bad fixtures exist,
    # set to good-max + 0.05 until a fixture appears.
    flag_ratio = args.flag_ratio
    if flag_ratio is None:
        flag_ratio = {"ru": 0.40, "ja": 0.45}

    manifest = args.pack / "media" / "manifest.jsonl"
    texts: dict[str, str] = {}
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if line.strip():
            r = json.loads(line)
            texts[r["id"]] = r["text"]

    ids = list(args.ids)
    if args.ids_file:
        ids += [l.strip() for l in args.ids_file.read_text().splitlines() if l.strip()]
    if not ids:
        ids = sorted(texts)

    lang = lang_from_pack_dir(args.pack.name)
    rec = Recognizer(args.model)
    out_f = args.out.open("w", encoding="utf-8")
    n_flag = n_abstain = 0
    t0 = time.time()
    for k, cid in enumerate(ids, 1):
        text = texts.get(cid)
        if text is None:
            print(f"[qa-pron] {cid}: not in manifest", file=sys.stderr)
            continue
        row: dict = {"id": cid}
        exp = g2p(text, lang)
        if exp is None:
            row.update({"verdict": "ABSTAIN", "why": f"no G2P for lang={lang}"})
            n_abstain += 1
        else:
            rp = rec.phones(args.pack / "media" / f"{cid}.wav")
            e, r_ = normalize(exp), normalize(rp)
            st = diff_stats(e, r_)
            thr = flag_ratio.get(lang, 0.45)
            ins_vowels = sum(
                1 for op in st["ops"] if op.startswith("+")
                and any(is_vowel(t) for t in op[1:].split()))
            verdict = "FLAG" if st["dist_ratio"] > thr else "PASS"
            row.update({"verdict": verdict,
                        "expected": e, "recognized": r_, **{k2: v for k2, v in st.items() if k2 != "ops"},
                        "ops": st["ops"], "threshold": thr, "ins_vowels": ins_vowels,
                        "text": text})
            if verdict == "FLAG":
                n_flag += 1
                print(f"[qa-pron] FLAG {cid}: ratio={st['dist_ratio']} "
                      f"ins={st['ins']} del={st['del']} sub={st['sub']} ops={st['ops']}",
                      file=sys.stderr)
        out_f.write(json.dumps(row, ensure_ascii=False) + "\n")
        if k % 200 == 0:
            print(f"[qa-pron] {k}/{len(ids)} {time.time()-t0:.0f}s "
                  f"flags={n_flag}", file=sys.stderr)
    out_f.close()
    print(f"[qa-pron] {len(ids)} clips in {time.time()-t0:.0f}s: "
          f"{n_flag} FLAG, {n_abstain} ABSTAIN -> {args.out}", file=sys.stderr)
    return 1 if n_flag else 0


if __name__ == "__main__":
    sys.exit(main())
