#!/usr/bin/env bash
# BOOT-002 automated smoke test: build the native shell, launch it under a
# virtual X server, and require the launch handshake plus the POLISH-001
# full-route walkthrough (every route nav button clicked, each acked from
# the UI). Proves: binary builds, window/webview starts, frontend bundle
# loads, onboarding IPC completes, React mounts every route, and
# native<->web IPC works. Exits non-zero on failure.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/tauri-env.sh

# Xvfb has no DRI3, and the debug binary forces the fallback renderer itself,
# so the launch handshake still completes without a script-level export.

echo "== build frontend + native binary (debug, no bundle) =="
if command -v pnpm >/dev/null 2>&1; then
  pnpm --filter @openlang/desktop exec tauri build --debug --no-bundle
else
  # pnpm missing (e.g. bare node installs): build the same artifacts
  # directly. Debug WebviewUrl::default() loads the devUrl, so also
  # serve the frontend on :1420 for the walkthrough.
  (cd apps/desktop && ./node_modules/.bin/vite build)
  # vite must run from apps/desktop: the config's root is the app dir,
  # so a repo-root cwd serves index.html 404 and the webview hangs.
  (cd apps/desktop && exec ../../apps/desktop/node_modules/.bin/vite --port 1420 --strictPort) \
    > /tmp/lts-smoke-vite.log 2>&1 &
  VITE_PID=$!
  trap 'kill "$VITE_PID" 2>/dev/null || true' EXIT
  sleep 2
  cargo build -p lts-desktop
fi

BIN="target/debug/lts-desktop"
if [ ! -x "$BIN" ]; then
  echo "FAIL: $BIN not found after build" >&2
  exit 1
fi

MARKER=$(mktemp -u /tmp/lts-smoke.XXXXXX)
DATA=$(mktemp -d /tmp/lts-smoke-data.XXXXXX)
trap 'rm -f "$MARKER"; rm -rf "$DATA"' EXIT

echo "== launch under Xvfb =="
# With webkit2gtk in the user-local sysroot, WebKitGTK still resolves helper
# processes from its compiled-in dir; scripts/setup-tauri-sysroot.sh patches
# that string to ~/.wk41, a symlink dir to the sysroot helpers.
# LTS_DATA_DIR keeps the walkthrough's profile/pack install out of the
# developer's real data directory.
# K-68 consequence, measured 2026-10-08: the reference pack now ships audio
# for every lexicon word (~336 MiB of media), and the walkthrough's install
# leg pays archive build + sha re-verification + extraction for that payload.
# The old 90 s watchdog killed a healthy install; the new one still names a
# genuine hang as a hang.
STATUS=0
LTS_DATA_DIR="$DATA" LTS_SMOKE_FILE="$MARKER" timeout 240 xvfb-run -a -s "-screen 0 1280x800x24" "./$BIN" || STATUS=$?

if [ ! -f "$MARKER" ]; then
  echo "FAIL: smoke marker not written (exit $STATUS)" >&2
  exit 1
fi
cat "$MARKER"
if grep -q 'walkthrough-error' "$MARKER"; then
  echo "FAIL: walkthrough reported an error" >&2
  exit 1
fi
# The walkthrough must never hang. A frame budget that never completes is
# reported with the route it stalled on, so a freeze names itself instead of
# surfacing as a harness timeout.
if grep -q '^smoke-ok paint-stall' "$MARKER"; then
  echo "FAIL: rendering stalled at: $(grep '^smoke-ok paint-stall' "$MARKER" | sed 's/^smoke-ok paint-stall://' | tr '\n' ' ')" >&2
  exit 1
fi
if ! grep -q 'routes-complete' "$MARKER"; then
  echo "FAIL: walkthrough never completed (exit $STATUS)" >&2
  exit 1
fi
NROUTES=$(grep -c '^smoke-ok route:' "$MARKER")
# K-77 (owner 2026-10-09) folded Languages into Settings, so the nav has
# twelve tabs; the floor is one below the tab count, as before.
if [ "$NROUTES" -lt 10 ]; then
  echo "FAIL: only $NROUTES route acks; expected at least 10" >&2
  exit 1
