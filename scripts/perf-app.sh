#!/usr/bin/env bash
# PERF-002 application-level performance harness (Linux, headless).
#
# Measures the RELEASE binary (target/release/lts-desktop) against the
# app.*/memory.*/disk.* lines of docs/performance/BUDGETS.yaml. Reuses the
# BOOT-002 headless pattern from scripts/smoke-desktop.sh: virtual X server,
# throwaway LTS_DATA_DIR, and the app's own smoke markers via LTS_SMOKE_FILE.
# The app is NOT modified; every number comes from the app's existing markers
# or from /proc sampling of the live process.
#
# Measurements per machine:
#   1. machine identity            -> $OUT/machine.json
#   2. cold start: process exec -> first route ack (`smoke-ok home`), N runs
#   3. full smoke walk with VmRSS sampled from /proc/<pid>/status every 2 s
#   4. disk: built deb, bare release binary, installed pack store
#   5. session-plan reference costs from the walk's own call-ms markers
# Outputs: $OUT/machine.json, $OUT/metrics.json, $OUT/$LABEL-$DATE_TAG.md.
# Exits 0 only when every leg produced clean numbers; a failed walk is still
# recorded honestly in the evidence file before exiting non-zero.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/tauri-env.sh

BIN=${LTS_PERF_BIN:-target/release/lts-desktop}
OUT=${LTS_PERF_OUT:-state/evidence/PERF-002}
LABEL=${LTS_PERF_LABEL:-gamingpc}
DATE_TAG=${LTS_PERF_DATE:-$(date +%F)}
COLD_RUNS=${LTS_PERF_COLD_RUNS:-5}
COLD_TIMEOUT_MS=${LTS_PERF_COLD_TIMEOUT_MS:-120000}
WALK_TIMEOUT=${LTS_PERF_WALK_TIMEOUT:-900}
RSS_INTERVAL=${LTS_PERF_RSS_INTERVAL:-2}
DEB=${LTS_PERF_DEB:-target/release/bundle/deb/open-language-learning-platform_0.4.3-alpha.1_amd64.deb}
APPIMAGE=${LTS_PERF_APPIMAGE:-target/release/bundle/appimage/open-language-learning-platform_0.4.0-alpha.1_amd64.AppImage}

die() { echo "FAIL: $*" >&2; }

[ -x "$BIN" ] || { die "$BIN not built — build the release binary first"; exit 1; }
command -v Xvfb >/dev/null || { die "Xvfb missing (install xorg server, e.g. xorg-server-xvfb)"; exit 1; }
command -v jq >/dev/null || { die "jq missing"; exit 1; }
# The app is single-instance (PS-05b): a live instance — the developer's own
# desktop app included — would swallow a launched run. Refuse before any work.
if pgrep -f "$(pwd)/$BIN" >/dev/null 2>&1 || pgrep -x lts-desktop >/dev/null 2>&1; then
  die "an lts-desktop instance is already running; close it (single-instance forwarding would capture the runs)"
  exit 1
fi

mkdir -p "$OUT"

# ---------------------------------------------------------------------------
# Virtual X server on a dedicated display: the user's own $DISPLAY is never
# touched, and one server spans all runs so X startup is not billed to the
# per-run exec->home timing (the timer wraps the binary exec only).
# ---------------------------------------------------------------------------
XNUM=""
for n in 97 98 99 100 101 102; do
  if [ ! -e "/tmp/.X$n-lock" ]; then XNUM=$n; break; fi
done
[ -n "$XNUM" ] || { die "no free X display in :97-:102"; exit 1; }
XDISPLAY=":$XNUM"
Xvfb "$XDISPLAY" -screen 0 1280x800x24 -nolisten tcp >/dev/null 2>&1 &
XPID=$!
trap 'if [ -n "${XPID:-}" ]; then kill "$XPID" 2>/dev/null || true; fi;
      for d in ${TMP_CLEAN:-}; do rm -rf "$d"; done; true' EXIT
TMP_CLEAN=""
sleep 1
kill -0 "$XPID" 2>/dev/null || { die "Xvfb $XDISPLAY failed to start"; exit 1; }
export DISPLAY="$XDISPLAY"

now_ms() { date +%s%3N; }
loadavg13() { cut -d' ' -f1-3 /proc/loadavg; }

reap() { # TERM the app and its WebKit children, escalate, then a grace beat
  local pid=$1 i
  pkill -TERM -P "$pid" 2>/dev/null || true
  kill -TERM "$pid" 2>/dev/null || true
  for i in $(seq 1 50); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
  if kill -0 "$pid" 2>/dev/null; then kill -KILL "$pid" 2>/dev/null || true; fi
  wait "$pid" 2>/dev/null || true
  # single-instance forwarding dies with the old instance — let it fully fade
  sleep 0.5
}

