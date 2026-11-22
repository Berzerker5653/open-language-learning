#!/usr/bin/env bash
set -u
cd /home/hunter/game-dev/LTS
G=state/evidence/ENCOUNTER-BEFORE-TEST-001/gates-takeover2
cargo fmt --all --check            > $G/fmt.log 2>&1; echo "fmt exit=$?" >> $G/summary.txt
cargo test -p lts-storage          > $G/storage.log 2>&1; echo "storage exit=$?" >> $G/summary.txt
cargo test -p lts-desktop --lib    > $G/desktop-lib.log 2>&1; echo "desktop_lib exit=$?" >> $G/summary.txt
cargo clippy -p lts-storage --all-targets -- -D warnings > $G/clippy-storage.log 2>&1; echo "clippy_storage exit=$?" >> $G/summary.txt
cargo clippy -p lts-desktop --all-targets -- -D warnings > $G/clippy-desktop.log 2>&1; echo "clippy_desktop exit=$?" >> $G/summary.txt
echo DONE >> $G/summary.txt
