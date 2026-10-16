#!/usr/bin/env bash
# Corrected member accounting (2026-10-16): the published 0.4.1 archives against the
# CURRENT local candidate that was uploaded. The first pass compared against
# rc-inspect-*.txt, which is the pre-D1 (pre-kanji-radicals) 0.4.1 candidate, so it
# showed exactly the four files O-07 changed. This pass re-inspects dist/rc-0.4.1/*.
set -uo pipefail
cd /home/hunter/game-dev/LTS
E=state/evidence/RC-0.4.1-2026-10-15
export CARGO_TARGET_DIR=$PWD/tmp/cargo-rc
norm() { sed 's/^ *//;s/  \+/ /g'; }

for lower in ja-jp ru-ru; do
  lpk="dist/rc-0.4.1/$lower-reference-0.4.1.lpk"
  pub="dist/rc-0.4.1/published/$lower-reference-0.4.1.lpk"
  pack=$(echo "$lower" | sed 's/ja-jp/ja-JP/;s/ru-ru/ru-RU/')
  { echo "\$ inspect $lpk   # the uploaded candidate, re-inspected 2026-10-16"
    cargo run -q -p lts-langpack-cli -- inspect "$lpk"; echo "EXIT=$?"; } >"$E/rc-inspect-final-$pack.txt" 2>&1
  grep -E '^ *[0-9]+ +[0-9a-f]{12} ' "$E/rc-inspect-final-$pack.txt" | norm | LC_ALL=C sort >"$E/members-041final-$pack.txt"
  {
    echo "--- $pack: PUBLISHED 0.4.1 vs the CURRENT uploaded candidate ---"
    echo "published members = $(wc -l <"$E/members-041pub-$pack.txt")  candidate members = $(wc -l <"$E/members-041final-$pack.txt")"
    echo "identical (size+hash) = $(LC_ALL=C comm -12 "$E/members-041pub-$pack.txt" "$E/members-041final-$pack.txt" | wc -l)"
    echo "added in published:"; LC_ALL=C comm -13 "$E/members-041final-$pack.txt" "$E/members-041pub-$pack.txt"
    echo "removed in published:"; LC_ALL=C comm -23 "$E/members-041final-$pack.txt" "$E/members-041pub-$pack.txt"
    echo "(archive sha256 both sides: $(sha256sum "$pub" | cut -c1-64) / $(sha256sum "$lpk" | cut -c1-64))"
    echo
    echo "--- and the same published archive vs the PRE-D1 candidate (rc-inspect-$pack.txt) ---"
    echo "identical = $(LC_ALL=C comm -12 "$E/members-041pub-$pack.txt" "$E/members-041cand-$pack.txt" | wc -l)"
    echo "changed by O-07 (path, pre-D1, published):"
    LC_ALL=C comm -3 "$E/members-041cand-$pack.txt" "$E/members-041pub-$pack.txt" | LC_ALL=C sort
  } >"$E/diff-041-final-$pack.txt" 2>&1
  echo "FINAL[$pack] -> $E/diff-041-final-$pack.txt"
done
echo "FINAL_DONE"
