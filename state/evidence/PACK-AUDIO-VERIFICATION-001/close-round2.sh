#!/bin/sh
# PACK-AUDIO-VERIFICATION-001 - round-2 close-out (GamingPC).
#
# Run AFTER local-chain.sh has finished the 16 batches. One command that
# proves the campaign's claims instead of asserting them:
#
#   1. regenerate the disposition packet + answer sheet from the round-2
#      checkpoints (certified ids leave, re-failed ids carry 2K takes);
#   2. re-check every manifest row of both packs against the bytes on disk
#      (a bake that wrote audio but updated the row inconsistently is caught
#      here, not at publish time);
#   3. run the same lts-langpack-cli gates CI runs;
#   4. print the tallies the release evidence needs.
#
# It does NOT stage or publish anything: pack archives are staged once the
# owner says go (`stage-pack-bundle.sh`, printed at the end), and staging a
# moving target mid-campaign is how the 0.4.3 archives went stale.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="/home/hunter/game-dev/LTS"
DATE="${DATE:-$(date +%F)}"
PY="$HOME/.venvs/qwen-tts/bin/python"
[ -x "$PY" ] || PY=python3
cd "$HERE" || exit 1

say() { printf '\n=== %s ===\n' "$*"; }

# The tallies are only meaningful once the queue has settled, so the guard is
# on by default; --force runs the same checks against a mid-campaign snapshot
# (useful for validating the close-out itself - the packet gets regenerated
# again when the queue actually finishes).
if [ "${1:-}" != "--force" ] && pgrep -f "bake-bestof.py" >/dev/null 2>&1; then
  echo "a bake is still running - finish the queue first (this close-out is a" >&2
  echo "point-in-time proof; running it mid-batch proves nothing about the end)." >&2
  echo "pass --force to validate the close-out against the current snapshot." >&2
  exit 1
fi

say "1/4 disposition packet ($DATE)"
"$PY" rundown-exhausted.py --date "$DATE" --sheet "disposition-$DATE.csv"

say "2/4 manifest rows vs bytes on disk"
"$PY" - "$REPO" <<'PYEOF'
import hashlib, json, sys
from pathlib import Path
repo = Path(sys.argv[1])
for pack in ("ja-JP", "ru-RU"):
    root = repo / "languages" / pack
    rows = [json.loads(l) for l in
            (root / "media/manifest.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    bad = missing = 0
    for r in rows:
        f = root / r["file"]
        if not f.exists():
            missing += 1
            continue
        h = hashlib.sha256()
        with open(f, "rb") as fh:
            for chunk in iter(lambda: fh.read(1 << 20), b""):
                h.update(chunk)
        if h.hexdigest() != r["sha256"] or f.stat().st_size != r["bytes"]:
            bad += 1
    print(f"{pack}: {len(rows)} rows | hash/size mismatches {bad} | missing files {missing}")
    if bad or missing:
        sys.exit(1)
PYEOF
[ $? -eq 0 ] || { echo "byte check failed - do NOT stage until it is explained" >&2; exit 1; }

say "3/4 pack gates (the CI invocations)"
for pack in languages/ja-JP languages/ru-RU; do
  for cmd in validate lint test; do
    printf '%s %s: ' "$pack" "$cmd"
    (cd "$REPO" && cargo run -q -p lts-langpack-cli -- "$cmd" "$pack" 2>&1 | tail -1)
  done
done

say "4/4 tallies"
"$PY" - "$HERE" <<'PYEOF'
import glob, json, sys
here = sys.argv[1]
for lang in ("ja", "ru"):
    settled = solved = exhausted = 0
    for f in glob.glob(f"{here}/bestof-{lang}-r2-*.jsonl"):
        for line in open(f, encoding="utf-8"):
            if not line.strip():
                continue
            settled += 1
            solved += json.loads(line)["result"] != "exhausted"
            exhausted += json.loads(line)["result"] == "exhausted"
    print(f"round 2 {lang}: {settled} ids run | {solved} newly certified | {exhausted} still exhausted")
PYEOF

printf '\nstaging is a separate, owner-authorized step, e.g.\n'
printf '  bash scripts/stage-pack-bundle.sh   # see its header for the 0.4.3 recipe\n'
printf 'and the publish provenance must name the recognizer build + model sha\n'
printf '(gate-identity-2026-10-27.txt).\n'
