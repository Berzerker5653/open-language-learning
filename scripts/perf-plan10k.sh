#!/usr/bin/env bash
# PERF-002: app.session_plan_10k_evidence_ms — measured, not hand-waved.
#
# The BUDGETS line specifies a 10k-evidence corpus. There is no product
# surface to farm 10k real events, and app code must not be edited for the
# measurement — so the corpus is seeded through the storage CONTRACT: the
# same columns `Store::append_evidence` writes (crates/storage/src/evidence.rs),
# into the throwaway store the smoke walk already built. Synthetic rows are
# marked activity_id='perf.activity.plan10k.seed' so they can never be mistaken
# learner data anywhere (this store is deleted at exit; nothing is committed
# from it).
#
# Phases:
#   A  one full smoke walk on a persistent throwaway LTS_DATA_DIR
#      (creates the profile + installs the pack exactly like the app does);
#   B  python seeds 10,000 evidence_events against that profile/pack,
#      targets sampled from the installed pack's own lexicon ids;
#   C  five more full walks; each emits its own `call-ms:practice_plan` —
#      the loaded-corpus plan latency; p50/p95 over the five.
#
# Writes state/evidence/PERF-002/plan10k-$LABEL-$DATE.md + raw marker copies.
# Exits 0 only when every walk completed.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/tauri-env.sh

BIN=${LTS_PERF_BIN:-target/release/lts-desktop}
OUT=${LTS_PERF_OUT:-state/evidence/PERF-002}
LABEL=${LTS_PERF_LABEL:-gamingpc}
DATE_TAG=${LTS_PERF_DATE:-$(date +%F)}
WALKS_AFTER=${LTS_PERF_PLAN_WALKS:-5}
SEED_ROWS=${LTS_PERF_SEED_ROWS:-10000}
WALK_TIMEOUT=${LTS_PERF_WALK_TIMEOUT:-900}

die() { echo "FAIL: $*" >&2; exit 1; }
[ -x "$BIN" ] || die "$BIN not built"
command -v Xvfb >/dev/null || die "Xvfb missing"
command -v jq >/dev/null || die "jq missing"
command -v python3 >/dev/null || die "python3 missing"
pgrep -x lts-desktop >/dev/null 2>&1 && die "an lts-desktop instance is already running (single-instance forwarding)"

mkdir -p "$OUT"

XNUM=""
for n in 97 98 99 100 101 102; do [ ! -e "/tmp/.X$n-lock" ] && { XNUM=$n; break; }; done
[ -n "$XNUM" ] || die "no free X display :97-:102"
XDISPLAY=":$XNUM"
Xvfb "$XDISPLAY" -screen 0 1280x800x24 -nolisten tcp >/dev/null 2>&1 &
XPID=$!
DATA=$(mktemp -d /tmp/lts-plan10k-data.XXXXXX)
trap 'kill "$XPID" 2>/dev/null || true; rm -rf "$DATA"; true' EXIT
sleep 1
kill -0 "$XPID" || die "Xvfb failed"
export DISPLAY="$XDISPLAY"

reap() {
  local pid=$1 i
  pkill -TERM -P "$pid" 2>/dev/null || true
  kill -TERM "$pid" 2>/dev/null || true
  for i in $(seq 1 50); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
  kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null || true
  sleep 0.5
}

walk_once() { # $1 = tag; echoes the practice_plan ms from that walk
  local tag=$1 mark nroutes plan
  mark=$(mktemp -u /tmp/lts-plan10k-mark.XXXXXX)
  LTS_DATA_DIR="$DATA" LTS_SMOKE_FILE="$mark" timeout "$WALK_TIMEOUT" env "$BIN" >/dev/null 2>&1 || true
  [ -f "$mark" ] || { echo "FAIL: walk $tag wrote no marker" >&2; return 1; }
  grep -q 'routes-complete' "$mark" || { echo "FAIL: walk $tag never completed" >&2; cp "$mark" "$OUT/plan10k-$tag-marker-failed.txt"; return 1; }
  nroutes=$(grep -c '^smoke-ok route:' "$mark" || true)
  [ "$nroutes" -ge 12 ] || { echo "FAIL: walk $tag only $nroutes routes" >&2; return 1; }
  cp "$mark" "$OUT/plan10k-$tag-marker.txt"
  plan=$(grep '^smoke-ok call-ms:practice_plan:' "$mark" | head -1 | cut -d: -f3)
  rm -f "$mark"
  echo "$plan"
}

echo "== phase A: baseline walk (fresh profile) =="
BASE_MS=$(walk_once baseline)
DB="$DATA/profiles.db"
[ -f "$DB" ] || die "walk did not create $DB"

PROFILE=$(python3 - "$DB" <<'PY'
import sqlite3, sys
con = sqlite3.connect(sys.argv[1])
print(con.execute("SELECT id FROM profiles ORDER BY id LIMIT 1").fetchone()[0])
PY
)
echo "profile: $PROFILE; seeding $SEED_ROWS rows"

