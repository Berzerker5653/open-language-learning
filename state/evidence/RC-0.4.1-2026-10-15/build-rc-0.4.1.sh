#!/usr/bin/env bash
# 0.4.1 release-candidate build from the TRACKED tree (manifests bumped in place).
# Preparation only: no tag, no upload, no catalogue edit. Evidence only.
set -uo pipefail
cd /home/hunter/game-dev/LTS
export CARGO_TARGET_DIR=$PWD/tmp/cargo-rc
E=state/evidence/RC-0.4.1-2026-10-15
D=dist/rc-0.4.1
mkdir -p "$E" "$D"
: >"$E/SUMMARY.txt"

sec() {
  local name=$1; shift
  { echo "\$ $*"; "$@"; echo "EXIT=$?"; } >"$E/$name.txt" 2>&1
  code=$(sed -n 's/^EXIT=//p' "$E/$name.txt" | tail -1)
  printf '%-42s exit=%s\n' "$name" "$code" >>"$E/SUMMARY.txt"
}

# exact state being validated
{
  echo "HEAD=$(git rev-parse HEAD)"
  echo "tree_state=$(git status --porcelain | wc -l) modified paths"
  git status --porcelain
  echo "--- manifests as shipped ---"
  for p in languages/ja-JP/manifest.yaml languages/ru-RU/manifest.yaml; do
    printf '%s  %s\n' "$(sha256sum "$p" | cut -c1-64)" "$p"
    grep -m1 '^version:' "$p"
    grep -m1 'content_license:' "$p"
  done
} >"$E/state.txt" 2>&1
cat "$E/state.txt" >>"$E/SUMMARY.txt"
git diff -- languages/ja-JP/manifest.yaml languages/ru-RU/manifest.yaml >"$E/version-bump.patch"

archives=()
for pair in "ja-JP:ja-jp-reference" "ru-RU:ru-ru-reference"; do
  pack=${pair%%:*}; name=${pair##*:}
  src=languages/$pack
  for gate in validate lint test audit-curriculum audit-lexicon audit-licenses audit-sources; do
    sec "rc-$pack-$gate" cargo run -q -p lts-langpack-cli -- "$gate" "$src"
  done
  archive="$D/$name-0.4.1.lpk"
  rm -f "$archive"
  sec "rc-build-$pack" cargo run -q -p lts-langpack-cli -- build "$src" -o "$archive"
  {
    echo "archive: $archive"
    stat -c 'bytes=%s' "$archive"
    sha256sum "$archive"
  } >"$E/archive-$pack.txt" 2>&1
  cat "$E/archive-$pack.txt" >>"$E/SUMMARY.txt"
  sec "rc-inspect-$pack" cargo run -q -p lts-langpack-cli -- inspect "$archive"
  entries=$(grep -cE '^ *[0-9]+ +[0-9a-f]{12} ' "$E/rc-inspect-$pack.txt")
  media=$(grep -cE '^ *[0-9]+ +[0-9a-f]{12} +media/' "$E/rc-inspect-$pack.txt")
  printf 'archive members=%s media_members=%s\n' "$entries" "$media" >>"$E/SUMMARY.txt"

  # every git-tracked journey asset for this pack must be inside the archive
  tracked=$(git ls-files "languages/$pack/media" | grep -c '\.wav$')
  missing=0
  for f in $(git ls-files "languages/$pack/media" | grep '\.wav$'); do
    rel=${f#languages/$pack/}
    grep -qE "^ *[0-9]+ +[0-9a-f]{12} +$rel\$" "$E/rc-inspect-$pack.txt" || { missing=$((missing+1)); echo "MISSING $rel" >>"$E/missing-$pack.txt"; }
  done
  printf 'git-tracked media files=%s absent_from_archive=%s\n' "$tracked" "$missing" >>"$E/SUMMARY.txt"

  store="$D/store-$pack"; rm -rf "$store"
  sec "rc-install-$pack" cargo run -q -p lts-langpack-cli -- install "$archive" --store "$store"
  {
    echo "store layout: $(find "$store" -maxdepth 2 -mindepth 1 | sort | tr '\n' ' ')"
    echo "current pointer: $(cat "$store"/*/current 2>/dev/null | tr -d '\n')"
    echo "media files in installed tree: $(find "$store" -path '*/media/*' -name '*.wav' | wc -l)"
  } >>"$E/install-$pack.txt" 2>&1
  head -6 "$E/install-$pack.txt" >>"$E/SUMMARY.txt"
  archives+=("$archive")
done

sec rc-draft-catalog cargo run -q -p lts-langpack-cli -- catalog "${archives[@]}" \
  --file "$D/packs.json" \
  --url-template 'https://github.com/Berzerker5653/open-language-learning/releases/download/{pack_id}-{version}/{filename}' \
  --platform-reports docs/platform/PLATFORM_REPORTS.yaml
grep -E '"(pack_id|license|version|sha256|size_bytes|url)"' "$D/packs.json" >>"$E/SUMMARY.txt"
echo "RC_041_DONE" >>"$E/SUMMARY.txt"