fi
# K-63: the owner reported route switches that felt dead, and an impression is
# not something a regression can be checked against. Every switch is timed
# inside the real webview (click -> painted) and the numbers are printed. The
# figure below is a STALL GUARD, not a performance budget: the interactive
# budgets live in docs/performance/BUDGETS.yaml (PERF-001, provisional) and are
# measured properly by PERF-002. This catches a route that stops answering, and
# it records navigation cost on every run so a change that makes switching
# slower is visible rather than merely felt.
ROUTE_STALL_MS=${LTS_ROUTE_STALL_MS:-3000}
if ! grep -q '^smoke-ok route-ms:' "$MARKER"; then
  echo "FAIL: the walkthrough never timed a route switch (K-63)" >&2
  exit 1
fi
SLOW=$(grep '^smoke-ok route-ms:' "$MARKER" | awk -F: -v stall="$ROUTE_STALL_MS" \
  '$3+0 > stall { print $2" "$3"ms" }')
if [ -n "$SLOW" ]; then
  echo "FAIL: route switch(es) over the ${ROUTE_STALL_MS}ms stall guard -> $SLOW" >&2
  exit 1
fi
echo "route timings: $(grep '^smoke-ok route-ms:' "$MARKER" | sed 's/^smoke-ok route-ms://; s/:/ /' | tr '\n' ' ')"
echo "warm command costs: $(grep '^smoke-ok call-ms:' "$MARKER" | sed 's/^smoke-ok call-ms://; s/:/ /' | tr '\n' ' ')"
echo "return-visit cost: $(grep '^smoke-ok route-2ms:' "$MARKER" | sed 's/^smoke-ok route-2ms://; s/:/ /' | tr '\n' ' ')"
if ! grep -q '^goal-map-assert [1-9]' "$MARKER"; then
  echo "FAIL: goal map returned no goals (K-40)" >&2
  exit 1
fi
# D4 (ADR-0019): the app must state, over real IPC, which aligner runtime this
# build carries. The value depends on how the binary was built; the failure is
# never answering at all.
if ! grep -q '^smoke-ok aligner:' "$MARKER"; then
  echo "FAIL: the app never reported its aligner runtime status (D4/ADR-0019)" >&2
  exit 1
fi
echo "aligner runtime: $(grep '^smoke-ok aligner:' "$MARKER" | head -1 | sed 's/^smoke-ok aligner://')"
# K-60: the scenario actions have to survive the real IPC boundary. The
# walkthrough walks the learner's own click path (nav -> row -> Start), so the
# marker must show either a scenario that started (plus its step outcome) or a
# scenario that was legitimately locked with a stated reason. Silence means the
# command never answered — the kebab-case rename failure mode.
if ! grep -q '^smoke-ok scenario-\(started\|locked\)' "$MARKER"; then
  echo "FAIL: the walkthrough never reported a scenario outcome (K-60)" >&2
  exit 1
fi
echo "scenario leg: $(grep '^smoke-ok scenario-' "$MARKER" | sed 's/^smoke-ok //' | tr '\n' ' ')"
# K-64: microphone selection is a Settings control backed by a stored engine
# setting. The walkthrough walks into Settings, so the marker must show the
# picker actually rendered in the webview.
if ! grep -q '^smoke-ok mic-picker:present' "$MARKER"; then
  echo "FAIL: the Settings route never rendered the microphone picker (K-64)" >&2
  exit 1
fi
# K-66: a fresh profile must land in a guided first run: the plan is not
# empty, and the first-run guidance — the first three steps derived from the
# pack's own goal map, units, and orthography — is non-empty for the bundled
# ja-JP pack. A zero marker means the derivation abstained on data it has.
if ! grep -q '^smoke-ok fresh-plan:[1-9]' "$MARKER"; then
  echo "FAIL: the fresh profile's plan was empty (K-66)" >&2
  exit 1
fi
if ! grep -q '^smoke-ok first-run:[1-9]' "$MARKER"; then
  echo "FAIL: first-run guidance was empty for the ja-JP pack (K-66)" >&2
  exit 1
fi
echo "first run: $(grep -E '^smoke-ok (fresh-plan|first-run):' "$MARKER" | sed 's/^smoke-ok //' | tr '\n' ' ')"
# K-62: a long install has to keep the learner informed. The renderer records
# the stage events it actually received over the event channel, so this proves
# the channel delivered them — not merely that a listener was written.
for stage in prepare install record; do
  if ! grep -q "^smoke-ok progress:$stage:heard\$" "$MARKER"; then
    echo "FAIL: the renderer never heard the '$stage' stage of the pack install (K-62)" >&2
    exit 1
  fi
done
echo "SMOKE OK ($NROUTES routes walked)"
