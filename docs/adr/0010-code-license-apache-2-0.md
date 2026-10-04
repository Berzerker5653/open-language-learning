# ADR 0010: Application code license — Apache-2.0

Status: Accepted
Date: 2026-10-04

## Context

`docs/10_LICENSING_AND_PROVENANCE.md` directed evaluating MIT vs
Apache-2.0 and recording an ADR; the handoff intentionally shipped no
final application `LICENSE` (a provisional MIT text existed). LIC-001
(O-01) required an owner decision. On 2026-10-04 the owner delegated the
choice: "lock in the license that works for this project — I trust you
as the expert on it." Related settled decisions: pack content is
CC BY 4.0 (owner, 2026-10-04); the espeak-ng GPL posture is scoped to
the optional TTS payload (ADR-0009).

## Decision

The application source code (all crates, apps, packages, scripts) is
licensed under the **Apache License, Version 2.0**. `LICENSE` carries
the full text; `NOTICE` carries the attribution notice required by
§4(d). Content is licensed separately and never inherits the code
license: bundled pack content is CC BY 4.0, community packs carry their
own licenses, and the optional TTS payload carries its component
notices (ADR-0009).

## Consequences

- Contributors grant an explicit patent license — meaningful for a
  project expecting community contributions in speech/NLP, where MIT
  (the provisional choice) grants none.
- Aligns the code with the core speech stack (sherpa-onnx, Kokoro:
  Apache-2.0); redistribution conditions are uniform across that
  boundary.
- The `NOTICE` file becomes a maintained artifact: new third-party
  attribution obligations land there (and in `third-party/notices/`
  for payload components).
- Compatibility holds across the current dependency tree (MIT/BSD/
  Apache dependencies; GPL components are separate, unlinked payload
  artifacts per ADR-0009). No dependency forces a different choice.
- LIC-001's code-license acceptance is met; publishing remains gated
  by O-05 regardless of the license.

## Alternatives considered

- **MIT (provisional text)**: simplest and compatible, but no patent
  grant and no NOTICE mechanism; weaker for a contribution-based
  project in a patent-active technical area.
- **AGPL-3.0 / copyleft**: would obligate the owner's own private
  iteration and downstream hosting; the project's goal is open
  community packs (content, separately licensed), not enforced source
  reciprocity.
- **Proprietary/all-rights-reserved**: contradicts the master spec's
  community-pack direction and the owner's CC BY 4.0 content decision.

## Status

Accepted by owner delegation 2026-10-04; recorded by the implementing
agent under that delegation.
