#!/bin/sh
# whisper-cli for the round-2 chain, pinned to CPU.
#
# This whisper.cpp build links libggml-cuda, so a bare `whisper-cli` will try
# the 5090 - and the 5090 is normally held by the local inference server
# (28.5 GB of 32 GB). The chain runs unattended, so it uses the deterministic
# CPU path instead of gambling on VRAM headroom; the ASR gate is only ~5 s of
# a ~60-90 s take, so this costs the campaign almost nothing. A GPU-path
# re-audit of the whole corpus is a separate, validated step (see AUDIT doc).
#
# NEVER point this at ~/tools/stt/whisper.cpp/build/bin/whisper-cli: that
# binary is a broken 17 KB stub that emits gdb session text as the transcript
# and makes every clip FAIL the round-trip gate.
exec /home/hunter/.cache/lts-bench/whisper.cpp/build/bin/whisper-cli -ng "$@"
