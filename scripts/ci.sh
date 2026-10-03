#!/usr/bin/env bash
# Local mirror of .github/workflows/ci.yml. Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== rust: format =="
cargo fmt --all --check

echo "== rust: clippy =="
cargo clippy --workspace --all-targets -- -D warnings

echo "== rust: test =="
cargo test --workspace

echo "== web: install =="
pnpm install --frozen-lockfile

echo "== web: format =="
pnpm fmt:check

echo "== web: typecheck =="
pnpm typecheck

echo "== web: test =="
pnpm test

echo "== web: build =="
pnpm build

echo "== schemas/handoff =="
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/python -m pip install -q -r tools/requirements.txt
.venv/bin/python tools/validate_handoff.py
.venv/bin/python -m unittest discover -s tools -p 'test_validate_handoff.py'

echo "CI OK"
