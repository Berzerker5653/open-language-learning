#!/usr/bin/env bash
# WEB-PROGRESS-001: request-level smoke for the browser install-progress
# bridge. It opens the SSE subscription (GET /api/progress/events) BEFORE
# starting a pack install (POST /api/import_pack), so the stages land while
# the install call is still in flight — the browser learner sees the install
# move instead of a frozen button until the result lands.
#
# Fixture pack: tests/fixtures/packs/ja-demo (small, offline, built into an
# .lpk with the langpack CLI). The data dir is an isolated temp dir, so the
# smoke never touches a learner's real store.
set -euo pipefail
cd "$(dirname "$0")/.."

export PORT="${PORT:-17641}"
BIN=target/debug/lts-serve

cargo build -q -p lts-desktop --features serve --bin lts-serve

WORK=$(mktemp -d)
trap 'kill ${SERVER_PID:-} ${SSE_PID:-} 2>/dev/null || true; rm -rf "$WORK"' EXIT

echo "== build the fixture archive =="
cargo run -q -p lts-langpack-cli -- build tests/fixtures/packs/ja-demo --out "$WORK/ja-demo.lpk"
ls -la "$WORK/ja-demo.lpk"

echo "== start lts-serve on an isolated data dir =="
LTS_DATA_DIR="$WORK/data" "$BIN" "127.0.0.1:$PORT" >"$WORK/serve.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 40); do
  curl -sf "http://127.0.0.1:$PORT/api/capabilities" >/dev/null 2>&1 && break
  sleep 0.5
done

echo "== capabilities report (install progress is now streamed) =="
curl -s "http://127.0.0.1:$PORT/api/capabilities" | python3 -m json.tool

echo "== open the SSE subscription before the install starts =="
curl -sN "http://127.0.0.1:$PORT/api/progress/events" >"$WORK/sse.log" &
SSE_PID=$!
sleep 1

echo "== install the fixture pack (the call stays in flight) =="
python3 - "$WORK" <<'PY'
import base64, json, os, sys, urllib.request
work = sys.argv[1]
port = os.environ["PORT"]
b64 = base64.b64encode(open(f"{work}/ja-demo.lpk", "rb").read()).decode()
req = urllib.request.Request(
    f"http://127.0.0.1:{port}/api/import_pack",
    data=json.dumps({"dataB64": b64}).encode(),
    headers={"content-type": "application/json"},
)
with urllib.request.urlopen(req) as r:
    print("install response:", r.status, r.read().decode())
PY

sleep 1
kill "$SSE_PID" 2>/dev/null || true
SSE_PID=

echo "== raw SSE frames observed over HTTP =="
cat "$WORK/sse.log"

echo "== assert the install stages streamed =="
python3 - "$WORK/sse.log" <<'PY'
import json, sys
frames = [
    json.loads(line[len("data: "):])
    for line in open(sys.argv[1])
    if line.startswith("data: ")
]
print(json.dumps(frames, indent=2))
stages = {(f["operation"], f["stage"]) for f in frames}
assert ("install-pack", "install") in stages, f"missing install stage in {stages}"
assert ("install-pack", "record") in stages, f"missing record stage in {stages}"
subjects = {f["subject"] for f in frames if f["operation"] == "install-pack"}
assert "org.openlanguage.ja-demo" in subjects, f"stages not attributed to the fixture pack: {subjects}"
print("PASS: the fixture install streamed its stages over HTTP while the call was in flight")
PY

echo "== server log =="
cat "$WORK/serve.log"
