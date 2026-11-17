#!/usr/bin/env python3
"""Trim leading/trailing silence from pack wavs (structure:gap repair lever).

Stdlib only. Resumable: trim-log.jsonl carries settled ids; rerun skips them.
Originals are backed up to <evdir>/orig/<id>.wav exactly once, BEFORE any edit.
Trimming keeps 80ms of edge padding so the clip never starts/ends clipped.

Usage: trim-wavs.py --ids ids.txt --pack-dir languages/ru-RU --evdir trim [--limit N]
"""
import argparse, json, os, wave, struct, sys

PAD_MS = 80
THRESH = 150  # abs amplitude floor (of 32767); TTS dead air sits well under this

def rms_leadin_tail(frames, sw):
    fmt = '<' + 'h' * (len(frames) // sw)
    s = struct.unpack(fmt, frames[: len(frames) - len(frames) % sw])
    return max(s, key=abs) if s else 0

def find_edges(samples, sr):
    lo = 0
    while lo < len(samples) and abs(samples[lo]) < THRESH:
        lo += 1
    hi = len(samples)
    while hi > lo and abs(samples[hi - 1]) < THRESH:
        hi -= 1
    pad = int(sr * PAD_MS / 1000)
    return max(0, lo - pad), min(len(samples), hi + pad)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', required=True)
    ap.add_argument('--pack-dir', required=True)
    ap.add_argument('--evdir', required=True)
    ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()
    ids = [l.strip() for l in open(a.ids) if l.strip()]
    if a.limit: ids = ids[:a.limit]
    os.makedirs(a.evdir, exist_ok=True)
    os.makedirs(os.path.join(a.evdir, 'orig'), exist_ok=True)
    logp = os.path.join(a.evdir, 'trim-log.jsonl')
    done = set()
    if os.path.exists(logp):
        for l in open(logp):
            try: done.add(json.loads(l)['id'])
            except Exception: pass
    out = open(logp, 'a')
    n = 0
    for i in ids:
        if i in done: continue
        p = os.path.join(a.pack_dir, 'media', i + '.wav')
        if not os.path.exists(p):
            rec = {'id': i, 'status': 'no-wav'}
        else:
            orig = os.path.join(a.evdir, 'orig', i + '.wav')
            if not os.path.exists(orig):
                import shutil; shutil.copy2(p, orig)
            try:
                with wave.open(orig, 'rb') as w:
                    sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
                    data = w.readframes(w.getnframes())
                if ch != 1 or sw != 2:
                    rec = {'id': i, 'status': 'bad-format', 'ch': ch, 'sw': sw}
                else:
                    s = struct.unpack('<' + 'h' * (len(data) // 2), data)
                    lo, hi = find_edges(s, sr)
                    kept = s[lo:hi]
                    rec = {'id': i, 'status': 'trimmed',
                           'before_ms': round(len(s) / sr * 1000),
                           'after_ms': round(len(kept) / sr * 1000),
                           'lead_ms': round(lo / sr * 1000),
                           'tail_ms': round((len(s) - hi) / sr * 1000)}
                    with wave.open(p, 'wb') as w:
                        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
                        w.writeframes(struct.pack('<' + 'h' * len(kept), *kept))
            except Exception as e:
                rec = {'id': i, 'status': 'error', 'err': str(e)[:120]}
        out.write(json.dumps(rec, ensure_ascii=False) + '\n'); out.flush(); os.fsync(out.fileno())
        n += 1
        print(json.dumps(rec, ensure_ascii=False))
    print(f'DONE trimmed {n} ids this run', file=sys.stderr)

if __name__ == '__main__':
    main()
