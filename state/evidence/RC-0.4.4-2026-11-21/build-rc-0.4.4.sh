#!/usr/bin/env bash
# 0.4.4 release-candidate build (ja only, 2026-11-21, JA-REPUBLISH-044-001):
# publish the reviewed ja content (3,019 review records / 384 changes-requested,
# 68 rewritten sentences, 280 re-baked clips) to real installs — the pinned 0.4.3
# archive (2026-11-09) predates all of it.
# Preparation only: no tag, no upload, no catalogue edit — publication is the
# separately-gated step (standing authorization per O-05 0.4.4/0.4.5/0.4.6 precedent).
#
# Runs in an ISOLATED worktree at HEAD (RC_WT): sibling lanes hold WIP in
# crates/langpack (a new validate-time rule), and a release archive must be built
# and gated by HEAD code with frozen pack bytes. Media .wav bytes are gitignored;
# the worktree carries them as hardlinks from the main tree (read-only for us).
set -uo pipefail
WT=${RC_WT:-/home/hunter/.hermes/cache/scratch/lts-ja044/work}
cd "$WT"
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export CARGO_TARGET_DIR=${RC_CARGO_TARGET_DIR:-$PWD/tmp/cargo-rc}
MAIN=/home/hunter/game-dev/LTS
E=${RC_E:-$MAIN/state/evidence/RC-0.4.4-2026-11-21}
D=${RC_D:-dist/rc-0.4.4}
P=${RC_PREV:-$MAIN/state/evidence/RC-0.4.3-2026-11-09}   # published 0.4.3 (catalog-pinned) member lists
V=0.4.4
mkdir -p "$E" "$D"
: >"$E/SUMMARY.txt"

sec() {
  local name=$1; shift
  { echo "\$ $*"; "$@"; echo "EXIT=$?"; } >"$E/$name.txt" 2>&1
  code=$(sed -n 's/^EXIT=//p' "$E/$name.txt" | tail -1)
  printf '%-44s exit=%s\n' "$name" "$code" >>"$E/SUMMARY.txt"
}

norm() { sed 's/^ *//;s/  \+/ /g'; }

# exact state being validated (isolated HEAD worktree; media = hardlinks to main tree)
{
  echo "HEAD=$(git rev-parse HEAD)"
  echo "worktree=$WT (detached, built from main HEAD; status shows the hardlinked gitignored media only)"
  echo "dirty_paths=$(git status --porcelain | wc -l)"
  git status --porcelain | head -20
  echo "--- manifests as shipped ---"
  for p in languages/ja-JP/manifest.yaml languages/ru-RU/manifest.yaml; do
    printf '%s  %s\n' "$(sha256sum "$p" | cut -c1-64)" "$p"
    grep -m1 '^version:' "$p"
    grep -m1 'content_license:' "$p"
  done
} >"$E/state.txt" 2>&1
cat "$E/state.txt" >>"$E/SUMMARY.txt"

archives=()
for pair in "ja-JP:ja-jp-reference"; do
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

  # member-level accounting against the PUBLISHED 0.4.3 archive (catalog-pinned)
  if [ -f "$P/members-$pack.txt" ]; then
    {
      echo "--- $pack: PUBLISHED 0.4.3 (CATALOG-PINNED) -> CANDIDATE 0.4.4 (bytes + 12-hex hash + path) ---"
      echo "published 0.4.3 members = $(wc -l <"$P/members-$pack.txt")   candidate 0.4.4 members = $entries"
      echo "identical (size+hash)   = $(LC_ALL=C comm -12 "$P/members-$pack.txt" "$E/members-$pack.txt" | wc -l)"
      echo "added in 0.4.4:"; LC_ALL=C comm -13 "$P/members-$pack.txt" "$E/members-$pack.txt"
      echo "removed in 0.4.4:"; LC_ALL=C comm -23 "$P/members-$pack.txt" "$E/members-$pack.txt"
      echo "present on both sides with different bytes:"
      LC_ALL=C comm -12 <(cut -d' ' -f3- "$P/members-$pack.txt" | LC_ALL=C sort) <(cut -d' ' -f3- "$E/members-$pack.txt" | LC_ALL=C sort) | while read -r m; do
        a=$(grep " $m\$" "$P/members-$pack.txt"); b=$(grep " $m\$" "$E/members-$pack.txt")
        [ "$a" = "$b" ] || printf '  %s\n    0.4.4: %s.n    0.4.3: %s\n' "$m" "$a" "$b"
      done
      echo
    } >"$E/diff-043-to-044-$pack.txt" 2>&1
    head -8 "$E/diff-043-to-044-$pack.txt" >>"$E/SUMMARY.txt"
  else
    printf 'accounting: no published 0.4.3 member list for %s at %s/members-%s.txt\n' "$pack" "$P" "$pack" >>"$E/SUMMARY.txt"
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

  # JA-REPUBLISH-044-001 acceptance proof: the INSTALLED tree built from the actual
  # archive bytes carries the reviewed content, byte-equal to the repo HEAD pack files.
  inst=$(dirname "$(find "$store" -name manifest.yaml | head -1)")
  echo "inst_root=$inst" >>"$E/install-$pack.txt"
  {
    echo "installed content equality vs repo HEAD (md5 of tracked pack files):"
    eq=0; ne=0
    while IFS= read -r -d '' f; do
      rel=${f#"$src/"}
      tgt="$inst/$rel"
      if [ -f "$tgt" ] && [ "$(md5sum "$f" | cut -d' ' -f1)" = "$(md5sum "$tgt" | cut -d' ' -f1)" ]; then
        eq=$((eq+1))
      else
        ne=$((ne+1)); echo "  MISMATCH: $rel"
      fi
    done < <(find "$src" -type f ! -path '*/media/*' -print0)
    echo "content files equal=$eq mismatched=$ne"
    echo "installed reviews.jsonl rows: $(wc -l < "$inst/reviews.jsonl" 2>/dev/null)"
    echo "installed media/manifest.jsonl rows: $(wc -l < "$inst/media/manifest.jsonl" 2>/dev/null)"
  } >>"$E/install-$pack.txt" 2>&1
  tail -5 "$E/install-$pack.txt" >>"$E/SUMMARY.txt"

  archives+=("$archive")
done

sec rc-draft-catalog cargo run -q -p lts-langpack-cli -- catalog "${archives[@]}" \
  --file "$D/packs.json" \
  --url-template 'https://github.com/Berzerker5653/open-language-learning/releases/download/{pack_id}-{version}/{filename}' \
  --platform-reports docs/platform/PLATFORM_REPORTS.yaml
grep -E '"(pack_id|license|version|sha256|size_bytes|url)"' "$D/packs.json" >>"$E/SUMMARY.txt"
echo "RC_044_DONE" >>"$E/SUMMARY.txt"
