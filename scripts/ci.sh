#!/usr/bin/env bash
# Local mirror of .github/workflows/ci.yml. Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/tauri-env.sh

echo "== rust: format =="
cargo fmt --all --check

echo "== rust: clippy =="
cargo clippy --workspace --all-targets -- -D warnings


echo "== packs: media (gitignored bulk audio; parity with the CI restore step) =="
# The reference packs' bulk .wav files are gitignored, so a fresh clone cannot
# pass the media-declared gates until they are restored — the same two calls
# .github/workflows/ci.yml makes in the rust and desktop-smoke jobs. Already
# complete? verify-only costs no download. SKIP_PACK_AUDIO=1 refuses the
# download for an offline run (it then fails loudly rather than testing a
# tree that cannot pass).
restore_pack_audio() {
  local dir=$1
  if ./scripts/fetch-pack-audio.sh --pack-dir "$dir" --work-dir tmp/pack-audio --verify-only >/dev/null 2>&1; then
    echo "media already valid: $dir"
  elif [[ "${SKIP_PACK_AUDIO:-0}" == "1" ]]; then
    echo "FAIL: $dir media is not complete and SKIP_PACK_AUDIO=1 refused the download" >&2
    exit 1
  else
    ./scripts/fetch-pack-audio.sh --pack-dir "$dir" --work-dir tmp/pack-audio
  fi
}
for pack_dir in languages/ja-JP languages/ru-RU; do
  restore_pack_audio "$pack_dir"
done

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

# PACK-AI-001 conformance proofs: scaffolded packs whose placeholder audio is
# committed (examples/*/media is not gitignored), so install mode runs here
# with no download. Conformance only: they prove a new language can be authored
# with no engine edits, nothing about teaching quality.
for pack in examples/eo-community examples/ar-ma; do
  cargo run -q -p lts-langpack-cli -- validate         "$pack"
  cargo run -q -p lts-langpack-cli -- lint             "$pack"
  cargo run -q -p lts-langpack-cli -- audit-curriculum "$pack"
  cargo run -q -p lts-langpack-cli -- audit-lexicon    "$pack"
  cargo run -q -p lts-langpack-cli -- audit-licenses   "$pack"
  cargo run -q -p lts-langpack-cli -- audit-sources    "$pack"
  cargo run -q -p lts-langpack-cli -- test             "$pack"
done

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
.venv/bin/python scripts/test_fetch_pack_audio.py
.venv/bin/python scripts/test_renormalize_pack_audio.py
.venv/bin/python -m unittest discover -s scripts -p 'test_new_pack.py'
.venv/bin/python tools/audit_content_templates.py languages/ja-JP languages/ru-RU
.venv/bin/python -m unittest discover -s tools -p 'test_audit_content_templates.py'
.venv/bin/python tools/audit_learner_copy.py
.venv/bin/python -m unittest discover -s tools -p 'test_audit_learner_copy.py'

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
