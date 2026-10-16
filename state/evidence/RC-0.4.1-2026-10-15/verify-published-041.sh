#!/usr/bin/env bash
# Post-publication verification (2026-10-16): download the two PUBLISHED 0.4.1
# archives the catalogue now pins, re-check them against the catalogue pin and
# the GitHub asset digest, and account for every member-level difference against
# the local candidate that was uploaded. Writes only *-041-published* evidence.
set -uo pipefail
cd /home/hunter/game-dev/LTS
E=state/evidence/RC-0.4.1-2026-10-15
D=dist/rc-0.4.1
mkdir -p "$E" "$D/published"

# Snapshot the tracked journey-asset list up front: another agent may be
# untracking those files while the 318 MB downloads run.
git ls-files 'languages/*/media/*.wav' >tmp/journey-assets.txt
echo "journey assets tracked at start: $(wc -l <tmp/journey-assets.txt)"
export CARGO_TARGET_DIR=$PWD/tmp/cargo-rc

for pack in ja-JP ru-RU; do
  lower=$(echo "$pack" | tr 'A-Z' 'a-z')
  pack_id="org.openlanguage.$lower.reference"
  read -r url pin size < <(python3 -c "
import json
cat=json.load(open('catalog/packs.json'))
for e in cat['packs']:
    if e['pack_id']=='$pack_id':
        print(e['url'], e['sha256'], e['size_bytes']); break
")
  out="$D/published/$(basename "$url")"
  {
    echo "pack_id=$pack_id"
    echo "\$ curl -fsSL -o $out $url"
    curl -fsSL --retry 3 -o "$out" "$url"
    echo "DOWNLOAD_EXIT=$?"
    echo "catalogue pin: sha256=$pin size_bytes=$size"
    stat -c 'actual bytes=%s' "$out"
    printf 'actual sha256=%s\n' "$(sha256sum "$out" | cut -d' ' -f1)"
    echo "--- GitHub-reported asset digest ---"
    gh release view "$pack_id-0.4.1" --json tagName,isImmutable,targetCommitish,assets \
      -q '[.tagName,.isImmutable,.targetCommitish,(.assets[]|[.name,.size,.digest,.state])]'
  } >"$E/published-041-$pack.txt" 2>&1
  echo "VERIFY[$pack] download+digest -> $E/published-041-$pack.txt"

  { echo "\$ inspect $out"; cargo run -q -p lts-langpack-cli -- inspect "$out"; echo "EXIT=$?"; } >"$E/inspect-041-$pack.txt" 2>&1
  norm() { sed 's/^ *//;s/  \+/ /g'; }
  grep -E '^ *[0-9]+ +[0-9a-f]{12} ' "$E/inspect-041-$pack.txt"  | norm | LC_ALL=C sort >"$E/members-041pub-$pack.txt"
  grep -E '^ *[0-9]+ +[0-9a-f]{12} ' "$E/rc-inspect-$pack.txt"   | norm | LC_ALL=C sort >"$E/members-041cand-$pack.txt"
  {
    echo "--- $pack member-level accounting: PUBLISHED 0.4.1 vs uploaded CANDIDATE 0.4.1 ---"
    echo "members published = $(wc -l <"$E/members-041pub-$pack.txt")"
    echo "members candidate = $(wc -l <"$E/members-041cand-$pack.txt")"
    echo "identical (size+hash) = $(LC_ALL=C comm -12 "$E/members-041pub-$pack.txt" "$E/members-041cand-$pack.txt" | wc -l)"
    echo "added in published:"; LC_ALL=C comm -13 "$E/members-041cand-$pack.txt" "$E/members-041pub-$pack.txt"
    echo "removed in published:"; LC_ALL=C comm -23 "$E/members-041cand-$pack.txt" "$E/members-041pub-$pack.txt"
    echo "--- the 18 ADR-0032 journey assets inside the PUBLISHED archive ---"
    grep "^languages/$pack/" tmp/journey-assets.txt | while read -r f; do
      rel=${f#languages/$pack/}
      printf '%-46s published=%s candidate=%s\n' "$rel" \
        "$(grep -cE "^[0-9]+ [0-9a-f]{12} $rel\$" "$E/members-041pub-$pack.txt")" \
        "$(grep -cE "^[0-9]+ [0-9a-f]{12} $rel\$" "$E/members-041cand-$pack.txt")"
    done
    echo "--- pack version reported by inspect ---"
    grep -m1 -iE "pack_version|version" "$E/inspect-041-$pack.txt" | head -2
  } >"$E/diff-041-$pack.txt" 2>&1
  echo "VERIFY[$pack] member accounting -> $E/diff-041-$pack.txt"
done
echo "VERIFY_DONE"
