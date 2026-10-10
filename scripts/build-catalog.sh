#!/usr/bin/env bash
# K-35 catalog happy path: build installable .lpk artifacts for the shipped
# packs and generate catalog entries (hashes, versions, sizes, tested-platform
# marker) from the exact archives. Artifacts and the draft catalog land in
# dist/preview/ (gitignored).
#
# The live catalog (catalog/packs.json) carries published entries. Publishing
# archives as GitHub release assets is owner gate O-05; the owner authorized
# PRIVATE-repo publishing 2026-10-07 (tags = {pack_id}-{version}, one release
# per pack version; see catalog/packs.json and state/evidence/PACKS-PUBLISH-2026-10-07/).
set -euo pipefail
cd "$(dirname "$0")/.."

# Canonical release URL template matching the publish tags; the app enforces
# https + GitHub release hosts at install.
URL_TEMPLATE="${URL_TEMPLATE:-https://github.com/Berzerker5653/open-language-learning/releases/download/{pack_id}-{version}/{filename}}"

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

# ADR-0016: pack listening audio is generated at build time and never stored
# in git; the committed artifact is languages/<pack>/media/manifest.jsonl.
# For a pack that ships a manifest, generation is now REQUIRED: the archive
# build refuses an audio-less pack, because ADR-0024 removed the on-demand
# synthesis that used to make one survivable. The bake runs Qwen3-TTS
# CustomVoice (ADR-0023) through ~/.venvs/qwen-tts; release builds set
# WITH_PACK_AUDIO=1 with that venv staged. A pack with no media at all (the
# ru-RU draft) still archives but fails the install gate until it is baked.
if [[ "${WITH_PACK_AUDIO:-0}" == "1" ]]; then
  for pack in languages/ja-JP; do
    python3 scripts/generate-pack-audio.py --pack "$pack"
  done
fi

build_pack languages/ja-JP ja-jp-reference
build_pack languages/ru-RU ru-ru-reference
build_pack tests/fixtures/packs/ja-demo ja-demo
build_pack tests/fixtures/packs/eo-demo eo-demo

# ADR-0015: three-way platform status is derived from human runtime reports.
# Empty report file = nothing confirmed, every non-tested platform untested.
cargo run -q -p lts-langpack-cli -- catalog "${archives[@]}" \
  --file dist/preview/packs.json \
  --url-template "$URL_TEMPLATE" \
  --platform-reports docs/platform/PLATFORM_REPORTS.yaml

echo "artifacts + draft catalog in dist/preview/"
echo "publishing release assets and merging entries into catalog/packs.json is owner gate O-05."
echo "community_confirmed_platforms is derived only from docs/platform/PLATFORM_REPORTS.yaml."