# nearest-rank percentiles from numbers on stdin -> "n p50 p95"
pct() {
  sort -n | awk '{a[NR]=$1} END{n=NR; if(n==0){print "0 0 0"; exit}
    i50=int(0.5*n+0.999999); if(i50<1)i50=1;
    i95=int(0.95*n+0.999999); if(i95<1)i95=1;
    print n, a[i50], a[i95]}'
}

# ---------------------------------------------------------------------------
# 1. machine identity
# ---------------------------------------------------------------------------
echo "== machine identity =="
OS_PRETTY=$(. /etc/os-release && echo "${PRETTY_NAME:-unknown}")
KERNEL=$(uname -r)
CPU_MODEL=$(lscpu | awk -F: '/Model name/{sub(/^ +/,"",$2); print $2; exit}')
NPROC=$(nproc)
PHYS_CORES=$(lscpu -p=Core,Socket 2>/dev/null | awk -F, '!/^#/ {print $1"-"$2}' | sort -u | wc -l)
SOCKETS=$(lscpu | awk -F: '/^Socket\(s\)/{gsub(/ /,"",$2); print $2}')
MHZ_MAX=$(lscpu | awk -F: '/CPU max MHz/{gsub(/ /,"",$2); print $2}')
GOV=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null || echo "unavailable")
AVX512=$(grep -c avx512f /proc/cpuinfo || true)
MEM_TOTAL_KB=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
MEM_AVAIL_KB=$(awk '/^MemAvailable:/{print $2}' /proc/meminfo)
SWAP_TOTAL_KB=$(awk '/^SwapTotal:/{print $2}' /proc/meminfo)
LSPCI_GPU=$(lspci 2>/dev/null | grep -iE 'vga |3d controller|display controller' || true)
if command -v nvidia-smi >/dev/null 2>&1; then
  NVIDIA_PRESENT=true
  NVIDIA_LIST=$(nvidia-smi -L 2>&1 || true)
  NVIDIA_VRAM=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || true)
else
  NVIDIA_PRESENT=false; NVIDIA_LIST=""; NVIDIA_VRAM=""
fi
LOAD_BEFORE=$(loadavg13)
jq -n \
  --arg ts "$(date -u +%FT%TZ)" \
  --arg os "$OS_PRETTY" --arg kernel "$KERNEL" \
  --arg cpu "$CPU_MODEL" --argjson threads "$NPROC" --argjson phys_cores "$PHYS_CORES" \
  --arg sockets "$SOCKETS" --arg mhz_max "$MHZ_MAX" --arg governor "$GOV" \
  --argjson avx512f_present "$([ "$AVX512" -gt 0 ] && echo true || echo false)" \
  --argjson mem_total_mb "$((MEM_TOTAL_KB/1024))" --argjson mem_available_mb "$((MEM_AVAIL_KB/1024))" \
  --argjson swap_total_mb "$((SWAP_TOTAL_KB/1024))" \
  --arg lspci_gpu "$LSPCI_GPU" --argjson nvidia_present "$NVIDIA_PRESENT" \
  --arg nvidia_smi_l "$NVIDIA_LIST" --arg nvidia_vram "$NVIDIA_VRAM" \
  --arg loadavg_before "$LOAD_BEFORE" \
  '{schema:"perf-app/1.0", collected_utc:$ts, os:$os, kernel:$kernel,
    cpu:{model:$cpu, threads:$threads, physical_cores:$phys_cores, sockets:$sockets,
        max_mhz:$mhz_max, governor:$governor, avx512f_present:$avx512f_present},
    memory:{total_mb:$mem_total_mb, available_mb:$mem_available_mb, swap_total_mb:$swap_total_mb},
    gpu:{lspci:$lspci_gpu, nvidia_present:$nvidia_present, nvidia_smi_l:$nvidia_smi_l, nvidia_vram:$nvidia_vram},
    loadavg_before:$loadavg_before}' > "$OUT/machine.json"
cat "$OUT/machine.json"

