# FIX-READER-FLOW-001b-3 — aux attribution string alignment (S2)

Verdict: FIXED on main at 57388d2 (parent 48c5aa1).

## Defect (REVIEW-READER-FLOW-001b, SPEC axis S2)
The frozen contract (state/notes/READER-FLOW-001.md, OFF-PACK SLICE
addendum) pins the attribution "Definitions from Wiktionary via
kaikki.org (CC BY-SA / GFDL)" and requires it displayed on every aux
card. The card displayed a variant: lib.rs `AUX_SOURCE` omitted the
"Definitions from" prefix and reading.tsx wrapped it in parens,
yielding nested parens `... dictionary (Wiktionary via kaikki.org (CC
BY-SA / GFDL))`. The pinned string never reached the learner even
though provenance.attribution and scripts/build-aux-lexicon.py
ATTRIBUTION carried it.

## Fix (code commit 57388d2, 3 files)
- apps/desktop/src-tauri/src/lib.rs — `AUX_SOURCE` := pinned string
  (byte-identical to provenance.attribution / build ATTRIBUTION;
  verified via grep of state/notes/READER-FLOW-001.md,
  aux/lexicon/ru.provenance.json, scripts/build-aux-lexicon.py:74).
- apps/desktop/src/reading.tsx — label sentence ends with a period and
  the attribution renders ungwrapped: "offline auxiliary dictionary.
  Definitions from Wiktionary via kaikki.org (CC BY-SA / GFDL)".
  Separate-label + never-pack semantics untouched (the
  "not in your pack" label and `not.toContain("in your pack (")`
  assertion unchanged).
- apps/desktop/src/reading.test.tsx — aux case stubs the pinned string
  and asserts it verbatim (replaces the loose "kaikki.org" substring
  assert).

## Concurrency (dirty main tree, sibling lane uncommitted)
lib.rs carried another lane's 178-line WIP. Grafted per
lts-concurrent-lane-commits: scratch worktree at HEAD, one-line edit,
`git hash-object -w` + `git update-index --cacheinfo`; staged diff
verified = 1 line on lib.rs. Same hunk mirrored into the dirty working
copy so the sibling's next commit carries the fix. reading.tsx /
reading.test.tsx were clean (HEAD-identical) — edited directly.

## Gates (gates.log; run against HEAD + this change in the clean
worktree, frontend re-confirmed post-commit)
- npx tsc --noEmit: exit 0
- npx vitest run src/reading.test.tsx: 21/21 (exact-string assert green)
- cargo fmt -p lts-desktop --check: exit 0
- cargo test -p lts-desktop aux: 3/3 (incl.
  word_card_off_pack_token_gets_the_labeled_aux_card, which asserts
  aux_source == AUX_SOURCE)
- cargo clippy -p lts-desktop --all-targets -- -D warnings: exit 0
- raw logs: cargo-test-aux.log, clippy.log in this directory.

## Contract
No task-state.json entry: FIX-001b-* cards close with board handoff +
evidence only (matches 001b-1/2 hygiene); no ROADMAP line for this id.
