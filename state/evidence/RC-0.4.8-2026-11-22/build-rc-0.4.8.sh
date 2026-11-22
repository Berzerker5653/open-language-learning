#!/usr/bin/env bash
# 0.4.8 release-candidate build (ru only, 2026-11-22, RU-REPUBLISH-048-001):
# published 0.4.7 predates the per-case orthography entity guard
# (ORTHO-LETTER-UNITS-001) and fails install validation (66
# per_case_orthography_entity errors); republish from current HEAD.
# Runs in an ISOLATED detached worktree at HEAD (RC_WT): the archive must carry
# HEAD code + the HEAD manifest + the CURRENT main-tree media bytes (gitignored;
# hardlinked in).
# Preparation only: no tag, no upload, no catalogue edit — publication follows
# after local verification (standing authorization per O-05 precedents; this
# card is the owner-launched republish order).
set -uo pipefail
MAIN=/home/hunter/game-dev/LTS
WT=${RC_WT:-/home/hunter/.hermes/cache/scratch/lts-ru048/work}
E=${RC_E:-$MAIN/state/evidence/RC-0.4.8-2026-11-22}
D=${RC_D:-$WT/dist/rc-0.4.8}
P=${RC_PREV:-$MAIN/state/evidence/RC-0.4.7-2026-11-21}   # published 0.4.7 (catalog-pinned, superseded)
CATALOG_LIVE=$MAIN/catalog/packs.json
V=0.4.8
cd "$WT"
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export CARGO_TARGET_DIR=$WT/tmp/cargo-rc
mkdir -p "$E" "$D"
: >"$E/SUMMARY.txt"

sec() {
  local name=$1; shift
  { echo "\$ $*"; "$@"; echo "EXIT=$?"; } >"$E/$name.txt" 2>&1
  code=$(sed -n 's/^EXIT=//p' "$E/$name.txt" | tail -1)
  printf '%-44s exit=%s\n' "$name" "$code" >>"$E/SUMMARY.txt"
}

norm() { sed 's/^ *//;s/  \+/ /g'; }

SHA=$(cd "$WT" && git rev-parse HEAD)

