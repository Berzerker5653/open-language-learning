# UX-PERSONA-001 — grumpy-learner persona run (2026-11-08 Xvfb device walk)

Persona: first-time, tech-resistant learner on a fresh fake HOME; keyboard-
only walk of onboarding -> install -> practice -> shadowing. Screenshots in
`state/evidence/UX-PERSONA-001/` (home, new-profile step, pack rows, scrolled
pack step).

## Findings already fixed during the same night (not this card's work)
- Empty name field with no example -> placeholder "e.g. Alex" (`463fa12`).
- Model-audio Play button showed no playing state -> `Playing…` + aria-busy
  (KARAOKE-CLOCK-001, `4acc66c` / `3ff00dc`).
- Russian Writing mode offered "Show romaji" -> locale-gated noun, Russian
  shows "Show transliteration" (`33d8a77`).
- Russian pack absent from fresh installs -> PACK-BUNDLE-RU-001 (`7d9362f`).

## Findings THIS card owns
1. **Maturity jargon in the pack list.** Rows read
   "Japanese Reference Pack (ja-JP, experimental)",
   "Esperanto — original demo (unreviewed) (eo, community)". A learner has
   no referent for experimental/unreviewed/community; the tag currently
   communicates nothing except faint warning. Rewrite in outcomes
   (e.g. "full course, still checked by us" / "small demo made by us" /
   "volunteer-made, we have not checked it") with the exact policy meaning
   kept one expander away.
2. **Privacy bullets carry internal vocabulary.** "Learning evidence
   (answers, support use, timing) is stored only in a local database" —
   "learning evidence" and "support use" are ledger terms from this repo,
   not learner words. Restate concretely without losing any claim.
3. **Primary-action fold.** The persona walk stalled once with the primary
   button below the visible area; the packs step verified fine at 1080p
   (fx-11). The acceptance is an EXPLICIT verification pass at two viewport
   heights for every wizard step, not a layout guess.

## Non-findings (recorded so they are not re-chased)
- The "editable field full of junk" on the shadowing card was a test
  artifact: xdotool keystrokes bled into the legitimate typed-practice
  answer input. No product defect; input is labeled and graded.
- Mouse-coordinate drift in the harness produced false "button does
  nothing" readings; keyboard Tab+space activation is the reliable path.
