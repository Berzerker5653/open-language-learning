# ADR 0009: TTS distribution variants (bundled, bare, bring-your-own)

Status: Accepted
Date: 2026-10-04

## Context

TTS-001 selected sherpa-onnx + Kokoro (both Apache-2.0) for local Japanese
synthesis, but the Kokoro export embeds `espeak-ng-data` (GPLv3) for
grapheme-to-phoneme conversion (docs/provenance/tts-candidates.md). Shipping
that payload inside every build would attach GPL-3.0 distribution
obligations (component notices, source offer) to the whole product. Some
users do not want GPL components at all, and some want to supply their own
TTS runtime. LIC-001 required an owner decision on this coupling.

## Decision

Owner decision 2026-10-04: distribute **multiple download variants** rather
than one build:

1. **TTS variant** — ships with the offline TTS payload (sherpa-onnx
   runtime + Kokoro model/voices + espeak-ng-data). The GPL-3.0 obligations
   are carried **for this variant's payload only**: component notices in the
   attribution UI, a source offer for espeak-ng, and license texts shipped
   alongside the payload.
2. **Bare variant** — no TTS payload. Audio-dependent features degrade
   honestly (existing `tts-runtime-unavailable` / "no licensed audio"
   paths); non-audio practice is unaffected.
3. **Bring-your-own** — the bare variant accepts a user-supplied local TTS
   runtime via documented configuration (the existing vendor-path
   resolution is the seed of this path); no GPL payload is ever forced.

The TTS payload must also be installable into the bare variant later as an
optional in-app download (model-manager catalog), so the variants differ
at install time, not capability time.

## Consequences

- Packaging gains a variant axis (REL-001 release assets); CI compile
  coverage is unchanged (same binary, different staged resources).
- The model catalog needs directory-capable entries (multi-file pin,
  atomic activation) before Kokoro can ship as an in-app download —
  tracked as TTS-002.
- The attribution UI must list espeak-ng (GPLv3), sherpa-onnx (Apache-2.0),
  ONNX Runtime (MIT), and Kokoro (Apache-2.0) whenever the TTS payload is
  present.
- The final application LICENSE (still open under LIC-001) stays decoupled:
  the app's own license is unaffected by the optional GPL payload, exactly
  as it is unaffected by EDRDG CC-BY-SA pack data.

## Alternatives considered

- **Single build with TTS always bundled**: simplest, but forces GPLv3
  obligations and payload size on every user, including those who want
  neither.
- **Drop espeak-ng-data / find a non-GPL G2P**: Kokoro's sherpa export
  depends on it; a replacement G2P is a research task with quality risk,
  not a licensing shortcut.
- **TTS only as in-app download, never bundled**: keeps every base download
  clean, but makes the common case (a learner who wants audio) require a
  multi-hundred-MB manual setup; the owner explicitly wants a
  "comes with it" option.