# ---------------------------------------------------------------------------
# 2. cold start: exec -> first route ack, COLD_RUNS runs
# ---------------------------------------------------------------------------
# `smoke-ok home` is the walkthrough's mount-time ack (App.tsx smoke branch,
# first marker written by the app). The poll is pure bash (no exec per tick)
# at ~10 ms, so the figure overestimates by well under a frame.
echo "== cold start x $COLD_RUNS (exec -> smoke-ok home) =="
declare -a COLD_MS COLD_LOAD
FAIL_REASON=""
for run in $(seq 1 "$COLD_RUNS"); do
  MARK=$(mktemp -u /tmp/lts-perf-mark.XXXXXX)
  DATA=$(mktemp -d /tmp/lts-perf-data.XXXXXX)
  ERR=$(mktemp /tmp/lts-perf-err.XXXXXX)
  COLD_LOAD+=("$(loadavg13)")
  LTS_DATA_DIR="$DATA" LTS_SMOKE_FILE="$MARK" "$BIN" >/dev/null 2>"$ERR" &
  PID=$!
  T0=$(now_ms); FOUND=0
  while [ $(( $(now_ms) - T0 )) -lt "$COLD_TIMEOUT_MS" ]; do
    if [ -f "$MARK" ] && [ -f /proc/$PID/status ] && [[ $(<"$MARK") == *"smoke-ok home"* ]]; then FOUND=1; break; fi
    kill -0 "$PID" 2>/dev/null || break
    sleep 0.01
  done
  T1=$(now_ms)
  reap "$PID"
  if [ "$FOUND" = 1 ]; then
    COLD_MS+=("$((T1 - T0))")
    echo "  run $run: $((T1 - T0)) ms (loadavg ${COLD_LOAD[$((run-1))]})"
  else
    FAIL_REASON="cold run $run never reached the first-route ack (exit-to-ack window ${COLD_TIMEOUT_MS} ms); stderr: $(tail -3 "$ERR" 2>/dev/null | tr '\n' ' ')"
    cp "$ERR" "$OUT/cold-run-$run-stderr.txt" 2>/dev/null || true
    rm -f "$MARK" "$ERR"; rm -rf "$DATA"
    break
  fi
  rm -f "$MARK" "$ERR"; rm -rf "$DATA"
done

