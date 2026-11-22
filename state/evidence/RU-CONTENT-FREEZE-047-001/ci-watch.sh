#!/usr/bin/env bash
# Poll the CI run for 61c3ee1 until completed; record restore-leg + conformance posture.
set -uo pipefail
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
E=/home/hunter/game-dev/LTS/state/evidence/RU-CONTENT-FREEZE-047-001
SHA=61c3ee1b301ddddbec57cc7d1fd3efe55d9769a2
OUT=$E/ci-watch.txt
: >"$OUT"
for i in $(seq 1 120); do
  RUN=$(gh run list --limit 5 --json databaseId,headSha,status -q ".[] | select(.headSha==\"$SHA\") | .databaseId" | head -1)
  if [ -n "$RUN" ]; then break; fi
  sleep 20
done
echo "run_id=$RUN" >>"$OUT"
for i in $(seq 1 120); do
  ST=$(gh run view "$RUN" --json status,conclusion -q '.status+" "+.conclusion')
  echo "$(date -Is) $ST" >>"$OUT"
  [ "${ST%% *}" = "completed" ] && break
  sleep 30
done
gh run view "$RUN" --json status,conclusion,jobs -q '{status:.status,conclusion:.conclusion,jobs:[.jobs[]|{name,conclusion}]}' >>"$OUT" 2>&1
# targeted: did any job fail at the restore step?
gh run view "$RUN" --log 2>/dev/null | grep -E 'Restore reference-pack audio|unrestorable|media_asset_missing' | sort -u | head -20 >>"$OUT"
echo "CI_WATCH_DONE run=$RUN" >>"$OUT"
