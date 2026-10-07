# ADR 0013: Pack-declared production targets (language-neutral pronunciation scoring)

Status: Accepted (guided-only; targets uncalibrated until SPEECH-007)
Date: 2026-10-06

## Context

The guided pronunciation feature (SPEECH-005/006, ADR-0011) scores a learner's
spoken minimal pair by comparing a measured whole-word voiced-duration ratio
(`voiced(long_word) / voiced(short_word)`, already self-normalized to the
learner's own two words) against a **target ratio**. Until now that target came
only from a reference recording (`media/{id}.short.wav` / `{id}.long.wav`).

Two problems:

1. **No reference media exists, and TTS cannot supply one.** The real `ja-JP`
   pack ships no contrast media. Synthesized references were measured with the
   feature's own `voiced_seconds`: Kokoro v1_0 = 1.04, Kokoro v1_1 = 1.05, and
   **OpenJTalk** (a mora-timing HMM TTS) = 1.07 for おばさん/おばあさん. None
   lengthens the long vowel, so no available TTS can anchor — *or verify* — a
   length judgement. Scoring against a ~1.0 reference flags a correct contrast
   as "too long" (false feedback, docs/05).
2. **The problem is not Japanese-specific.** Any language whose pack wants
   production scoring (Finnish/German/Arabic length, tone, etc.) faces the same
   question: where does the target come from? Mora counting is a Japanese
   derivation; hardcoding it in the engine would violate "keep language-specific
   data out of the engine" (AGENTS.md, docs/00).

## Decision

Make the target a **pack-declared, language-neutral number**. The engine reads
it and never infers phonology.

- Schema (`schemas/v0.2/phonology-contrast.schema.json`): an optional
  `production` block — `{ measure, expected_ratio, tolerance_low?, tolerance_high? }`.
  `measure` is a selector (currently `voiced-duration-ratio`) mapping to an
  interpreter; new measures/languages extend it without engine phonology.
  Additive/optional, so existing packs stay valid (no schema-version bump).
- Engine (`apps/desktop/src-tauri/src/lib.rs`, `pronunciation_check_at`):
  recover the contrast id from `short_unit` (`{id}.short`), read its
  `production`. If present, `reference_ratio = expected_ratio` and reference
  media is **optional** (used only for the pitch contour). If absent, fall back
  to a reference recording gated on a genuine contrast (`reference-contrast-weak`
  when `rl/rs < 1.4`), else abstain `reference-media-missing`. Declared
  tolerances override the interpreter defaults.
- ja-JP pack declares mora-derived targets: obasan pair `1.25` (5/4 morae),
  toi/tooi pair `1.5` (3/2 morae), `tolerance_low 0.85`.

`tolerance_low` is raised from the interpreter default 0.8 to 0.85 so a
**no-contrast** production (ratio ~1.0) against a 1.25 target reads `shorter`
(`rel = 1.0/1.25 = 0.80 < 0.85`), not the false `close` the default band gave.

## Consequences

- The vowel-length drill **works with zero media, zero recording, zero TTS**:
  the pack declares the target. Verified end-to-end by
  `pronunciation_check_uses_pack_declared_target_without_media` (ja-JP, no
  media): the same weak TTS audio the media path rejected is now correctly
  judged `shorter` against the declared target.
- **Language-neutral by construction**: every pack supplies its own target; the
  engine never counts morae. Authoring guidance added to docs/04.
- **Honest about verification**: TTS cannot confirm the mora target (both
  engines fail to lengthen). The mora value rests on Japanese mora-timing
  phonology (long vowels are bimoraic); true empirical confirmation needs native
  recordings — the gated SPEECH-007 calibration data. Targets are labeled
  guided-only/uncalibrated in the pack notes.
- **Known limitation**: whole-word voiced ratio is a weak discriminator for a
  4-vs-5 mora pair (native contrast ~1.1–1.3). Isolating the vowel would give a
  stronger signal but needs segmentation; left as a follow-up. The aligner
  confidence gate + conservative band keep it fail-closed.
- Pitch contour (SPEECH-006) still needs a reference recording; without media it
  reports `no-reference-recording` while length still scores.
- Verification: `cargo test --workspace` green (49 desktop lib incl. the new
  declared-target test; 15 speech-runtime), frontend `vitest` 98, `tsc` clean.

## Alternatives considered

- **Owner-recorded reference audio** — guaranteed correct + licensed, but puts
  the burden on the sole user and still needs per-pair media for every language.
  Kept as the fallback path (committed media still wins), not the requirement.
- **A better TTS as the reference/verifier** — rejected: measured Kokoro (both
  checkpoints) and OpenJTalk all fail to lengthen; no available open TTS is a
  valid anchor or verifier.
- **Open corpus clips** (JVS/CSJ/Common Voice) — rejected: research-only licenses
  or full-sentence corpora; the exact isolated minimal pairs with product
  redistribution rights are not obtainable.
- **Hardcode mora counting in the engine** — rejected: puts language-specific
  phonology in the engine, violating engine neutrality; does not generalize to
  other languages' length/tone contrasts.
