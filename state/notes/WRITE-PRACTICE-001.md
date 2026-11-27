# WRITE-PRACTICE-001 — free writing practice with mechanical, offline feedback

Source: 2026-11-26 owner conversation after the 0.5.0-alpha.1 release (owner endorsed free
speaking + writing modes; free forever, no cloud dependency). v1 gives real feedback with
ZERO AI by checking things we can verify locally.

## Scope (this card, frozen)

1. **New practice mode `free-writing`**: prompt = "use today's words" — a session-scoped list
   of N target words (from the current lesson pool, N = 6–10) + one L1 situational cue. The
   learner writes a short free text in the target language (soft floor ~15 words, no ceiling).
2. **Mechanical feedback, all offline, rendered on submit:**
   - **Script/spelling validity per word**: ru via the existing lexicon/dictionary checks;
     ja via kana/kanji validity + lexicon (unknown tokens flagged as "not in dictionary",
     never marked wrong outright — could be a name).
   - **Target-word usage chips**: how many of the session words actually appear (inflected
     forms accepted — reuse the typing mode's form matcher).
   - **Word count** of the attempt (own words only).
3. **Private writing journal**: attempts stored per profile, replayable newest-first, deleting
   a profile deletes them; nothing leaves the device. Progress surface shows attempts/week +
   unique-dictionary-words used (accumulation, settle-gated like other meters).
4. **Scoring posture**: word-usage count is a completion signal for the daily plan (like
   typing), dictionary flags are coaching only — no mastery writes; contract test pins it.

## Out of scope (later card)

- Grammar/fluency feedback via the AI-001 provider interface: a separate card
  `WRITE-PRACTICE-002` will attach BYO-endpoint optional feedback (off by default, consent
  gate, L2 in → L1 feedback, never a grade) — build only after this one ships.

## Acceptance contract

- Red-first vitest pins: mode reachable + unlocked by default; usage chips count inflected
  forms; unknown-ja-token message is "not in dictionary" not "wrong"; journal persists across
  profile switch; zero mastery/scheduler writes beyond the completion signal.
- Rust command `writing_check` (pack-aware ru/ja) green under cargo test with fixtures;
  fmt/clippy green; gates.log under state/evidence/WRITE-PRACTICE-001/.
- Learner-copy audit finds no promise of "correction" or "grammar feedback" in v1 copy.
