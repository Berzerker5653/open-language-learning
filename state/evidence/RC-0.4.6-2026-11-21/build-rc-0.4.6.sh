#!/usr/bin/env bash
# 0.4.6 release-candidate build (ru only, 2026-11-21, RU-REPUBLISH-046-001):
# publish the letter-unit orthography fixes (294d649) to real installs — the
# pinned 0.4.5 archive predates them and still serves case-drill copy.
# Preparation only: no tag, no upload, no catalogue edit — publication is the
# separately-gated step (standing authorization per O-05 0.4.4/0.4.5 precedent).
set -uo pipefail
cd /home/hunter/game-dev/LTS
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export CARGO_TARGET_DIR=${RC_CARGO_TARGET_DIR:-$PWD/tmp/cargo-rc}
E=${RC_E:-state/evidence/RC-0.4.6-2026-11-21}
D=${RC_D:-dist/rc-0.4.6}
P=${RC_PREV:-state/evidence/RC-0.4.5-2026-11-20}   # published 0.4.5 (catalog-pinned) member lists
V=0.4.6
mkdir -p "$E" "$D"
: >"$E/SUMMARY.txt"

sec() {
  local name=$1; shift
  { echo "\$ $*"; "$@"; echo "EXIT=$?"; } >"$E/$name.txt" 2>&1
  code=$(sed -n 's/^EXIT=//p' "$E/$name.txt" | tail -1)
  printf '%-44s exit=%s\n' "$name" "$code" >>"$E/SUMMARY.txt"
}

norm() { sed 's/^ *//;s/  \+/ /g'; }

# exact state being validated
{
  echo "HEAD=$(git rev-parse HEAD)"
  echo "dirty_paths=$(git status --porcelain | wc -l)"
  git status --porcelain
  echo "--- manifests as shipped ---"
  for p in languages/ja-JP/manifest.yaml languages/ru-RU/manifest.yaml; do
    printf '%s  %s\n' "$(sha256sum "$p" | cut -c1-64)" "$p"
    grep -m1 '^version:' "$p"
    grep -m1 'content_license:' "$p"
  done
} >"$E/state.txt" 2>&1
cat "$E/state.txt" >>"$E/SUMMARY.txt"

