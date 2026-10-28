#!/bin/sh
# Wait for the owner to stop the inference server, then restart the whole-corpus
# ASR audit at full width. Detached on purpose: it must work after the session's
# own model has gone away with strata.
while systemctl --user is-active -q omp-strata.service; do sleep 5; done
sleep 15                      # let the ~72 GB actually return to the pool
me=$$
for p in $(pgrep -f 'qa-asr|reaudit-asr'); do
  [ "$p" = "$me" ] && continue
  kill "$p" 2>/dev/null
done
sleep 5
echo "[handoff] strata down; audit restarted at full width $(date -Is)"
echo "[handoff] MemAvailable $(awk '/MemAvailable/{print int($2/1048576)}' /proc/meminfo) GB"
WORKERS=8 sh reaudit-asr.sh
