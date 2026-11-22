# READING-CLUTTER-001 — clean learner reading view

Origin: controller browser audit 2026-11-21 (reading.tsx + live render),
screenshot `state/evidence/DOGFOOD-2026-11-21/complaint-08a-phone-tap-no-card.png`.
Two defects on the graded-reading story flow:

(a) every story word rendered a visible chip with RAW morphology tags
    (`nom.sg`, `acc.sg`, `impf.pres`) — internal notation shown to
    beginners as meaningless jargon;
(b) every sentence carried an inline "This looks right" CONTENT-CONFIRM
    button, turning a flowing story into a wall of buttons.

## OWNER RULING 2026-11-21 (verbatim, board comment on this card)

"having those buttons there does not make sense — confirmed: NO confirm
buttons inside the story flow. Pick the option that keeps the mechanic
but exits the prose: one confirmation control per story at the end
(quiet, with undo). Learner-side motivation is moot for accuracy anyway:
owner explicitly delegated story-accuracy verification to the agent
(CONTENT-QA-STORIES-001) — the in-app confirm now functions as learner
AGREEMENT signal, not accuracy gate; copy should reflect that lightly
(e.g. thumbs up/down on the story) rather than a verdict-sounding button
after every sentence."

## Frozen contract (what shipped)

1. Chips: the paragraph never renders `labels` sidecar values. The
   sidecar, wire shape (`StorySentence.labels`) and pack data are
   UNCHANGED — only the learner UI changed. The word card's human-form
   line ("Grammar in this sentence: хлеба — genitive singular") stays
   and now honors the per-profile `grammar_labels` display toggle
   (previously that toggle gated the inline chips; the setting keeps a
   real effect instead of dying).
2. Confirm: one control under the story — copy "Did this story sound
   right?" + button "👍 It sounds right" / "Undo", with the union
   "Confirmed by <names>" attribution line. A click invokes the SAME
   `content_confirm` command once per sentence; Undo invokes
   `content_unconfirm` for every sentence the learner marked. No new
   engine commands, no schema change. The word card keeps its own
   per-word toggle (it is not the prose).
3. SESSION-FLOW-COPY-001 has not landed (no ledger record); copy here
   is en-US plain scalar, coordination seam if that card opens.

## Evidence split (honest limits)

The `#reader` mobile harness runs the journeys' JA fixture story, which
ships NO label sidecar — so the before/after screenshots prove the
button-wall removal and confirm reachability, while the raw-tag chip
removal is pinned by reading.test.tsx's RU label fixtures (four tests:
flow renders bare buttons with sidecar labels present; card expands to
human form; toggle-off hides the card line; ja Ruby unaffected). The
capture harness still trips on any raw tag appearing in prose text as a
regression tripwire.

## Gate + harness record

`state/evidence/READING-CLUTTER-001/gates.log`. Harness:
`scripts/reading-clutter-capture.mjs` (RED at HEAD 4f12237: 2 confirm
buttons in prose, 0 story controls; GREEN: 0 in prose, 1 control,
44px-tall control fully in viewport).
