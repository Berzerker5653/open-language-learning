# WORD-STATE-COLORING-001 / REVIEW-WORD-STATE-COLORING-001 — SPEC verdict

Axis: (a) SPEC — does the diff do exactly what the card (state/notes/WORD-STATE-COLORING-001.md) asked?
Evidence reviewed: code 2a5e71af (apps/desktop/src/reading.tsx, App.tsx, packages/ui/src/styles.css, reading.test.tsx, state/evidence/WORD-STATE-COLORING-001/gates.log, learner-inspection.md, audit.json, phone-*.png), ledger 68b9409a, task-state.json entry.

## Verdict: FAIL — one evidence-fidelity defect (D1). Implementation logic is sound; do not approve as-is.

### Defect
- **D1 — phone-2-confirmed.png is byte-identical to phone-1-paragraph.png and does not show the muted confirmed state it claims.** `md5sum` of the two files match exactly (`d5b15ca3ccfe166dcd8576ab83bb3f03`). Visually, phone-2-confirmed.png shows the first word きょうしつ with a teal/dark-green rectangular outline (the selected/active state) and the rest plain — not the claimed muted (`--ink-faint`, rgb(117,108,93)) confirmed state described in learner-inspection.md ("phone-2-confirmed: after pressing the confirm button, きょうしつ is word word--confirmed (computed rgb(117, 108, 93) — muted, via --ink-faint)"). The audit.json confirmed block does record class `word word--confirmed` + `rgb(117,108,93)`, so the JSON and the gates.log claim a confirmed capture that the committed PNG does not show. Either the PNG was never re-captured for the confirmed state (copy-paste from the paragraph shot), or the harness did not capture after the confirm press. The evidence artefact for the one state most likely to be mistaken for an unearned confirmation — the whole point of the honesty contract — is unfaithful. This is the one blocking finding.

### In-scope (verified against the card)
- Reader surface coloring: unseen = plain text (no state class), learning = teal (`--accent`), confirmed = muted (`--ink-faint`) — reading.tsx:311-316 (`stateFor`), styles.css:1795-1803.
- Honest states only: confirmed is claimed only for the learner's OWN mark on the word's content id (`known.id`), never for someone else's mark (`marks.some(c => c.display_name === p.profileName)`, reading.tsx:314); learning is only the learner's kept-words list (`minedSurfaces` from `mineItems`, App.tsx:4513). No pack-derived per-word state is faked. No parallel store.
- Tokens, not raw hex: `--accent`, `--ink-faint` (styles.css). State classes declared before `.word--active` so the open-card marker still wins (styles.css comment).
- Confirmation wins over learning (reading.tsx:311-316; vitest pin).
- Red-first vitest pins (5 new): unseen plain / learning teal / confirmed muted / other-mark-not-confirmed / confirmation-wins-over-learning (reading.test.tsx:411-469).
- Wiring: `void refreshMine()` in `openReading` (App.tsx:3294-3297) primes the kept-words list at the moment the reader opens; `minedSurfaces` passed to ReadingPanel (App.tsx:4513). This is in-scope support for the learning state, not an out-of-scope addition.
- tsc clean; full desktop suite 680/680 (gates.log, matches learner-inspection.md). 390px capture under state/evidence/WORD-STATE-COLORING-001/.

### Out-of-scope additions / omissions
- None beyond the evidence defect. No change to the word-card tap/overlay layer, no speech/dictation area changes, no pack re-publish, no layout redesign (styles.css adds only the two state classes). No omissions: one reader surface (reading.tsx) is the in-flow passage renderer; speech/dictation areas are explicitly out of scope.
- Note (non-blocking, for the FIX pass): the confirmation for a word whose sentence was confirmed at the story level is NOT painted as confirmed (stateFor keys on `known.id`, not the sentence `content_id`) — this is consistent with the contract ("the word's content id") but worth a note so the next reader knows sentence-level confirmation does not tint words.

## Verdict: FAIL — D1 (evidence fidelity: confirmed capture is byte-identical to the paragraph shot and shows no muted state). Implementation is otherwise sound. Spawn a FIX follow-up to re-capture phone-2-confirmed.png honestly (and re-check the unseen/learning shots), do not land the evidence as-is.
