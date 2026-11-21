# FIX-READER-FLOW-001b-1 — aux_index parsed once, not per tap

## What landed
- 12202f3 chore(rot): HEAD did not compile (word_card_at arms Ok()-wrapped vs bare-view tail E0308/E0609; 9a25202 mine partial-move E0382; unwrap_err test needs Debug). Also fmt-swept crates/storage (HEAD was fmt-dirty).
- c9e332e fix: AuxCacheEntry owns aux_hit's (surface, lemma, rows) triple; word_card_at clones Arc once and borrows rows. Wire format untouched. 2 new tests.

## Gate integrity finding (process rot)
Prior 'green' runs used `cargo test ... | tail` pipelines — tail's exit code masked cargo's failure. All lanes must use unpiped exit codes or `&&`-chains with PIPESTATUS. First all-marker unit run was fake-green because of this.

## Gates (honest, worktree lts-fixreader001b1, shared CARGO_TARGET_DIR)
- cargo fmt --all --check: OK
- cargo clippy -p lts-desktop --all-targets: clean
- cargo test -p lts-desktop word_card: 7 passed / 0 failed (incl. both new tests)
- cargo test -p lts-storage: all suites ok
- cargo test -p lts-desktop --lib: 167 passed, 37 FAILED — pre-existing, unrelated family (ja-pack/plan/provenance/pronunciation tests) that had not run since 9a25202 broke compilation. Names in gates.log region; needs planner FIX cards.

## Hotspot
apps/desktop/src-tauri/src/lib.rs test module: 12/20 sync hunks rejected against sibling dirty WIP (their fmt re-wraps of word_card_at call sites). apps/desktop/src-tauri/src/lib.rs.rej left in the working tree; whoever commits that WIP next must re-apply c9e332e test hunks or the two new tests silently vanish.
