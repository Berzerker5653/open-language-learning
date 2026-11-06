#!/usr/bin/env python3
"""Split remaining ru-RU audit ids across lanes + pick a stratified identity
sample whose GamingPC verdicts are already known."""
import json, random, pathlib

REPO = pathlib.Path('/home/hunter/game-dev/LTS')
EV = REPO / 'state/evidence/PACK-AUDIO-VERIFICATION-001'
BASE = EV / 'full-audit-2026-10-28'
LANES = EV / 'lanes'
LANES.mkdir(exist_ok=True)

ids = [json.loads(l)['id'] for l in
       (REPO / 'languages/ru-RU/media/manifest.jsonl').read_text().splitlines() if l.strip()]
done = {}
for l in (BASE / 'asr-ru-RU.jsonl').read_text().splitlines():
    if l.strip():
        r = json.loads(l)
        done[r['id']] = r

remaining = [i for i in ids if i not in done]

hi = [i for i in done if done[i]['status'] == 'ok' and done[i].get('ratio', 0) >= 0.97]
lo = [i for i in done if done[i]['status'] == 'ok' and done[i].get('ratio', 0) < 0.97]
fl = [i for i in done if done[i]['status'] != 'ok']
rnd = random.Random(20261105)
sample = rnd.sample(sorted(hi), 35) + rnd.sample(sorted(lo), 25) + rnd.sample(sorted(fl), 20)

n = len(remaining)
n_om = int(n * 0.31)
n_wk = int(n * 0.14)
(LANES / 'sample-ids.txt').write_text('\n'.join(sample) + '\n')
(LANES / 'om-ids.txt').write_text('\n'.join(remaining[:n_om]) + '\n')
(LANES / 'wk-ids.txt').write_text('\n'.join(remaining[n_om:n_om + n_wk]) + '\n')
print(f'remaining={n} sample={len(sample)} om_shard={n_om} wk_shard={n_wk} local_shard={n - n_om - n_wk}')
print(f'strata hi={len(hi)} lo={len(lo)} fail={len(fl)}')
