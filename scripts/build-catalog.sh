#!/usr/bin/env bash
# K-35 catalog happy path: build installable .lpk artifacts for the shipped
# packs and generate catalog entries (hashes, versions, sizes, tested-platform
# marker) from the exact archives. Artifacts and the draft catalog land in
# dist/preview/ (gitignored).
#
# The live catalog (catalog/packs.json) stays empty until the owner publishes
# the archives as GitHub release assets and merges entries (owner gate O-05;
# see catalog/preview-entries.json governance and docs/packs/CONTRIBUTING.md).
set -euo pipefail
cd "$(dirname "$0")/.."

# Placeholder release URL; the app enforces https + GitHub release hosts at
# install. Replace with the real release URL when the owner publishes.
URL_TEMPLATE="${URL_TEMPLATE:-https://github.com/open-language-learning-platform/desktop/releases/download/packs-placeholder/{filename}}"

mkdir -p dist/preview
archives=()
build_pack() {
  local dir="$1" name="$2"
  local version
  version="$(sed -n 's/^version: *"\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' "$dir/manifest.yaml" | head -1)"
  local archive="dist/preview/${name}-${version}.lpk"
  cargo run -q -p lts-langpack-cli -- build "$dir" -o "$archive"
  archives+=("$archive")
}

build_pack languages/ja-JP ja-jp-reference
build_pack tests/fixtures/packs/ja-demo ja-demo
build_pack tests/fixtures/packs/eo-demo eo-demo

cargo run -q -p lts-langpack-cli -- catalog "${archives[@]}" \
  --file dist/preview/packs.json \
  --url-template "$URL_TEMPLATE"

echo "artifacts + draft catalog in dist/preview/"
echo "publishing release assets and merging entries into catalog/packs.json is owner gate O-05."
