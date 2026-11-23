# REVIEW-PATH-VISUAL-001 — SPEC axis verdict

Contract under review: `state/notes/PATH-VISUAL-001.md` (done-threshold audit,
IN-PROGRESS state, winding geometry, evidence gates 1-4).
Diff: `758bd71` (code + capture + evidence + notes + roadmap card) and
`409140f` (ledger close).

## Outcome: approved-with-notes

### Spec items verified (independently re-run at HEAD)

- **Done stays the evidence floor.** `unit_path_at` keeps
  `done = refs_done == refs.len()` where refs_done counts evidence-backed
  rows (state >= Introduced); the encounter row can start a unit but never
  finish one. Attendance red test
  `unit_path_done_never_reads_attendance_only` re-run green at HEAD.
- **IN-PROGRESS state.** `in_progress = !locked && !done &&
  (started || encounter_complete)` exactly as the notes define;
  `refs_started` keys on a derived row at a state other than Unseen. The
  named red test `letter_unit_goes_in_progress_then_done_as_its_refs_are_proven`
  (ready → encounter IN PROGRESS refs_done 0 → 3-of-4 refs_done 3 not done →
  all-4 DONE) re-run green at HEAD (1 passed, 85s).
- **Honest arc.** Ring fill = `refs_done/refs_total` (data-fill +
  strokeDasharray, `Math.round(fill*100)`); no fake-half path anywhere in the
  diff. vitest measures the 0.75 arc + "In progress (3/4 learned)" label.
- **Winding track.** `pathSway(i) = round(34*sin(i*2*pi/6))` — exactly the
  notes' formula, deterministic from index; vitest asserts the wave
  (±29/0 px), capture measured x-spread 58 px > 0 at 390px.
- **State rings.** CSS covers locked (dim + drawn SVG lock, never emoji),
  ready, in-progress, done (check), review-due, current; 48px dial = 3rem ✓;
  76px row pitch constant ✓.
- **Section banner + counter.** Wide banner with friendly name + CEFR gloss;
  counter counts `done` nodes only — capture DOM measured "2/20 units done"
  == API `bandDone: 2`. The owner's complaint scene ("0/20 alongside a pin
  beyond it") is structurally impossible at HEAD; before-shot
  `before-390.png` md5-matches DOGFOOD complaint-09b (provenance verified).
- **Data layer untouched.** Diff touches only the desktop view projection +
  UI + dev capture; no crates below apps/desktop, no pack/language data,
  `encountered_unit_ids` pre-existed at 758bd71^.

### Defects named (evidence tooling — planner: spawn a FIX card; these are
### NOT the two banked on FIX-PATH-VISUAL-001-1)

- **D1 — the capture's "owner's exact scene" is never seeded**
  (`scripts/path-visual-capture.mjs:207`). `unitRefs` collects a unit's
  content_refs across activities with duplicates (a letter repeated in 3
  activities counts 3x), so `slice(0, -1)` removes one duplicate, not the
  last unique ref: the "partial" unit `k-e-n-s` gets ALL four unique refs
  drilled and flips DONE (result.json shows 2 done units, `drilledPartial`
  contains k,e,n,s three times). The check named "a three-of-four unit is IN
  PROGRESS" (line 232) actually measured an incidental 8/36 —
  `cyrillic-stress-review` picked up the 8 drilled letters as shared refs.
  The notes' gate 3 promises "unit 2 all-but-last-ref drilled (pinned, ring
  3/4, the owner's exact scene)"; that scene is absent from the shipped
  evidence. Fix: dedupe refs before slicing (or drill unique refs) and
  assert the seeded unit is the one measured; re-capture.
- **D2 — tautological assertion** (line 238): the check "the pin sits on a
  unit the learner started (never past real progress)" evaluates
  `pinned.every((n) => n.in_progress || n.done || n.current)` where
  `pinned = nodes.filter((n) => n.current)` — `n.current` makes it true by
  construction; it can never fail. (The measured data even shows two pinned
  frontier units with refs_done 0 — fine under frontier semantics, but the
  check as written does not measure the claim in its name.) Fix: drop
  `|| n.current` and name the check for what frontier semantics guarantee
  (e.g. every unit before each pin is done).

### Observations (not defects)

- **O1.** In the acceptance scene the label "In progress (n/m learned)"
  appears nowhere: all three in_progress API nodes are pinned, and `current`
  ranks above `in_progress` in `pathNodeState` (as the notes mandate), so
  pinned partials show the arc without the text label. Self-consistent with
  the contract; vitest proves the label for unpinned partials. UX candidate
  only: pinned partials convey progress via arc alone.
- **O2.** Vision cross-check of both after-shots re-confirmed the two
  cosmetic defects already banked on FIX-PATH-VISUAL-001-1 (sway/ring label
  overlap at 390px, duplicate "You are here" captions). Not duplicated here.