python3 - "$DB" "$DATA" "$PROFILE" "$SEED_ROWS" <<'PY'
import json, random, re, sqlite3, sys, glob, datetime
db, data, profile, rows = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
con = sqlite3.connect(db)
pack, ver = con.execute(
    "SELECT pack_id, version FROM profile_pack_selections WHERE profile_id=? LIMIT 1", (profile,)
).fetchone()
cols = {r[1] for r in con.execute("PRAGMA table_info(evidence_events)")}
assert {"event_id","occurred_at","profile_id","targets_json","modality","activity_id",
        "outcome","score_json","support_level","held_out","pack_version"} <= cols, f"unexpected schema: {sorted(cols)}"

# Targets come from the installed pack's own lexicon ids — the same content
# ids the planner reasons about.
ids = []
for path in glob.glob(f"{data}/packs/{pack}/{ver}/lexicon/*.jsonl"):
    for line in open(path, encoding="utf-8"):
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(e, dict) and isinstance(e.get("id"), str):
            ids.append(e["id"])
assert ids, "no lexicon ids found in the installed pack"

# Modality/outcome strings follow the domain enums (kebab-case serde): a
# mix of the practice modalities and mostly-scored outcomes, like a real
# heavy learner.
MODS = ["comprehension-listening", "comprehension-reading", "recall-meaning", "orthography-recognition", "phonological-discrimination", "orthographic-encoding", "production-writing", "retention"]
random.seed(20261020)
base = datetime.datetime(2026, 10, 1, tzinfo=datetime.timezone.utc)
sql = None
for i in range(rows):
    eid = f"perf.plan10k.{i:06d}"
    occurred = (base + datetime.timedelta(minutes=i)).strftime("%Y-%m-%dT%H:%M:%SZ")
    targets = [random.choice(ids)]
    if random.random() < 0.3:
        targets.append(random.choice(ids))
    vals = {
        "event_id": eid,
        "occurred_at": occurred,
        "profile_id": profile,
        "targets_json": json.dumps(targets),
        "modality": json.dumps(random.choice(MODS)),
        "activity_id": "perf.activity.plan10k.seed",
        "support_level": random.choice([0, 0, 0, 1, 2]),
        "support_actions_json": "[]",
        "outcome": json.dumps("scored" if random.random() < 0.85 else random.choice(["abstained", "skipped"])),
        "score_json": json.dumps("correct") if random.random() < 0.7 else (json.dumps("incorrect") if random.random() < 0.5 else None),
        "held_out": 1 if random.random() < 0.1 else 0,
        "pack_id": pack,
        "pack_version": ver,
    }
    # Only columns that exist in this schema (failure_reason et al. stay NULL).
    keys = [k for k in vals if k in cols]
    con.execute(
        f"INSERT OR IGNORE INTO evidence_events({','.join(keys)}) VALUES ({','.join('?'*len(keys))})",
        [vals[k] for k in keys],
    )
con.commit()
print("seeded:", con.execute("SELECT COUNT(*) FROM evidence_events WHERE profile_id=?", (profile,)).fetchone()[0])
PY

echo "== phase B/C: $WALKS_AFTER walks on the loaded corpus =="
declare -a PLAN_MS
PLAN_MS+=("$BASE_MS")   # context row: fresh-profile plan
for run in $(seq 1 "$WALKS_AFTER"); do
  echo "  loaded walk $run ..."
  PLAN_MS+=("$(walk_once loaded-$run)")
done

LOADED=("${PLAN_MS[@]:1}")
SORTED=$(printf '%s\n' "${LOADED[@]}" | sort -n)
N=$(echo "$SORTED" | wc -l)
P50=$(echo "$SORTED" | awk -v n="$N" 'NR==int(0.5*n+0.999999){print}')
P95=$(echo "$SORTED" | awk -v n="$N" 'NR==int(0.95*n+0.999999){print}')
[ -n "$P50" ] || P50=$(echo "$SORTED" | head -1)
[ -n "$P95" ] || P95=$(echo "$SORTED" | tail -1)

MD="$OUT/plan10k-$LABEL-$DATE_TAG.md"
{
  echo "# PERF-002 — app.session_plan_10k_evidence_ms ($LABEL, $DATE_TAG)"
  echo
  echo "Corpus: $SEED_ROWS synthetic evidence_events seeded through the storage"
  echo "contract (columns as written by \`Store::append_evidence\`) into the"
  echo "throwaway smoke store; targets sampled from the installed pack's lexicon"
  echo "ids; rows tagged \`activity_id='perf.activity.plan10k.seed'\` and the store is"
  echo "deleted at exit — no learner data exists or ships from this run."
  echo
  echo "| walk | practice_plan ms |"
  echo "|---|---|"
  echo "| baseline (fresh profile) | $BASE_MS |"
  i=1
  for v in "${LOADED[@]}"; do echo "| loaded-$i | $v |"; i=$((i+1)); done
  echo
  echo "**Loaded-corpus p50 = $P50 ms, p95 = $P95 ms** (n=$N, nearest-rank)."
  echo "Raw markers: \`plan10k-*-marker.txt\` in this directory."
} > "$MD"
cat "$MD"
echo "OK"
