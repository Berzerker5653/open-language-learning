# REVIEW-FIX-BUTTON-AFFORDANCE-PINS-001 — STANDARDS verdict

**Verdict: PASS**

- Commit 432a70db is task-scoped: test-only re-pin + gates.log; message honestly states the gates (665/665, was 664/665) and the superseded contract. No test deletion, no assertion weakening (arguably strengthening), no gate weakening, no source change — not a design edit.
- Test-tree hygiene per the lts-concurrent-lane-commits re-pin rule: the superseded assertion is re-pinned IN THE SAME COMMIT as the gate evidence; the test comment documents the superseded contract; no other superseded pins left in the tree (grep of the desktop src + packages/ui styles confirms no other opacity-0.45 / ink-soft / --line disabled-button pins remain — the 2026-10-23 contract is recorded only in the test comment, as intended). Pinned selectors untouched (no `.btn:disabled` re-declaration / rule-body edits).
- Ledger hygiene: 951de12a closes FIX-HOME-POSTURE-PENDING-001 and FIX-BUTTON-AFFORDANCE-PINS-001 together — ledger-only commit, both cards' evidence paths exist (`state/evidence/FIX-BUTTON-AFFORDANCE-PINS-001/gates.log`, `state/notes/FIX-BUTTON-AFFORDANCE-PINS-001.md`); task-state.json FIX-BUTTON-AFFORDANCE-PINS-001 entry records done with existing evidence path (state/notes/FIX-BUTTON-AFFORDANCE-PINS-001.md); ROADMAP optional_tasks entry + KANBAN.md row landed in the same commit. No gate/test script edited.
- Shared-dir race noted: working tree dirty with sibling WIP (apps/desktop/src/serve-pairing.test.tsx untracked; state/evidence/PATH-CONNECT-PILL-001/, RU-CONTENT-FREEZE-047-001/, RU-STORIES-MEDIA-001/ untracked) — not touched; review used committed diffs only.
- Not re-verified at HEAD-for-everything: committed work is NOT re-verified per board protocol; the scoped contract test was re-run (5/5) to confirm the committed tree is green, and the full-suite claim is accepted from gates.log.

No defects. No FIX follow-up card.
