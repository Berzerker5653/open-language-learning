#!/usr/bin/env bash
set -u
cd /home/hunter/game-dev/LTS
G=/home/hunter/game-dev/LTS/state/evidence/ENCOUNTER-BEFORE-TEST-001/gates-takeover2
export SERVE_BIN=/home/hunter/game-dev/LTS/target/debug/lts-serve
export SERVE_DIST=/home/hunter/game-dev/LTS/apps/desktop/dist
cargo build -p lts-desktop --features serve --bin lts-serve > $G/serve-build2.log 2>&1; echo "serve_build2 exit=$?" >> $G/summary.txt
node scripts/encounter-capture.mjs > $G/capture4.log 2>&1; echo "capture4 exit=$?" >> $G/summary.txt
LTS_DATA=/home/hunter/.hermes/cache/scratch/enc001-owner-snapshot node scripts/owner-plan-audit.mjs > $G/owner-audit4.log 2>&1; echo "owner_audit4 exit=$?" >> $G/summary.txt
echo CLOSE-DONE >> $G/summary.txt