# ---------------------------------------------------------------------------
# 3. full smoke walk with RSS sampling (only if cold runs all reached home)
# ---------------------------------------------------------------------------
RSS="$OUT/rss-samples.txt"; : > "$RSS"
WALK_MARK_COPY="$OUT/walk-marker.txt"
if [ -z "$FAIL_REASON" ]; then
  echo "== full smoke walk (RSS every ${RSS_INTERVAL}s) =="
  MARK=$(mktemp -u /tmp/lts-perf-mark.XXXXXX)
  DATA=$(mktemp -d /tmp/lts-perf-data.XXXXXX)
  WALKLOG=$(mktemp /tmp/lts-perf-walk.XXXXXX)
  LOAD_WALK_BEFORE=$(loadavg13)
  LTS_DATA_DIR="$DATA" LTS_SMOKE_FILE="$MARK" timeout "$WALK_TIMEOUT" env "$BIN" >"$WALKLOG" 2>&1 &
  TPID=$!
  APPPID=""
  for _ in $(seq 1 100); do
    APPPID=$(pgrep -P "$TPID" 2>/dev/null | head -1 || true)
    if [ -n "$APPPID" ]; then break; fi
    sleep 0.1
  done
  [ -n "$APPPID" ] || FAIL_REASON="walk: never saw the app process under timeout(1)"
  if [ -z "$FAIL_REASON" ]; then
    # liveness key is the APP pid: timeout(1) reaps it, so kill -0 goes false
    # promptly (TPID would linger as a waitable zombie and spin this loop)
    while kill -0 "$APPPID" 2>/dev/null; do
      MAIN_KB=$(awk '/VmRSS:/{print $2}' "/proc/$APPPID/status" 2>/dev/null || echo "")
      if [ -n "$MAIN_KB" ]; then
        TREE_KB=$( { ps -o rss= --ppid "$APPPID" 2>/dev/null || true; } | awk '{s+=$1} END{print s+0}')
        printf '%s %s %s\n' "$(date +%s)" "$MAIN_KB" "$((MAIN_KB + TREE_KB))" >> "$RSS"
      fi
      sleep "$RSS_INTERVAL"
    done
  fi
  set +e; wait "$TPID"; WALK_STATUS=$?; set -e
  LOAD_WALK_AFTER=$(loadavg13)
  if [ -z "$FAIL_REASON" ] && [ ! -f "$MARK" ]; then
    FAIL_REASON="walk: smoke marker never written (exit $WALK_STATUS); walk log tail: $(tail -3 "$WALKLOG" | tr '\n' ' ')"
  fi
  if [ -z "$FAIL_REASON" ] && grep -q 'walkthrough-error' "$MARK"; then
    FAIL_REASON="walk: $(grep 'walkthrough-error' "$MARK" | head -1)"
  fi
  if [ -z "$FAIL_REASON" ] && grep -q '^smoke-ok paint-stall' "$MARK"; then
    FAIL_REASON="walk: paint stall at $(grep '^smoke-ok paint-stall' "$MARK" | head -1)"
  fi
  if [ -z "$FAIL_REASON" ] && ! grep -q 'routes-complete' "$MARK"; then
    FAIL_REASON="walk: never completed (exit $WALK_STATUS)"
  fi
  NROUTES=0
  if [ -f "$MARK" ]; then NROUTES=$(grep -c '^smoke-ok route:' "$MARK" || true); fi
  if [ -z "$FAIL_REASON" ] && [ "$NROUTES" -lt 12 ]; then
    FAIL_REASON="walk: only $NROUTES route acks; expected at least 12"
  fi
  if [ -z "$FAIL_REASON" ]; then
    cp "$MARK" "$WALK_MARK_COPY"
    ROUTE_MS=$(grep '^smoke-ok route-ms:' "$MARK" | sed 's/^smoke-ok route-ms://' || true)
    ROUTE2_MS=$(grep '^smoke-ok route-2ms:' "$MARK" | sed 's/^smoke-ok route-2ms://' || true)
    CALL_MS=$(grep '^smoke-ok call-ms:' "$MARK" | sed 's/^smoke-ok call-ms://' || true)
    PLAN_MS=$(grep '^smoke-ok call-ms:practice_plan:' "$MARK" | head -1 | cut -d: -f3 || true)
    PLACE_MS=$(grep '^smoke-ok call-ms:placement_plan:' "$MARK" | head -1 | cut -d: -f3 || true)
    HOME_STATE_MS=$(grep '^smoke-ok call-ms:home_state:' "$MARK" | head -1 | cut -d: -f3 || true)
    FRESH_PLAN=$(grep '^smoke-ok fresh-plan:' "$MARK" | head -1 | cut -d: -f2 || true)
    ALIGNER=$(grep '^smoke-ok aligner:' "$MARK" | head -1 | sed 's/^smoke-ok aligner://' || true)
    SCENARIO=$(grep '^smoke-ok scenario-' "$MARK" | sed 's/^smoke-ok //' | tr '\n' ';' || true)
    WALK_WALL="" # wall time is not the subject here; the walk's own markers carry the costs
    echo "  SMOKE OK ($NROUTES routes walked)"
    echo "  route-ms: $(echo "$ROUTE_MS" | tr '\n' ' ')"
    echo "  call-ms:  $(echo "$CALL_MS" | tr '\n' ' ')"
  else
    cp "$WALKLOG" "$OUT/walk-failed-log.txt" 2>/dev/null || true
    echo "  WALK FAILED: $FAIL_REASON" >&2
  fi
  rm -f "$MARK" "$WALKLOG" 2>/dev/null || true
  TMP_CLEAN="$TMP_CLEAN $DATA"
fi

# ---------------------------------------------------------------------------
# 4. disk: installed bundle sizes + installed pack size from the store
# ---------------------------------------------------------------------------
if [ -z "$FAIL_REASON" ]; then
  echo "== disk =="
  BIN_BYTES=$(du -sb "$BIN" | cut -f1)
  DEB_BYTES=$(du -sb "$DEB" | cut -f1)
  APPIMAGE_BYTES=0; APPIMAGE_STATE="absent"
  if [ -f "$APPIMAGE" ]; then APPIMAGE_BYTES=$(du -sb "$APPIMAGE" | cut -f1); APPIMAGE_STATE="stale (0.4.0-alpha.1, not the binary under test)"; fi
  if [ -d "$DATA/packs" ]; then
    PACKS_BYTES=$(du -sb "$DATA/packs" | cut -f1)
    PACK_BREAKDOWN=$(find "$DATA/packs" -mindepth 2 -maxdepth 2 -type d -exec du -sb {} \; | awk '{printf "%s %d bytes\n", $2, $1}')
  else
    PACKS_BYTES=0
    PACK_BREAKDOWN="(no packs installed in the throwaway store)"
  fi
  DATA_BYTES=$(du -sb "$DATA" | cut -f1)
  echo "  binary $BIN_BYTES B, deb $DEB_BYTES B, packs $PACKS_BYTES B, data-dir $DATA_BYTES B"
fi

