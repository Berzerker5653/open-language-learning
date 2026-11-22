#!/usr/bin/env bash
set -u
cd /home/hunter/game-dev/LTS/apps/desktop
G=/home/hunter/game-dev/LTS/state/evidence/ENCOUNTER-BEFORE-TEST-001/gates-takeover2
npx tsc --noEmit          > $G/tsc.log 2>&1; echo "tsc exit=$?" >> $G/summary.txt
npx vitest run            > $G/vitest.log 2>&1; echo "vitest exit=$?" >> $G/summary.txt
cd /home/hunter/game-dev/LTS
cargo build -p lts-desktop --features serve --bin lts-serve > $G/serve-build.log 2>&1; echo "serve_build exit=$?" >> $G/summary.txt
node scripts/encounter-capture.mjs > $G/capture.log 2>&1; echo "capture exit=$?" >> $G/summary.txt
node scripts/owner-plan-audit.mjs > $G/owner-audit.log 2>&1; echo "owner_audit exit=$?" >> $G/summary.txt
echo FRONT-DONE >> $G/summary.txt
