#!/usr/bin/env bash
# ENCOUNTER-BEFORE-TEST-001 takeover lane gates, run 2 (controller).
# Fixes run-1 defects: GATE-OFF diagnostic died on E0282 (unannotated
# HashSet); green runs hit the fixture empty-lexicon-dir bug (now fixed).
set -x
R=/home/hunter/game-dev/LTS
G=$R/state/evidence/ENCOUNTER-BEFORE-TEST-001/gates-takeover
cd "$R" || exit 9
SUM=$G/summary2.txt
: > "$SUM"

# 1) GATE-OFF red-first diagnostic: disable ONLY the allowance result,
#    keep everything compiling. The named test must go RED behaviorally.
cp apps/desktop/src-tauri/src/lib.rs "$G/lib-gateoff-backup.rs"
python3 - <<'PY'
p = "/home/hunter/game-dev/LTS/apps/desktop/src-tauri/src/lib.rs"
src = open(p).read()
old = "    let unencountered = encounter_test_allowance(data, &store, profile_id)?;"
new = "    let unencountered: std::collections::HashSet<String> = Default::default(); let _gate_off_probe = encounter_test_allowance(data, &store, profile_id)?; debug_assert!(!_gate_off_probe.is_empty() || _gate_off_probe.is_empty());"
assert src.count(old) == 1
open(p, "w").write(src.replace(old, new))
PY
cargo test -p lts-desktop --lib a_letter_is_never_tested_before_its_encounter_completes > "$G/gate-off-red2.log" 2>&1
echo "gate_off_red2 exit=$? (NONZERO + assertion-level red expected)" >> "$SUM"
grep -c "a never-met letter surfaced as a quiz" "$G/gate-off-red2.log" >> "$SUM" || true
cp "$G/lib-gateoff-backup.rs" apps/desktop/src-tauri/src/lib.rs
cmp "$G/lib-gateoff-backup.rs" apps/desktop/src-tauri/src/lib.rs && echo "restore ok" >> "$SUM"

# 2) fmt
cargo fmt --all --check > "$G/fmt2.log" 2>&1; echo "fmt exit=$?" >> "$SUM"

# 3) storage lane tests
cargo test -p lts-storage > "$G/storage2.log" 2>&1; echo "storage exit=$?" >> "$SUM"

# 4) desktop lib suite (full package-scoped)
cargo test -p lts-desktop --lib > "$G/desktop-lib2.log" 2>&1; echo "desktop_lib exit=$?" >> "$SUM"

# 5) scoped clippy gates
cargo clippy -p lts-desktop --all-targets -- -D warnings > "$G/clippy-desktop2.log" 2>&1; echo "clippy_desktop exit=$?" >> "$SUM"
cargo clippy -p lts-storage --all-targets -- -D warnings > "$G/clippy-storage2.log" 2>&1; echo "clippy_storage exit=$?" >> "$SUM"

# 6) frontend gates
cd "$R/apps/desktop" || exit 9
pnpm typecheck > "$G/tsc2.log" 2>&1; echo "tsc exit=$?" >> "$SUM"
pnpm test > "$G/vitest2.log" 2>&1; echo "vitest exit=$?" >> "$SUM"
pnpm build > "$G/build2.log" 2>&1; echo "build exit=$?" >> "$SUM"

# 7) serve binary (current tree => dev pack carries the confusable copy)
cd "$R" || exit 9
cargo build -p lts-desktop --features serve --bin lts-serve > "$G/serve-build2.log" 2>&1; echo "serve_build exit=$?" >> "$SUM"

# 8) acceptance capture (serve install_pack + CDP; writes encounter-panel.png)
SERVE_BIN="$R/target/debug/lts-serve" SERVE_DIST="$R/apps/desktop/dist" \
  node scripts/encounter-capture.mjs > "$G/capture2.log" 2>&1; echo "capture exit=$?" >> "$SUM"

# 9) owner-profile plan audit against a SNAPSHOT COPY of the live data dir
#    (never serve the owner's live dir: serve auto-installs packs there).
SD=/home/hunter/.hermes/cache/scratch/enc001-audit
rm -rf "$SD"; mkdir -p "$SD"
cp -a "$HOME/.local/share/openlang" "$SD/openlang"
LTS_DATA="$SD/openlang" SERVE_BIN="$R/target/debug/lts-serve" SERVE_DIST="$R/apps/desktop/dist" \
  node scripts/owner-plan-audit.mjs > "$G/owner-audit2.log" 2>&1; echo "owner_audit exit=$?" >> "$SUM"

set +x
echo BATTERY2-DONE
cat "$SUM"