archives=()
for pair in "ru-RU:ru-ru-reference"; do
  pack=${pair%%:*}; name=${pair##*:}
  src=languages/$pack
  for gate in validate lint test audit-curriculum audit-lexicon audit-licenses audit-sources; do
    sec "rc-$pack-$gate" cargo run -q -p lts-langpack-cli -- "$gate" "$src"
  done
  archive="$D/$name-$V.lpk"
  rm -f "$archive"
  sec "rc-build-$pack" cargo run -q -p lts-langpack-cli -- build "$src" -o "$archive"
  {
    echo "archive: $archive"
    stat -c 'bytes=%s' "$archive"
    sha256sum "$archive"
  } >"$E/archive-$pack.txt" 2>&1
  cat "$E/archive-$pack.txt" >>"$E/SUMMARY.txt"
  sec "rc-inspect-$pack" cargo run -q -p lts-langpack-cli -- inspect "$archive"
  grep -E '^ *[0-9]+ +[0-9a-f]{12} ' "$E/rc-inspect-$pack.txt" | norm | LC_ALL=C sort >"$E/members-$pack.txt"
  entries=$(wc -l <"$E/members-$pack.txt")
  media=$(grep -cE ' media/[^ ]+\.wav$' "$E/members-$pack.txt")
  printf 'archive members=%s media_members=%s\n' "$entries" "$media" >>"$E/SUMMARY.txt"

  rows=$(wc -l <"languages/$pack/media/manifest.jsonl")
  printf 'manifest_rows=%s media_members=%s delta=%s\n' "$rows" "$media" "$((rows - media))" >>"$E/SUMMARY.txt"
  [ "$rows" -eq "$media" ] || echo "ROW/MEMBER MISMATCH $pack" >>"$E/SUMMARY.txt"
  sidecar=$(grep -cE ' media/words\.jsonl$' "$E/members-$pack.txt")
  printf 'words_sidecar_member=%s\n' "$sidecar" >>"$E/SUMMARY.txt"

  # member-level accounting against the PUBLISHED 0.4.5 archive (catalog-pinned)
  if [ -f "$P/members-$pack.txt" ]; then
    {
      echo "--- $pack: PUBLISHED 0.4.5 (PUBLISHED/CATALOG-PINNED) -> CANDIDATE 0.4.6 (bytes + 12-hex hash + path) ---"
      echo "published 0.4.5 members = $(wc -l <"$P/members-$pack.txt")   candidate 0.4.6 members = $entries"
      echo "identical (size+hash)   = $(LC_ALL=C comm -12 "$P/members-$pack.txt" "$E/members-$pack.txt" | wc -l)"
      echo "added in 0.4.6:"; LC_ALL=C comm -13 "$P/members-$pack.txt" "$E/members-$pack.txt"
      echo "removed in 0.4.6:"; LC_ALL=C comm -23 "$P/members-$pack.txt" "$E/members-$pack.txt"
      echo "present on both sides with different bytes:"
      LC_ALL=C comm -12 <(cut -d' ' -f3- "$P/members-$pack.txt" | LC_ALL=C sort) <(cut -d' ' -f3- "$E/members-$pack.txt" | LC_ALL=C sort) | while read -r m; do
        a=$(grep " $m\$" "$P/members-$pack.txt"); b=$(grep " $m\$" "$E/members-$pack.txt")
        [ "$a" = "$b" ] || printf '  %s\n    0.4.6: %s.n    0.4.5: %s\n' "$m" "$a" "$b"
      done
      echo
    } >"$E/diff-045-to-046-$pack.txt" 2>&1
    tail -n +2 "$E/diff-045-to-046-$pack.txt" | head -40 >>"$E/SUMMARY.txt"
  else
    printf 'accounting: no published 0.4.5 member list for %s at %s/members-%s.txt\n' "$pack" "$P" "$pack" >>"$E/SUMMARY.txt"
  fi

  store="$D/store-$pack"; rm -rf "$store"
  sec "rc-install-$pack" cargo run -q -p lts-langpack-cli -- install "$archive" --store "$store"
  {
    echo "store layout: $(find "$store" -maxdepth 2 -mindepth 1 | sort | tr '\n' ' ')"
    echo "current pointer: $(cat "$store"/*/current 2>/dev/null | tr -d '\n')"
    echo "media files in installed tree: $(find "$store" -path '*/media/*' -name '*.wav' | wc -l)"
    echo "sidecar in installed tree: $(find "$store" -name words.jsonl | wc -l)"
  } >>"$E/install-$pack.txt" 2>&1
  head -6 "$E/install-$pack.txt" >>"$E/SUMMARY.txt"

  # RU-REPUBLISH-046-001 acceptance proof: the INSTALLED tree built from the
  # actual archive bytes carries ZERO drill-junk case entities.
  orth=$(find "$store" -path '*orthography/cyrillic.jsonl' | head -1)
  {
    echo "installed orthography file: $orth"
    echo "drill-junk entities (uppercase|lowercase|'Letter name'): $(grep -c -i -E 'uppercase|lowercase|Letter name' "$orth")"
  } >>"$E/install-$pack.txt" 2>&1
  archives+=("$archive")
done

sec rc-draft-catalog cargo run -q -p lts-langpack-cli -- catalog "${archives[@]}" \
  --file "$D/packs.json" \
  --url-template 'https://github.com/Berzerker5653/open-language-learning/releases/download/{pack_id}-{version}/{filename}' \
  --platform-reports docs/platform/PLATFORM_REPORTS.yaml
grep -E '"(pack_id|license|version|sha256|size_bytes|url)"' "$D/packs.json" >>"$E/SUMMARY.txt"
echo "RC_046_DONE" >>"$E/SUMMARY.txt"
