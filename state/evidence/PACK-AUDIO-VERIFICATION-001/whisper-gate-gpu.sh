#!/bin/sh
# GPU-path twin of whisper-gate.sh: identical binary and model, only -ng
# (--no-gpu) dropped. Existence + identity is recorded in
# GPU-IDENTITY-<date>.md; created only for the owner-approved speedup run.
exec /home/hunter/.cache/lts-bench/whisper.cpp/build/bin/whisper-cli "$@"
