# SPEAK-PRACTICE-001 — scored free-speaking practice on the existing whisper sidecar

Source: 2026-11-26 owner conversation after the 0.5.0-alpha.1 release. Owner endorsed free
speaking + writing practice modes as a differentiator against premium apps ("if we can do that
in our free app that would be amazing"). Owner-locked posture inherited: speaking stays
**guided feedback, never a mastery grade** (existing shadowing copy promise); no cloud vendor,
no paid API — everything offline.

## Why this is buildable now (verified 2026-11-26)

- `apps/desktop/src/shadowing.tsx` already does record + playback + waveform with an honest
  no-scoring state.
- The whisper.cpp sidecar (aligner variant) ships in `usr/lib/open-language-learning-platform/
  aligner/linux-x64/` (whisper-cli + ggml-tiny) and `dictation_check` (lib.rs) already scores
  speech through whisper with abstention — the scoring machinery exists and is gated by
  SPEECH-007's calibration posture.

## Scope (this card, frozen)

1. **New practice mode `free-speaking`** in the practice hub: a short target-language prompt
   sentence or scenario cue from the current lesson pool; learner records a free attempt.
2. **Per-word alignment feedback**: run the recorded audio through the whisper sidecar, align
   to the intended text, and render per-word coloring (matched / fuzzy / missing) inside the
   prompt — the dictation inline-correction pattern (CORRECTION-IN-ARTIFACT-001 precedent).
3. **Guided only**: the score renders as coaching (percentage + coloring) and NEVER writes
   scheduler/mastery/plan state — pin with a contract test (same shape as G4-EXPLAIN-001's
   zero-write pin).
4. **Base (no-sidecar) build**: honest unavailable card naming the aligner variant as the
   requirement — same discovery/copy style as dictation abstention. No bundled fallback model.
5. **Honest abstention**: on ASR failure/low confidence, no coloring is fabricated — "couldn't
   align that, try again" (SPEECH-007 posture).

## Out of scope (later cards)

- Pronunciation/phoneme scoring (needs alignment quality data we don't have).
- Multi-sentence free conversation turns (that is the AI-001 conversation slice).
- ja prompts beyond kana-assisted sentences already in level pools.

## Acceptance contract

- Red-first vitest pins: mode reachable in hub + unlocks like other modes; unavailable path on
  no-sidecar; zero scheduler writes on score render; abstention renders no coloring.
- Rust: free-speaking check command mirrors dictation_check's abstention semantics; cargo
  fmt/clippy/test -p lts-desktop green; gates.log under state/evidence/SPEAK-PRACTICE-001/.
- Manual: one real recording scored green on the aligner build (evidence screenshot).
