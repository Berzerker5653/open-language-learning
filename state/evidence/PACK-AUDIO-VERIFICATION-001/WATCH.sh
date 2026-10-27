#!/bin/sh
# PACK-AUDIO-VERIFICATION-001 round-2 progress dashboard (GamingPC).
# One screen, refreshed every ${1:-20} s: what the chain is doing right now,
# how much of the 382-clip residue is settled, the measured take rate, and the
# ETA that rate implies. Read-only - it never touches the campaign.
#   sh WATCH.sh        20 s refresh
#   sh WATCH.sh 5      5 s refresh
#   WATCH_LOG=0 ...    skip the log tail
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="/home/hunter/game-dev/LTS"
PY="$HOME/.venvs/qwen-tts/bin/python"
[ -x "$PY" ] || PY=python3
interval=${1:-20}

while :; do
  clear 2>/dev/null || printf '\n\n'
  printf '=== round-2 best-of-K campaign  %s  (refresh %ss) ===\n' "$(date -Is)" "$interval"
  if pgrep -f "local-chain.sh" >/dev/null 2>&1; then
    printf 'chain: RUNNING   bake: %s worker(s): %s\n' \
      "$(pgrep -cf bake-bestof.py || echo 0)" "$(pgrep -cf qwen3-tts-worker.py || echo 0)"
  else
    printf 'chain: NOT RUNNING (start: sh %s/local-chain.sh)\n' "$HERE"
  fi
  awk '/MemAvailable/{printf "memory: %d GB available   ", $2/1048576}' /proc/meminfo
  printf 'load: %s\n' "$(cut -d' ' -f1-3 /proc/loadavg)"

  "$PY" - "$HERE" "$REPO" <<'PYEOF'
import glob, json, os, sys, time
here, repo = sys.argv[1], sys.argv[2]

# targets = the ids queued for round 2
targets = {}
for f in sorted(glob.glob(os.path.join(here, "retry-batches", "*.txt"))):
    pack = "ja-JP" if os.path.basename(f).startswith("ja-") else "ru-RU"
    targets[pack] = targets.get(pack, 0) + sum(1 for l in open(f) if l.strip())

# settled = assets whose round-2 checkpoint has a verdict
done = {}
for f in sorted(glob.glob(os.path.join(here, "bestof-*-r2-*.jsonl"))):
    for line in open(f, encoding="utf-8"):
        if not line.strip():
            continue
        r = json.loads(line)
        pack = "ja-JP" if "-ja-r2-" in f else "ru-RU"
        d = done.setdefault(pack, {"solved": 0, "exhausted": 0})
        d["solved" if r["result"] != "exhausted" else "exhausted"] += 1
    m = os.path.getmtime(f)
    newest = max(newest or m, m)

K = {"ja-JP": 6, "ru-RU": 8}
total_t = total_d = 0
for pack in ("ja-JP", "ru-RU"):
    t = targets.get(pack, 0)
    d = done.get(pack, {"solved": 0, "exhausted": 0})
    settled = d["solved"] + d["exhausted"]
    total_t += t; total_d += settled
    print(f"{pack}: {settled}/{t} ids settled ({d['solved']} newly certified, "
          f"{d['exhausted']} still exhausted), K={K[pack]}")

# take rate: measured over a rolling 15-minute window from samples this
# dashboard writes (the bake log carries no timestamps, so file times are not a
# rate). takes = TTS generations logged by the newest round-2 bake log.
logs = [f for f in glob.glob(os.path.join(here, "bestof-*-r2-*.log"))]
if logs:
    log = max(logs, key=os.path.getmtime)
    takes = sum(1 for l in open(log, errors="ignore") if "pad_token_id" in l)
    now = time.time()
    state = os.environ.get("WATCH_STATE", "/tmp/watch-r2-rate.state")
    samples = []
    if os.path.exists(state):
        for line in open(state):
            t, n = line.split()
            if now - float(t) <= 900:
                samples.append((float(t), int(n)))
    if samples and samples[-1][1] > takes:      # a new batch log started
        samples = []
    samples.append((now, takes))
    try:
        open(state, "w").write("".join(f"{t:.0f} {n}\n" for t, n in samples))
    except OSError:
        pass
    rate = 0.0
    if len(samples) >= 2:
        span = samples[-1][0] - samples[0][0]
        if span > 120:
            rate = (samples[-1][1] - samples[0][1]) / span * 3600
        print(f"current bake: {os.path.basename(log)}  {takes} takes logged; "
              f"measured {rate:.0f} takes/h over the last {span/60:.0f} min")
    else:
        print(f"current bake: {os.path.basename(log)}  {takes} takes logged; "
              f"rate appears after 2 min of samples")
    avail = 0
    for line in open("/proc/meminfo"):
        if line.startswith("MemAvailable"):
            avail = int(line.split()[1]) // 1048576
            break
    if avail < 8:
        print(f"WARNING: MemAvailable {avail} GB - campaign and inference "
              f"server are thrashing memory; stop strata or run JOBS=1")
    unsettled = {p: max(0, targets.get(p, 0) - sum(done.get(p, {}).values()))
                 for p in ("ja-JP", "ru-RU")}
    rem = sum(unsettled.values())
    worst = sum(unsettled[p] * K[p] for p in unsettled)
    if rate > 0:
        print(f"remaining ids: {rem} -> ETA {worst/rate:.1f} h worst case "
              f"(every id burns K), {sum(unsettled[p]*4 for p in unsettled)/rate:.1f} h "
              f"if most clear in ~4 takes")
    print(f"campaign progress: {total_d}/{total_t} ids settled "
          f"({100*total_d/total_t:.1f}%)")
PYEOF

  printf -- '--- chain log (last 6) ---\n'
  tail -6 "$HERE/local-chain.log" 2>/dev/null
  printf -- '--- last commits ---\n'
  git -C "$REPO" log --oneline -3 2>/dev/null
  sleep "$interval"
done