# ---------------------------------------------------------------------------
# 5. session plan: reported from the walk's own warm call-ms markers above.
# BUDGETS `app.session_plan_10k_evidence_ms` names a 10k-evidence corpus; the
# smoke walk plans on a fresh profile with a single bundled pack, and no
# outside-the-app lever exists to synthesize 10k evidence events. So the line
# is recorded unevaluable, with the fresh-profile number as context only.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# stats + verdicts
# ---------------------------------------------------------------------------
if [ -z "$FAIL_REASON" ]; then
  read -r N P50 P95 < <(printf '%s\n' "${COLD_MS[@]}" | pct)
  COLD_P50=$P50; COLD_P95=$P95
  # RSS stats: main-process column 2 and process-tree column 3 (kB -> MB int)
  { read -r RSS_N RSS_FIRST RSS_MIN RSS_MED RSS_MAX; read -r TN TFIRST TMIN TMED TMAX; } < <(awk '{t[NR]=$2; r[NR]=$3} END{
    n=NR; if(n==0){print "0 0 0 0 0"; print "0 0 0 0 0"; exit}
    asort(t); asort(r);
    printf "%d %d %d %d %d\n", n, t[1], t[1], t[int((n+1)/2)], t[n];
    printf "%d %d %d %d %d\n", n, r[1], r[1], r[int((n+1)/2)], r[n];
  }' "$RSS")
  # base MB = median of samples (steady state); peak = max; delta = peak - min
  BASE_MB=$((RSS_MED/1024)); MIN_MB=$((RSS_MIN/1024)); PEAK_MB=$((RSS_MAX/1024)); DELTA_MB=$((PEAK_MB-MIN_MB))
  TBASE_MB=$((TMED/1024)); TMIN_MB=$((TMIN/1024)); TPEAK_MB=$((TMAX/1024)); TDELTA_MB=$((TPEAK_MB-TMIN_MB))
  BASE_INSTALL_MB=$((DEB_BYTES/1000000)); BIN_MB=$((BIN_BYTES/1000000)); APPIMG_MB=$((APPIMAGE_BYTES/1000000)); PACK_MB=$((PACKS_BYTES/1000000))
  MB=1048576
  BIN_MIB=$((BIN_BYTES/MB)); DEB_MIB=$((DEB_BYTES/MB)); PACK_MIB=$((PACKS_BYTES/MB))
  [ "$BASE_MB" -le 400 ] && V_MEM=PASS || V_MEM=FAIL
  [ "$BASE_INSTALL_MB" -le 250 ] && V_DISK=PASS || V_DISK=FAIL
  [ "$COLD_P50" -le 800 ] && [ "$COLD_P95" -le 2000 ] && V_START_T=PASS || V_START_T=FAIL
  [ "$COLD_P50" -le 1500 ] && [ "$COLD_P95" -le 3500 ] && V_START_L=PASS || V_START_L=FAIL
fi

# ---------------------------------------------------------------------------
# metrics.json + evidence md
# ---------------------------------------------------------------------------
if [ -z "$FAIL_REASON" ]; then
  COLD_JSON=$(printf '%s\n' "${COLD_MS[@]}" | jq -s .)
  COLDLOAD_JSON=$(printf '%s\n' "${COLD_LOAD[@]}" | jq -R . | jq -s .)
  jq -n \
    --arg schema "perf-app/1.0" --arg ts "$(date -u +%FT%TZ)" --arg bin "$BIN" \
    --argjson cold_ms "$COLD_JSON" --argjson cold_loadavg "$COLDLOAD_JSON" \
    --argjson cold_n "$N" --argjson cold_p50 "$COLD_P50" --argjson cold_p95 "$COLD_P95" \
    --argjson rss_samples "$RSS_N" --argjson rss_min_mb "$MIN_MB" --argjson rss_base_mb "$BASE_MB" \
    --argjson rss_peak_mb "$PEAK_MB" --argjson rss_peak_delta_mb "$DELTA_MB" \
    --argjson tree_min_mb "$TMIN_MB" --argjson tree_base_mb "$TBASE_MB" --argjson tree_peak_mb "$TPEAK_MB" \
    --argjson tree_peak_delta_mb "$TDELTA_MB" \
    --argjson routes "$NROUTES" --argjson plan_practice_ms "${PLAN_MS:-0}" \
    --argjson plan_placement_ms "${PLACE_MS:-0}" --argjson plan_home_state_ms "${HOME_STATE_MS:-0}" \
    --argjson fresh_plan_items "${FRESH_PLAN:-0}" \
    --argjson deb_bytes "$DEB_BYTES" --argjson binary_bytes "$BIN_BYTES" \
    --argjson appimage_bytes "$APPIMAGE_BYTES" --argjson packs_bytes "$PACKS_BYTES" --argjson data_bytes "$DATA_BYTES" \
    --argjson v_startup_typical "\"$V_START_T\"" --argjson v_startup_low "\"$V_START_L\"" \
    --argjson v_mem "\"$V_MEM\"" --argjson v_disk "\"$V_DISK\"" \
    '{schema:$schema, collected_utc:$ts, binary:$bin,
      startup:{runs_ms:$cold_ms, loadavg_per_run:$cold_loadavg, n:$cold_n, p50_ms:$cold_p50, p95_ms:$cold_p95,
        boundary:"process exec -> first app marker (`smoke-ok home`)",
        poll_resolution_ms:10},
      memory:{samples:$rss_samples, interval_s:2, basis_main:"VmRSS of the lts-desktop process",
        basis_tree:"main + direct children (WebKit web/network processes)",
        main_mb:{min:$rss_min_mb, base_median:$rss_base_mb, peak:$rss_peak_mb, peak_delta:$rss_peak_delta_mb},
        tree_mb:{min:$tree_min_mb, base_median:$tree_base_mb, peak:$tree_peak_mb, peak_delta:$tree_peak_delta_mb}},
      walk:{routes_acked:$routes, practice_plan_ms:$plan_practice_ms, placement_plan_ms:$plan_placement_ms,
        home_state_ms:$plan_home_state_ms, fresh_plan_items:$fresh_plan_items},
      disk_bytes:{deb:$deb_bytes, release_binary:$binary_bytes, appimage_stale:$appimage_bytes,
        installed_packs:$packs_bytes, throwaway_data_dir:$data_bytes},
      verdicts:{startup_to_home_typical:$v_startup_typical, startup_to_home_low:$v_startup_low,
        app_rss_base_mb:$v_mem, base_install_mb:$v_disk}}' > "$OUT/metrics.json"
