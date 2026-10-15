#!/usr/bin/env bash
# Fetch the two PUBLISHED 0.4.0 archives (read-only GET from our own public
# release, no spend), check them against the pins the tracked catalogue carries,
# and account for every member-level difference against the 0.4.1 candidate.
set -uo pipefail
cd /home/hunter/game-dev/LTS
E=state/evidence/RC-0.4.1-2026-10-15
D=dist/rc-0.4.1
mkdir -p "$E" "$D/published"
export CARGO_TARGET_DIR=$PWD/tmp/cargo-rc

for pack in ja-JP ru-RU; do
  lower=$(echo "$pack" | tr 'A-Z' 'a-z')
  pack_id="org.openlanguage.$lower.reference"
  read -r url pin size < <(python3 -c "
import json,sys
cat=json.load(open('catalog/packs.json'))
for e in cat['packs']:
    if e['pack_id']=='$pack_id':
        print(e['url'], e['sha256'], e['size_bytes']); break
")
  out="$D/published/$(basename "$url")"
  {
    echo "pack_id=$pack_id"
    echo "\$ curl -fsSL -o $out $url"
    if [ -s "$out" ] && [ "$(sha256sum "$out" | cut -d' ' -f1)" = "$pin" ]; then
      echo "(reusing the copy already on disk; its sha256 equals the catalogue pin)"
    else
      curl -fsSL --retry 3 -o "$out" "$url"
    fi
    echo "DOWNLOAD_EXIT=$?"
    echo "catalogue pin: sha256=$pin size_bytes=$size"
    stat -c 'actual bytes=%s' "$out"
    printf 'actual sha256=%s\n' "$(sha256sum "$out" | cut -d' ' -f1)"
  } >"$E/published-$pack.txt" 2>&1
  if [ ! -s "$out" ]; then echo "DOWNLOAD FAILED for $pack" | tee -a "$E/SUMMARY.txt"; continue; fi

  { echo "\$ inspect $out"; cargo run -q -p lts-langpack-cli -- inspect "$out"; echo "EXIT=$?"; } >"$E/inspect-040-$pack.txt" 2>&1
  norm() { sed 's/^ *//;s/  \+/ /g'; }
  grep -E '^ *[0-9]+ +[0-9a-f]{12} ' "$E/inspect-040-$pack.txt" | norm | LC_ALL=C sort >"$E/members-040-$pack.txt"
  grep -E '^ *[0-9]+ +[0-9a-f]{12} ' "$E/rc-inspect-$pack.txt"  | norm | LC_ALL=C sort >"$E/members-041-$pack.txt"
  LC_ALL=C sort -k3,3 -s "$E/members-040-$pack.txt" >"$E/members-040-$pack.bypath"
  LC_ALL=C sort -k3,3 -s "$E/members-041-$pack.txt" >"$E/members-041-$pack.bypath"
  {
    echo "--- $pack member-level accounting: published 0.4.0 vs candidate 0.4.1 ---"
    echo "members 0.4.0 = $(wc -l <"$E/members-040-$pack.txt")"
    echo "members 0.4.1 = $(wc -l <"$E/members-041-$pack.txt")"
    echo "identical (size+hash) = $(LC_ALL=C comm -12 "$E/members-040-$pack.txt" "$E/members-041-$pack.txt" | wc -l)"
    echo "same path, different bytes = $(LC_ALL=C join -j 3 -o 1.2,2.2 "$E/members-040-$pack.bypath" "$E/members-041-$pack.bypath" | awk '$1!=$2' | wc -l)"
    echo "changed paths (path, 0.4.0 hash, 0.4.1 hash):"
    LC_ALL=C join -j 3 -o 0,1.2,2.2 "$E/members-040-$pack.bypath" "$E/members-041-$pack.bypath" | awk '$2!=$3'
    echo "added in 0.4.1:"; LC_ALL=C comm -13 "$E/members-040-$pack.txt" "$E/members-041-$pack.txt"
    echo "removed in 0.4.1:"; LC_ALL=C comm -23 "$E/members-040-$pack.txt" "$E/members-041-$pack.txt"
    echo "--- git-tracked journey assets in each archive ---"
    for f in $(git ls-files "languages/$pack/media" | grep '\.wav$'); do
      rel=${f#languages/$pack/}
      in040=$(grep -cE "^[0-9]+ [0-9a-f]{12} $rel\$" "$E/members-040-$pack.txt")
      in041=$(grep -cE "^[0-9]+ [0-9a-f]{12} $rel\$" "$E/members-041-$pack.txt")
      printf '%-46s 0.4.0=%s 0.4.1=%s\n' "$rel" "$in040" "$in041"
    done
  } >"$E/diff-$pack.txt" 2>&1
done
echo "ACCOUNTING_DONE"
