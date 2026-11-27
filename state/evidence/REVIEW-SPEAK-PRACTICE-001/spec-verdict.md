# REVIEW-SPEAK-PRACTICE-001 — SPEC verdict

Reviewed diff: 6e5bc83e (code) + 4559d124 (ledger) — free-speaking practice mode.
Contract: state/notes/SPEAK-PRACTICE-001.md. Verdict: **PASS-WITH-NOTES**. No FIX card required.

## Scope items (all five shipped)

1. `free-speaking` mode in the practice hub — HUB_MODES entry + HubMode union + App route;
   prompt from `dictation_target`, the same encounter-gated lesson pool the dictation cue
   uses; free recorded attempt (Record attempt -> Stop and check). MET.
2. Per-word alignment feedback — `align_free_words` (deterministic LCS exact anchors +
   in-order char-match pairing, fuzzy at ratio >= 0.6) over the real whisper-sidecar
   transcript; matched/fuzzy/missing coloring rendered INSIDE the prompt span
   (`fs-word--*` classes on the prompt words). The CORRECTION-IN-ARTIFACT-001 pattern
   carried to speech. MET.
3. Guided only — score is a coaching percentage + coloring; the invariant is structural:
   `FreeSpeakingAttempt` carries NO profile_id/content_id, so the command cannot even
   address scheduler/mastery/plan/error-ledger state. Pinned twice: Rust contract test
   `free_speaking_check_performs_zero_store_writes` (byte-identical stores before/after
   across scheduler/mastery/error-ledger/mined/lookups, run through the REAL vendor
   scoring path when the aligner is present) and the journey write-command denylist
   around the whole flow. Exactly the G4-EXPLAIN-001 pin shape the card asked for. MET.
4. Base (no-sidecar) build — `aligner-unavailable` abstain copy names the whisper.cpp
   aligner runtime as the requirement and states no fallback model ships; journey leg 1
   renders the card with ZERO word coloring and no number. MET.
5. Honest abstention — fail-closed mirrors of dictation_check: quality rejection, dead
   sidecar, timeout, empty transcript, engine fault, and transcript char-match ratio
   <= 0.4 all ABSTAIN with `words: []` and `score: None`; UI pins assert no `fs-word--`
   class and no `\d+%` on any abstain render. MET.

## Acceptance contract

- Red-first vitest pins: hub reachability (journey clicks hub -> Free speaking), unavailable
  path, zero scheduler writes, abstention-no-coloring — all present and green (28/28 scoped).
- "unlocks like other modes": grep confirms NO hub mode has any unlock/lock gate anywhere
  (hub.tsx, App.tsx) — every mode is ungated, so the reachability pin IS the substantive
  form of this item. No separate unlock pin was owed. MET (by structure).
- Rust: `free_speaking_check` mirrors dictation abstention semantics; fmt/clippy/test
  -p lts-desktop green per evidence AND re-verified by the reviewer at HEAD (below). MET.
- Wire contract independently confirmed: `packAttemptRequest` injects snake_case `pack_id`
  inside the nested `attempt` payload (apps/desktop/src/app/primitives.ts), matching the
  serde struct; the harness assertion `attempt.pack_id === RU` pins the same shape.
- Manual leg "one real recording scored green on the aligner build (evidence screenshot)":
  NOT met as written. Deferral is honest and loud (commit message, gates.log, ledger
  message, task-state notes all say DEFERRED / not claimed); a headless board worker has
  no microphone. The substitute evidence is automated and strong:
  `free_speaking_check_scores_a_real_recording` runs a real pack clip through the real
  whisper.cpp aligner against its own prompt — abstain None, word matched, score >= 0.9
  (reviewer re-ran it green). NOTE: the GUI mic screenshot belongs to the owner manual
  pass (REL-001 posture), like other GUI legs.

## Out-of-scope audit

Nothing beyond the contract. All extra diff hunks are required wiring: capture-route ref,
journeys/harness fake-engine case, styles.css coloring tokens, hub table entry. The
session-chrome badge-count change is a sanctioned re-pin (literal 8 -> HUB_MODES.length;
the per-card "exactly one badge" invariant is preserved and no longer goes stale on add).
