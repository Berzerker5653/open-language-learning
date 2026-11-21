#!/usr/bin/env python3
"""JA-B1-003-FIX-002 ASR content-check runner.
Uses the PRODUCTION fold/verdict imported live from scripts/qa-asr.py.
The v5 duration cap is kept with the same formula, but its syllable counter's
vowel class is Cyrillic-only, which scores 0 syllables for kana text and would
flag every sentence clip at a 1.30s cap. Equivalent mora-aware count applied
instead (kana vowel morae incl. ん/ー; small kana and digits not counted).
qa-asr.py itself is NOT modified.
"""
import importlib.util, json, subprocess, sys, threading, wave
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path('/home/hunter/game-dev/LTS')
PACK = REPO / 'languages/ja-JP'
MODEL = str(Path.home() / '.cache/lts-bench/ggml-large-v3-turbo.bin')
WHISPER = str(REPO / 'state/evidence/PACK-AUDIO-VERIFICATION-001/whisper-gate.sh')
OUT = Path('/home/hunter/.hermes/cache/scratch/fix2-asr-v2.jsonl')

spec = importlib.util.spec_from_file_location('qa_asr', REPO / 'scripts/qa-asr.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
verdict = qa.verdict

KANA = set('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
           'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょっ'
           'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
           'ガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポャュョッヷ'
           'ぁぃぅぇぉァィゥェォ')
VOWEL_KANA = set('あいうえおアイウエオ'
                 'かきくけコカキクケコ' ) # placeholder, real logic below

# mora = kana syllabic chars: consonant+kana (1 mora), standalone vowel kana, ん, ー;
# small kana (ゃゅょッ ぁぃぅぇぉ etc.) carry no mora.
SMALL = set('ゃゅょャュョッヵ ヮ'
            'ぁぃぅぇぉァィゥェォ'
            'ー')
def morae(text):
    n = 0
    for ch in text:
        o = ord(ch)
        if 0x3041 <= o <= 0x3096 or 0x30A1 <= o <= 0x30FA:  # kana block
            if ch in SMALL:
                continue
            n += 1
    # ー extends previous mora's vowel: counts as a mora of audio time
    n += text.count('ー')
    return n

ids = set(x.strip() for x in open('/home/hunter/.hermes/cache/scratch/fix2_asr_ids.txt') if x.strip())
rows = []
for line in open(PACK / 'media/manifest.jsonl'):
    line = line.strip()
    if line:
        r = json.loads(line)
        if r['id'] in ids:
            rows.append(r)
assert len(rows) == 50, len(rows)

lock = threading.Lock()
outf = open(OUT, 'w', buffering=1)
done = [0]

def run(r):
    wav = PACK / r['file']
    with wave.open(str(wav), 'rb') as w:
        dur = w.getnframes() / float(w.getframerate())
    m = morae(r['text'])
    cap = 1.3 + 0.45 * m
    if dur > cap:
        res = {"id": r['id'], "status": "MISMATCH", "text": r['text'],
               "reasons": [f"duration-suspect ({dur:.2f}s > {cap:.2f}s cap, mora={m})"], "mora": m, "duration": round(dur,2)}
    else:
        try:
            p = subprocess.run([WHISPER, "-m", MODEL, "-l", "ja", "-np", "-nt", str(wav)],
                               capture_output=True, text=True, timeout=300)
        except subprocess.TimeoutExpired:
            res = {"id": r['id'], "status": "timeout", "text": r['text']}
        else:
            heard = p.stdout.strip()
            try:
                ok, ratio, reasons, rescued = verdict(r['text'], heard, "ja")
            except Exception as e:
                res = {"id": r['id'], "status": "check-error", "err": repr(e), "text": r['text']}
            else:
                res = {"id": r['id'], "status": "ok" if ok else "MISMATCH", "ratio": ratio,
                       "text": r['text'], "heard": heard, "mora": m, "duration": round(dur,2)}
                if reasons: res["reasons"] = reasons
                if rescued: res["rescued"] = True
    with lock:
        outf.write(json.dumps(res, ensure_ascii=False) + '\n')
        done[0] += 1
        print(f"{done[0]}/50 {r['id']} {res['status']}", flush=True)

print(f"targets={len(rows)}", flush=True)
with ThreadPoolExecutor(max_workers=6) as ex:
    for _ in ex.map(run, rows):
        pass
outf.close()
# summary
res = [json.loads(l) for l in open(OUT)]
from collections import Counter
c = Counter(r['status'] for r in res)
print('SUMMARY', dict(c), flush=True)
bad = [r for r in res if r['status'] != 'ok']
for r in bad:
    print('BAD', r['id'], r.get('reasons'), 'heard=', r.get('heard'), flush=True)
