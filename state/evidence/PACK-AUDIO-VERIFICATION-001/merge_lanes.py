#!/usr/bin/env python3
"""Merge remote lane rows into the GamingPC baseline ASR jsonl (idempotent).

Lane rows only ADD ids the baseline never covered; on overlap the baseline row
wins, but a status disagreement on the same id is reported loudly (it should
never happen post-identity-gate). Verifies full manifest coverage at the end.
"""
import json, pathlib, sys, collections

EV = pathlib.Path('/home/hunter/game-dev/LTS/state/evidence/PACK-AUDIO-VERIFICATION-001')
BASE = EV / 'full-audit-2026-10-28' / 'asr-ru-RU.jsonl'
LANES = EV / 'lanes'
MANIFEST = pathlib.Path('/home/hunter/game-dev/LTS/languages/ru-RU/media/manifest.jsonl')

def load(p):
    rows = {}
    for l in p.read_text().splitlines():
        if l.strip():
            r = json.loads(l)
            rows.setdefault(r['id'], r)
    return rows

base = load(BASE)
added = collections.Counter()
conflicts = []
for lane_f in sorted(LANES.glob('asr-*.jsonl')):
    lane = load(lane_f)
    for i, r in lane.items():
        if i in base:
            if base[i]['status'] != r['status']:
                conflicts.append((lane_f.name, i, base[i]['status'], r['status']))
        else:
            base[i] = r
            added[lane_f.name] += 1

want = {json.loads(l)['id'] for l in MANIFEST.read_text().splitlines() if l.strip()}
missing = sorted(want - set(base))

tmp = BASE.with_suffix('.jsonl.merged')
with tmp.open('w', encoding='utf-8') as f:
    for r in base.values():
        f.write(json.dumps(r, ensure_ascii=False) + '\n')

print(f"base_rows_pre={len(base)-sum(added.values())} added={dict(added)} "
      f"total={len(base)} manifest={len(want)} missing={len(missing)} conflicts={len(conflicts)}")
for c in conflicts[:10]:
    print('CONFLICT', c)
for m in missing[:10]:
    print('MISSING', m)
if conflicts:
    sys.exit(2)
if missing:
    print('NOT swapped: coverage incomplete')
    tmp.unlink()
    sys.exit(1)
tmp.rename(BASE)
print('MERGED_AND_SWAPPED rows=' + str(len(base)))
print('status_mix=' + json.dumps(collections.Counter(r['status'] for r in base.values())))
