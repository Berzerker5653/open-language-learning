#!/usr/bin/env bash
# LAN-TOGGLE-PIN-001: end-to-end smoke for the LAN toggle + pairing PIN.
#
# Runs lts-serve on an isolated LTS_DATA_DIR (the "main computer" never
# touches a learner's real store), toggles local-network access from the
# operator (loopback), then presents as a second device by driving the
# reported LAN address over the real network stack: unpaired reads are
# refused, the 6-digit PIN pairs once and sets a session cookie, and the
# pairing survives a full process restart (the phone reconnects without
# re-entering anything, exactly as docs/22 promises).
set -euo pipefail
cd "$(dirname "$0")/.."

export PORT="${PORT:-17642}"
BIN=target/debug/lts-serve

cargo build -q -p lts-desktop --features serve --bin lts-serve

WORK=$(mktemp -d)
SERVER_PID=""
stop_server() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
  fi
}
trap stop_server EXIT

start_server() {
  LTS_DATA_DIR="$WORK/data" "$BIN" "127.0.0.1:$PORT" >"$WORK/serve.log" 2>&1 &
  SERVER_PID=$!
  for _ in $(seq 1 40); do
    curl -sf "http://127.0.0.1:$PORT/api/capabilities" >/dev/null 2>&1 && return 0
    sleep 0.5
  done
  echo "FAIL: lts-serve did not come up"
  cat "$WORK/serve.log"
  exit 1
}

echo "== start lts-serve on an isolated data dir (loopback bind) =="
start_server

echo "== operator: switch on local-network access (loopback only) =="
curl -s -X POST "http://127.0.0.1:$PORT/lan/enable" \
  -H 'content-type: application/json' -d '{"enabled":true}' | tee "$WORK/enable.json"
PIN=$(python3 -c 'import json; print(json.load(open("'"$WORK"'/enable.json"))["pin"])')
test "$(printf '%s' "$PIN" | grep -cE '^[0-9]{6}$')" -eq 1
LAN_URL=$(python3 -c 'import json; a=json.load(open("'"$WORK"'/enable.json"))["addresses"]; print(a[0] if a else "")')
if [[ -z "$LAN_URL" ]]; then
  echo "FAIL: no LAN/tailnet interface to smoke against (this smoke needs a private or 100.64/10 iface)"
  exit 1
fi
LAN_URL=${LAN_URL%/}
echo "operator sees PIN $PIN; LAN address: $LAN_URL"

echo "== second device: unpaired data reads are refused =="
CODE=$(curl -s -o "$WORK/unpaired.json" -w '%{http_code}' -X POST "$LAN_URL/api/app_mode" \
  -H 'content-type: application/json' -d '{}')
test "$CODE" = "401"
grep -q "pairing required" "$WORK/unpaired.json"
echo "unpaired POST /api/app_mode -> 401 as expected: $(head -c 160 "$WORK/unpaired.json")"

echo "== second device: pair with the PIN (cookie jar = the phone's cookie) =="
CODE=$(curl -s -c "$WORK/cookies.txt" -o "$WORK/pair.json" -w '%{http_code}' -X POST "$LAN_URL/pair" \
  -H 'content-type: application/json' -d "{\"pin\":\"$PIN\"}")
test "$CODE" = "200"
grep -q '"paired": *true' "$WORK/pair.json"
grep -q lts_session "$WORK/cookies.txt"

echo "== second device: data reads now work with the cookie =="
CODE=$(curl -s -b "$WORK/cookies.txt" -o "$WORK/paired.json" -w '%{http_code}' -X POST "$LAN_URL/api/app_mode" \
  -H 'content-type: application/json' -d '{}')
test "$CODE" = "200"
echo "paired POST /api/app_mode -> 200: $(head -c 160 "$WORK/paired.json")"

echo "== the PIN was single-use: re-pairing with it fails =="
CODE=$(curl -s -o "$WORK/repin.json" -w '%{http_code}' -X POST "$LAN_URL/pair" \
  -H 'content-type: application/json' -d "{\"pin\":\"$PIN\"}")
test "$CODE" = "403"

echo "== restart the process: toggle + session persist from the data dir =="
stop_server
start_server
CODE=$(curl -s -b "$WORK/cookies.txt" -o "$WORK/restart.json" -w '%{http_code}' -X POST "$LAN_URL/api/app_mode" \
  -H 'content-type: application/json' -d '{}')
test "$CODE" = "200"
echo "after restart, paired device reads again -> 200 (no re-pairing)"
grep -q "LAN access open" "$WORK/serve.log"

echo "== operator: toggle off closes the LAN listener =="
curl -s -X POST "http://127.0.0.1:$PORT/lan/enable" \
  -H 'content-type: application/json' -d '{"enabled":false}' >/dev/null
if curl -s -m 3 -o /dev/null "$LAN_URL/api/capabilities"; then
  echo "FAIL: LAN address still answers after the toggle went off"
  exit 1
fi
echo "LAN address refuses connections after the toggle went off"

echo "PASS: LAN toggle + pairing PIN smoke (isolated LTS_DATA_DIR, real LAN socket, restart persistence)"
echo "== server log =="
cat "$WORK/serve.log"
