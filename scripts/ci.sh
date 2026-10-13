#!/usr/bin/env bash
# Local mirror of .github/workflows/ci.yml. Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/tauri-env.sh

echo "== rust: format =="
cargo fmt --all --check

echo "== rust: clippy =="
cargo clippy --workspace --all-targets -- -D warnings

echo "== rust: test =="
cargo test --workspace

echo "== packs: conformance (ja-JP + ru-RU + example template) =="
cargo run -q -p lts-langpack-cli -- validate languages/ja-JP
cargo run -q -p lts-langpack-cli -- lint languages/ja-JP
cargo run -q -p lts-langpack-cli -- test languages/ja-JP
cargo run -q -p lts-langpack-cli -- validate languages/ru-RU
cargo run -q -p lts-langpack-cli -- lint languages/ru-RU
cargo run -q -p lts-langpack-cli -- test languages/ru-RU
cargo run -q -p lts-langpack-cli -- lint tools/pack-templates/example-pack

echo "== web: install =="
pnpm install --frozen-lockfile

echo "== web: format =="
pnpm fmt:check

echo "== web: typecheck =="
pnpm typecheck

echo "== web: lint =="
pnpm lint

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
.venv/bin/python scripts/test_generate_pack_audio.py

echo "== security: advisory + secret scans (mirror of CI security job) =="
if command -v cargo-audit >/dev/null 2>&1; then
  cargo audit
else
  echo "SKIP cargo-audit (install: cargo install cargo-audit --locked)"
fi
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --source . --redact
else
  echo "SKIP gitleaks (install from https://github.com/gitleaks/gitleaks)"
fi

echo "CI OK"