else
  jq -n --arg schema "perf-app/1.0" --arg ts "$(date -u +%FT%TZ)" --arg bin "$BIN" --arg reason "$FAIL_REASON" \
    '{schema:$schema, collected_utc:$ts, binary:$bin, failed:$true, failure:$reason}' > "$OUT/metrics.json"
fi

EVID="$OUT/$LABEL-$DATE_TAG.md"
{
cat <<EOF
# PERF-002 — app-level performance measurement ($LABEL, $DATE_TAG)

Card: PERF-002. Measures the release desktop binary against the \`app.*\`,
\`memory.*\` and \`disk.*\` lines of \`docs/performance/BUDGETS.yaml\` (provisional
targets; this file records measurements only — it does NOT freeze budgets and
does NOT edit BUDGETS.yaml). Speech lines are excluded: their evidence already
exists in \`state/evidence/PERF-001/tier-omarchy-2026-10-08.md\` and was not
re-run. Harness: \`scripts/perf-app.sh\` (rerunnable, headless).

## Environment

$(jq -r '"- **OS**: \(.os), kernel \(.kernel)
- **CPU**: \(.cpu.model) — \(.cpu.physical_cores) physical cores / \(.cpu.threads) threads, \(.cpu.sockets) socket(s); max \(.cpu.max_mhz) MHz; governor `\(.cpu.governor)`; AVX-512F: \(if .cpu.avx512f_present then "present" else "absent" end)
- **Memory**: \(.memory.total_mb) MB total, \(.memory.available_mb) MB available at check; swap \(.memory.swap_total_mb) MB
- **GPU**: \(.gpu.lspci)
- **NVIDIA**: \(if .gpu.nvidia_present then "\(.gpu.nvidia_smi_l)" else "nvidia-smi absent" end)\(if .gpu.nvidia_vram != "" then "; \(.gpu.nvidia_vram)" else "" end)
- **Load**: \(.loadavg_before) before the run" ' "$OUT/machine.json")

Tier-class facts (from machine.json only, no membership claim): see verdicts
section. Commands: \`lscpu\`, \`free\` via /proc/meminfo, \`lspci | grep -iE 'vga|3d|display'\`,
\`nvidia-smi -L\`, /etc/os-release, \`uname -r\`, cpufreq governor, /proc/loadavg.
EOF
if [ -z "$FAIL_REASON" ]; then
cat <<EOF

## Protocol (deviations recorded honestly)

- Cold start boundary: BUDGETS says app_end = "first interactive paint (home
  route mounted, input handler attached)". The closest marker the app itself
  emits is the walkthrough's mount-time ack \`smoke-ok home\` — React mounted
  and native IPC answering. Measured as: fork+exec of the release binary ->
  that line visible in the marker file, polled at ~10 ms (overestimate < frame).
- Cold runs: $COLD_RUNS runs (BUDGETS cold protocol: 3), fresh process and
  fresh throwaway LTS_DATA_DIR per run; page cache NOT flushed (needs root;
  same deviation class as PERF-001 recorded for trials). Percentiles:
  nearest-rank over $N samples (p95 = max of $N).
- X: one persistent Xvfb (\`-screen 0 1280x800x24\`) on a dedicated display spans
  all runs so X startup is not billed to per-run exec->home time. The binary
  forces the WebKit DMABUF fallback itself (lib.rs \`force_webkit_fallback_renderer\`).
- RSS: \`/proc/<pid>/status\` VmRSS every ${RSS_INTERVAL} s during one full smoke walk;
  sampling cannot catch sub-${RSS_INTERVAL}s spikes; "base" = median of samples,
  peak-delta = max - min. Main-process and process-tree totals both reported.
- No other CPU-heavy processes were started; per-run load average recorded
  below and in metrics.json.

## Cold start ($COLD_RUNS runs, exec -> first route ack)

Command: \`scripts/perf-app.sh\` (binary: \`$BIN\`)

| run | ms | loadavg |
|---|---|---|
$(for i in "${!COLD_MS[@]}"; do echo "| $((i+1)) | ${COLD_MS[$i]} | ${COLD_LOAD[$i]} |"; done)

**p50 = ${COLD_P50} ms, p95 = ${COLD_P95} ms** (nearest-rank, n=$N). Raw JSON: \`metrics.json\`.

## Memory during the full smoke walk ($RSS_N samples, ${RSS_INTERVAL} s apart)

| basis | min MB | base (median) MB | peak MB | peak delta MB |
|---|---|---|---|---|
| main process VmRSS | $MIN_MB | $BASE_MB | $PEAK_MB | $DELTA_MB |
| process tree (main + WebKit children) | $TMIN_MB | $TBASE_MB | $TPEAK_MB | $TDELTA_MB |

Raw samples: \`state/evidence/PERF-002/rss-samples.txt\` (epoch, main kB, tree kB).
Walk: **SMOKE OK ($NROUTES routes walked)**; walk marker kept at
\`state/evidence/PERF-002/walk-marker.txt\`. Loadavg before/after the walk:
$LOAD_WALK_BEFORE / $LOAD_WALK_AFTER.

## Disk

| artifact | bytes | MiB (1048576) |
|---|---|---|
| built deb \`$(basename "$DEB")\` | $DEB_BYTES | $DEB_MIB |
| \`$BIN\` (installed executable) | $BIN_BYTES | $BIN_MIB |
| installed packs in throwaway store (\`packs/\`) | $PACKS_BYTES | $PACK_MIB |
| whole throwaway LTS_DATA_DIR (profiles.db + packs) | $DATA_BYTES | $((DATA_BYTES/MB)) |
| AppImage (stale: $(basename "$APPIMAGE"), $APPIMAGE_STATE) | $APPIMAGE_BYTES | $APPIMG_MB |

Pack breakdown from the store:
\`\`\`
$PACK_BREAKDOWN
\`\`\`

## Session-plan costs (from the walk's own \`call-ms\` markers)

| command | ms |
|---|---|
| practice_plan(profileId, 10 min) | $PLAN_MS |
| placement_plan | $PLACE_MS |
| home_state | $HOME_STATE_MS |

These are warm calls on a fresh profile with one bundled pack (the pack
contributes a small evidence base: fresh-plan produced $FRESH_PLAN items).
BUDGETS' \`app.session_plan_10k_evidence_ms\` specifies a **10k-evidence**
corpus; there is no outside-the-app lever to seed 10k evidence events into a
profile without editing app code (out of scope for this card), so that line
is recorded unevaluable below — the fresh-profile number is context, not a
verdict on the 10k condition.

## Walk diagnostics (context, not budgets)

- route-ms: $(echo "$ROUTE_MS" | tr '\n' ' ')
- route-2ms (return visit): $(echo "$ROUTE2_MS" | tr '\n' ' ')
- aligner: $ALIGNER
- scenario leg: $SCENARIO
EOF
else
cat <<EOF

## RUN FAILED (recorded honestly — no numbers fabricated)

\`$FAIL_REASON\`

Machine identity (\`machine.json\`) was collected before the failure. Cold-run
stderr (if any): \`cold-run-*-stderr.txt\` / walk log: \`walk-failed-log.txt\` in
this directory. Every budget line below is therefore **unevaluable on this
machine until the failure is resolved and the harness is re-run**.
EOF
fi
cat <<EOF

## Budget verdicts (docs/performance/BUDGETS.yaml, provisional values; read not edited)

| budget line | tier | budget | measured | verdict |
|---|---|---|---|---|
| app.startup_to_home_interactive_ms | typical | p50 800 / p95 2000 ms | $( [ -z "$FAIL_REASON" ] && echo "p50 $COLD_P50 / p95 $COLD_P95 ms" || echo "not run") | $( [ -z "$FAIL_REASON" ] && echo "$V_START_T" || echo unevaluable) |
| app.startup_to_home_interactive_ms | low | p50 1500 / p95 3500 ms | $( [ -z "$FAIL_REASON" ] && echo "p50 $COLD_P50 / p95 $COLD_P95 ms" || echo "not run") | $( [ -z "$FAIL_REASON" ] && echo "$V_START_L" || echo unevaluable) |
EOF
if [ -z "$FAIL_REASON" ]; then
cat <<EOF
| app.session_plan_10k_evidence_ms | typical | p50 50 / p95 150 ms | 10k-evidence condition not producible externally; fresh-profile practice_plan = ${PLAN_MS} ms | unevaluable (with recorded reference) |
| app.session_plan_10k_evidence_ms | low | p50 120 / p95 400 ms | same as above | unevaluable (with recorded reference) |
| app.ui_responsiveness_during_inference.input_to_paint_ms | all tiers | p95 100 ms | no ASR/TTS inference runs in the smoke walk; the BUDGETS method (synthetic key event -> rAF delta during inference) is not instrumentable from outside without app edits | unevaluable |
| app.ui_responsiveness_during_inference.main_thread_max_block_ms | all tiers | p95 50 ms | same instrumentation gap as above | unevaluable |
| app.cancellation.asr_cancel_effect_ms | all tiers | p95 250 ms | no ASR session exists in the smoke walk to cancel; app code has no external trigger for this path | unevaluable |
| memory.app_rss_base_mb | typical | 400 MB | base ${BASE_MB} MB (main VmRSS median; tree basis ${TBASE_MB} MB) | $V_MEM (main-process basis) |
| memory.app_rss_base_mb | low | 400 MB | same measurement | $V_MEM (main-process basis) |
| disk.base_install_mb | all tiers | 250 MB | deb ${DEB_MIB} MiB; installed release binary ${BIN_MIB} MiB | $V_DISK (deb basis; binary also under budget) |
| disk.compact_speech_bundle_mb | all tiers | 300 MB | no speech model bundle was installed in the measured session (the smoke walk installs only the language pack, ${PACK_MIB} MiB, which is content not a speech bundle) | unevaluable |
| disk.recommended_speech_bundle_mb | all tiers | 1500 MB | same: no speech bundle in this session | unevaluable |
EOF
else
cat <<EOF
| app.* | — | — | not run | unevaluable |
| memory.app_rss_base_mb | — | 400 MB | not run | unevaluable |
| disk.* | — | — | not run | unevaluable |
EOF
fi
cat <<EOF

Adjacent lines outside this card's app/memory.app*/disk.* scope, for the
record: \`memory.total_with_compact_model_mb\` and \`memory.gpu_vram_with_recommended_model_mb\`
stay unevaluable here — no speech model was loaded during the app walk (the
walk never starts ASR/TTS), so the app+model total and VRAM lines need the
speech harnesses' RSS deltas plus a paired app run to combine.

## Rerun on another machine

    cd <repo>
    scripts/perf-app.sh                     # writes state/evidence/PERF-002/
    # or with a machine label / date override:
    LTS_PERF_LABEL=omarchy LTS_PERF_DATE=2026-10-20 scripts/perf-app.sh

Requirements: built release binary at \`$BIN\` (no cargo invocation by this
script), built deb at \`$DEB\` (override via \`LTS_PERF_DEB=\`), Xvfb, jq,
webkit2gtk per \`scripts/tauri-env.sh\`, and NO running lts-desktop instance
(single-instance app, PS-05b). Tunables: \`LTS_PERF_COLD_RUNS\` (5),
\`LTS_PERF_WALK_TIMEOUT\` (${WALK_TIMEOUT} s), \`LTS_PERF_RSS_INTERVAL\` (${RSS_INTERVAL} s).
EOF
} > "$EVID"
echo "wrote $EVID, $OUT/machine.json, $OUT/metrics.json"

if [ -n "$FAIL_REASON" ]; then
  echo "FAIL: $FAIL_REASON" >&2
  exit 1
fi
echo "SMOKE OK ($NROUTES routes walked) — perf-app complete"
