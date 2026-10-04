#!/usr/bin/env bash
# TTS-002 (ADR-0009): stage the two download variants. Same binary;
# variants differ only in staged resources.
#
#   bare:        default build (`tauri.conf.json`). No TTS payload;
#                audio-dependent features degrade honestly. Nothing to
#                stage.
#   tts-bundled: build with `--config dist/variants/tauri.tts.json`
#                after this script stages the payload (sherpa runtime +
#                Kokoro export) under resources/tts/{sherpa,kokoro},
#                alongside the license texts and the GPL-3.0 source
#                offer (obligations scoped to the payload only).
#
# Produces LOCAL artifacts only; publishing release assets is an owner
# gate (REL-001 / O-05).
set -euo pipefail
cd "$(dirname "$0")/.."

VENDOR="${LTS_BENCH_VENDOR:-$HOME/.cache/lts-bench}"
OUT="dist/variants"
PAYLOAD="$OUT/tts/resources/tts"

RUNTIME="$VENDOR/sherpa-onnx-v1.13.8-linux-x64-shared"
MODEL="$VENDOR/kokoro-multi-lang-v1_0"
test -x "$RUNTIME/bin/sherpa-onnx-offline-tts" || {
  echo "sherpa runtime missing at $RUNTIME (set LTS_BENCH_VENDOR)" >&2
  exit 1
}
test -f "$MODEL/model.onnx" || {
  echo "kokoro export missing at $MODEL" >&2
  exit 1
}

rm -rf "$OUT"
mkdir -p "$PAYLOAD"
cp -a "$RUNTIME" "$PAYLOAD/sherpa"
cp -a "$MODEL" "$PAYLOAD/kokoro"
cp third-party/notices/GPL-3.0.txt "$PAYLOAD/"
cp third-party/notices/Apache-2.0.txt "$PAYLOAD/"
cp third-party/notices/ONNX-Runtime-MIT.txt "$PAYLOAD/"
cp third-party/notices/NOTICE.md "$PAYLOAD/"

# Absolute path: unambiguous regardless of where the CLI resolves
# overlay resource paths.
cat > "$OUT/tauri.tts.json" <<JSON
{
  "bundle": {
    "resources": {
      "$PWD/$PAYLOAD": "tts"
    }
  }
}
JSON

echo "staged TTS payload: $PAYLOAD"
echo "TTS-bundled variant: cargo tauri build --config $OUT/tauri.tts.json"
echo "bare variant:        cargo tauri build (default config, no payload)"
