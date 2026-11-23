feat(evidence): UNIT-CAPSTONE-001 capture pair + gate logs

red@HEAD (c81e8470, pre-capstone binary from a detached worktree): every
capstone check FAILS — no node on the wire, none on the live path.
green (this tree): 13/13 PASS incl. locked checkpoint LAST in on-ramp with
its unlock hint on the 390x844 live journey (path-capstone-node.png),
counter "0/21 done" counting the checkpoint. Gate logs: fmt, clippy
(-p lts-storage -p lts-desktop --all-targets -- -D warnings), cargo test
-p lts-storage, cargo test -p lts-desktop --lib capstone (3/3), tsc,
vitest 505/505. Red run serves the NEW dist with the HEAD binary on
purpose: the capstone node is engine-synthesized, so its absence at HEAD
is exactly what the red measures.