# exact state being validated (isolated HEAD worktree; media = hardlinks to main tree)
{
  echo "worktree=$WT (detached at HEAD=$SHA; built from main HEAD)"
  echo "HEAD=$SHA"
  echo "media hardlinked from $MAIN (gitignored bytes; manifest tracked at HEAD)"
  echo "--- manifests as shipped ---"
  printf '%s  %s\n' "$(sha256sum languages/ru-RU/manifest.yaml | cut -c1-64)" languages/ru-RU/manifest.yaml
  grep -m1 '^version:' languages/ru-RU/manifest.yaml
  grep -m1 'content_license:' languages/ru-RU/manifest.yaml
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

  # member-level accounting against the PUBLISHED 0.4.7 archive (catalog-pinned, superseded)
  if [ -f "$P/members-$pack.txt" ]; then
    {
      echo "--- $pack: PUBLISHED 0.4.7 (SUPERSEDED) -> CANDIDATE 0.4.8 (bytes + 12-hex hash + path) ---"
      echo "published 0.4.7 members = $(wc -l <"$P/members-$pack.txt")   candidate 0.4.8 members = $entries"
      echo "identical (size+hash)   = $(LC_ALL=C comm -12 "$P/members-$pack.txt" "$E/members-$pack.txt" | wc -l)"
      echo "added in 0.4.8:"; LC_ALL=C comm -13 "$P/members-$pack.txt" "$E/members-$pack.txt"
      echo "removed in 0.4.8:"; LC_ALL=C comm -23 "$P/members-$pack.txt" "$E/members-$pack.txt"
      echo "present on both sides with different bytes:"
      LC_ALL=C comm -12 <(cut -d' ' -f3- "$P/members-$pack.txt" | LC_ALL=C sort) <(cut -d' ' -f3- "$E/members-$pack.txt" | LC_ALL=C sort) | while read -r m; do
        a=$(grep " $m\$" "$P/members-$pack.txt"); b=$(grep " $m\$" "$E/members-$pack.txt")
        [ "$a" = "$b" ] || printf '  %s\n    0.4.8: %s\n    0.4.7: %s\n' "$m" "$a" "$b"
      done
      echo
    } >"$E/diff-047-to-048-$pack.txt" 2>&1
    head -8 "$E/diff-047-to-048-$pack.txt" >>"$E/SUMMARY.txt"
  else
    printf 'accounting: no published 0.4.7 member list for %s at %s/members-%s.txt\n' "$pack" "$P" "$pack" >>"$E/SUMMARY.txt"
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

  # install round-trip byte truth: every manifest row's sha matches the INSTALLED wav
  {
    echo "-- installed wav sha256 vs manifest rows --"
    mism=0
    python3 - "$store" "$src/media/manifest.jsonl" <<'PY'
import hashlib, json, sys, pathlib
store = pathlib.Path(sys.argv[1]); man = sys.argv[2]
wavs = {p.name: p for p in store.rglob("media/*.wav")}
bad = 0
for line in open(man, encoding="utf-8"):
    line = line.strip()
    if not line:
        continue
    r = json.loads(line)
    name = r["file"].split("/")[-1]
    p = wavs.get(name)
    if p is None:
        print("MISSING", name); bad += 1; continue
    if p.stat().st_size != r["bytes"] or hashlib.sha256(p.read_bytes()).hexdigest() != r["sha256"]:
        print("SHA/bytes MISMATCH", name); bad += 1
print("rows_checked=%d installed_mismatches=%d" % (sum(1 for l in open(man, encoding='utf-8') if l.strip()), bad))
PY
  } >>"$E/install-$pack.txt" 2>&1
  tail -1 "$E/install-$pack.txt" >>"$E/SUMMARY.txt"

  archives+=("$archive")
done

sec rc-draft-catalog cargo run -q -p lts-langpack-cli -- catalog "${archives[@]}" \
  --file "$D/packs.json" \
  --url-template 'https://github.com/Berzerker5653/open-language-learning/releases/download/{pack_id}-{version}/{filename}' \
  --platform-reports docs/platform/PLATFORM_REPORTS.yaml
cp "$D/packs.json" "$E/rc-draft-catalog.txt"
grep -E '"(pack_id|license|version|sha256|size_bytes|url)"' "$D/packs.json" >>"$E/SUMMARY.txt"

# card-specific pre-publish proof: the CI install gate (fetch-pack-audio.sh)
# against the freshly built archive via a file:// catalog pin, run on a
# wav-stripped copy of the pack tree (simulates a fresh checkout).
{
  echo "== install-gate proof: fetch-pack-audio.sh against RC archive =="
  PROOF=$WT/tmp/proof-ru048
  rm -rf "$PROOF"; mkdir -p "$PROOF/pack"
  cp -al "$src" "$PROOF/pack/ru-RU"
  find "$PROOF/pack/ru-RU" -name '*.wav' -delete   # unlink only; main-tree bytes untouched
  sha_local=$(sha256sum "$archive" | cut -d' ' -f1)
  size_local=$(stat -c%s "$archive")
  python3 - "$CATALOG_LIVE" "$PROOF/catalog.json" "file://$archive" "$sha_local" "$size_local" <<'PY'
import json, sys
cat = json.load(open(sys.argv[1]))
for p in cat["packs"]:
    if p["pack_id"] == "org.openlanguage.ru-ru.reference":
        p["version"] = "0.4.8"
        p["url"] = sys.argv[3]
        p["sha256"] = sys.argv[4]
        p["size_bytes"] = int(sys.argv[5])
json.dump(cat, open(sys.argv[2], "w"), indent=2)
PY
  echo "\$ scripts/fetch-pack-audio.sh --pack-dir $PROOF/pack/ru-RU --catalog $PROOF/catalog.json --work-dir $PROOF/dl"
  "$MAIN/scripts/fetch-pack-audio.sh" --pack-dir "$PROOF/pack/ru-RU" --catalog "$PROOF/catalog.json" --work-dir "$PROOF/dl"
  echo "PROOF_EXIT=$?"
} >"$E/install-gate-proof.txt" 2>&1
pc=$(sed -n 's/^PROOF_EXIT=//p' "$E/install-gate-proof.txt" | tail -1)
printf '%-44s exit=%s\n' "install-gate-proof(fetch-script)" "$pc" >>"$E/SUMMARY.txt"
echo "RC_048_DONE" >>"$E/SUMMARY.txt"
