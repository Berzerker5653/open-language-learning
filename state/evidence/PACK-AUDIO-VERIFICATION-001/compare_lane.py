#!/usr/bin/env python3
"""Compare a lane's sample verdicts against GamingPC baseline.
ACCEPT requires: zero fail->ok flips and total mismatch rate <= 2%."""
import json, sys, pathlib

base_f, lane_f, name = sys.argv[1:4]
ev = pathlib.Path('/home/hunter/game-dev/LTS/state/evidence/PACK-AUDIO-VERIFICATION-001')
base = {}
for l in pathlib.Path(base_f).read_text().splitlines():
    if l.strip():
        r = json.loads(l); base[r['id']] = r['status']
lane = {}
for l in pathlib.Path(lane_f).read_text().splitlines():
    if l.strip():
        r = json.loads(l); lane[r['id']] = r['status']

common = set(lane) & set(base)
diff = [i for i in common if base[i] != lane[i]]
f2o = sum(1 for i in diff if lane[i] == 'ok')
o2f = sum(1 for i in diff if base[i] == 'ok')
other = len(diff) - f2o - o2f
total_diff = len(diff)
mr = total_diff / len(common) if common else 1.0
accept = f2o == 0 and mr <= 0.02 and len(common) >= 60
verdict = (f"{'ACCEPT' if accept else 'REJECT'} lane={name} n={len(common)} "
           f"fail->ok={f2o} ok->fail={o2f} other={other} mismatch_rate={mr:.3f}")
(ev / 'lanes' / f'LANE-{name}-VERDICT.txt').write_text(verdict + '\n')
print(verdict)
sys.exit(0 if accept else 1)
