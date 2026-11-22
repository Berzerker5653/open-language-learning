#!/usr/bin/env bash
set -u
cd /home/hunter/game-dev/LTS
G=/home/hunter/game-dev/LTS/state/evidence/ENCOUNTER-BEFORE-TEST-001/gates-takeover2
export SERVE_BIN=/home/hunter/game-dev/LTS/target/debug/lts-serve
export SERVE_DIST=/home/hunter/game-dev/LTS/apps/desktop/dist
cargo test -p lts-desktop --features serve --lib serve:: > $G/desktop-serve-lib.log 2>&1; echo "desktop_serve_lib exit=$?" >> $G/summary.txt
cargo test -p lts-desktop --lib a_letter_is_never_tested a_legacy_earned_review > $G/newtests-filtered.log 2>&1; echo "newtests exit=$?" >> $G/summary.txt
node scripts/encounter-capture.mjs > $G/capture5.log 2>&1; echo "capture5 exit=$?" >> $G/summary.txt
LTS_DATA=/home/hunter/.hermes/cache/scratch/enc001-owner-snapshot node scripts/owner-plan-audit.mjs > $G/owner-audit5.log 2>&1; echo "owner_audit5 exit=$?" >> $G/summary.txt
echo CLOSE2-DONE >> $G/summary.txt
