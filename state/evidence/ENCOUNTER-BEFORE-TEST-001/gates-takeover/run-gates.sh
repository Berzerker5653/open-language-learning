#!/usr/bin/env bash
# ENCOUNTER-BEFORE-TEST-001 takeover lane gates (LANE tier only).
set -x
R=/home/hunter/game-dev/LTS
G=$R/state/evidence/ENCOUNTER-BEFORE-TEST-001/gates-takeover
mkdir -p "$G"
cd "$R" || exit 9
SUM=$G/summary.txt
: > "$SUM"

cargo fmt --all --check > "$G/fmt.log" 2>&1; echo "fmt exit=$?" >> "$SUM"

# storage lane (encounter.rs gained encountered_unit_ids + test asserts)
cargo test -p lts-storage > "$G/storage-tests.log" 2>&1; echo "storage exit=$?" >> "$SUM"

# GATE-OFF red-first diagnostic: disable ONLY the ENCOUNTER gate retains in
# build_plan, the named plan test must go RED (the contract pins red-first).
cp apps/desktop/src-tauri/src/lib.rs "$G/lib.rs.bak"
python3 - <<'PY'
p = "/home/hunter/game-dev/LTS/apps/desktop/src-tauri/src/lib.rs"
src = open(p).read()
old = "    let unencountered = encounter_test_allowance(data, &store, profile_id)?;"
new = "    let unencountered = std::collections::HashSet::new(); /* GATE-OFF */ let _ = encounter_test_allowance(data, &store, profile_id)?;"
assert src.count(old) == 1
open(p, "w").write(src.replace(old, new))
PY
cargo test -p lts-desktop --lib a_letter_is_never_tested_before_its_encounter_completes > "$G/gate-off-red.log" 2>&1
echo "gate_off_red exit=$? (NONZERO/red expected)" >> "$SUM"
cp "$G/lib.rs.bak" apps/desktop/src-tauri/src/lib.rs

# green: named red-first tests, then the full desktop lib suite
cargo test -p lts-desktop --lib a_letter_is_never_tested_before_its_encounter_completes > "$G/green-redtest.log" 2>&1; echo "green_redtest exit=$?" >> "$SUM"
cargo test -p lts-desktop --lib a_legacy_earned_review_survives_without_an_encounter_event > "$G/green-grandfather.log" 2>&1; echo "green_grandfather exit=$?" >> "$SUM"
cargo test -p lts-desktop --lib > "$G/desktop-lib-tests.log" 2>&1; echo "desktop_lib exit=$?" >> "$SUM"

cargo clippy -p lts-desktop --all-targets -- -D warnings > "$G/clippy-desktop.log" 2>&1; echo "clippy_desktop exit=$?" >> "$SUM"
cargo clippy -p lts-storage --all-targets -- -D warnings > "$G/clippy-storage.log" 2>&1; echo "clippy_storage exit=$?" >> "$SUM"

# frontend lane gates
cd apps/desktop
pnpm typecheck > "$G/tsc.log" 2>&1; echo "tsc exit=$?" >> "$SUM"
pnpm test > "$G/vitest.log" 2>&1; echo "vitest exit=$?" >> "$SUM"
pnpm build > "$G/vite-build.log" 2>&1; echo "vite_build exit=$?" >> "$SUM"

# serve binary for the acceptance capture + owner audit
cd "$R"
cargo build -p lts-desktop --features serve --bin lts-serve > "$G/serve-build.log" 2>&1; echo "serve_build exit=$?" >> "$SUM"
set +x
cat "$SUM"
