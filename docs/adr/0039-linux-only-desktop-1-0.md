# ADR 0039: desktop 1.0 supports Linux only; Windows/macOS parity moves off the release path

**Status:** **Accepted** (2026-10-20) — agent-authored 2026-10-20 at the owner's
in-session direction ("Linux-only for 1.0") during the blocker-clearing review;
it changes what 1.0 promises to users and what gates the release.

**Date:** 2026-10-20

## Context

`PLAT-001` (Windows/macOS desktop parity) is `required_for_desktop_1_0`, and
`PERF-002` depends on it. Its blocker has never moved: CI proves
**compile-only** on `windows-latest`/`macos-latest` (`platform-compile` says so
in the workflow itself), `platform-bundles` is manual and produces unsigned
artifacts, and ADR-0015 already forbids treating a build as parity evidence —
parity needs human runtime reports from real machines. The project has one
Linux desktop, no Windows or macOS hardware, and paid runner time is a spend
decision the owner has not made and, for a free project with no users on those
platforms, sees no reason to make. docs/18 is already honest about this:
Windows/macOS builds carry no speech runtime and abstain with reasons.

Every downstream release card (`PERF-002` → `REL-001`) is therefore blocked on
a platform claim nobody intends to make at 1.0.

## Decision

Desktop 1.0 **supports Linux x86-64 only**, stated as such in docs/18 and
docs/13. `PLAT-001` becomes `required_for_desktop_1_0: false` (annotated
here), keeps milestone M10 and its blocked state, and returns as a
post-1.0 milestone when real machines or user demand exist. The
compile-only CI matrix stays exactly as it is: it is an early-warning
signal that the cross-platform code compiles, and ADR-0015's ban on
read-builds-as-parity still applies.

`PERF-002` loses its `PLAT-001` dependency edge and its "supported
configurations" scope becomes **declared Linux tiers only**: the two real
machines the project runs on (the Gaming PC tier and the Omarchy tier,
evidence already on file from `PERF-001`) plus one declared minimum tier to
be measured. Unsupported configurations remain explicit in first-run model
selection and release notes, as that card's acceptance already requires.

## Consequences

The release path loses its only hardware-spend blocker: `REL-001`'s
remaining dependencies are decisions and passes that already have scripts,
runbooks, or staged sessions (`SEC-001` sign-off, the owner artifact pass,
and the content cards under ADR-0043). `PERF-002` becomes executable on
existing machines with no purchases. The honest claim shrinks — Linux first,
named tiers, everything else abstaining — which is what docs/18 and
docs/07's abstain-first rule already describe. `PLAT-002` (mobile) already
depends on `PLAT-001` and stays optional, so nothing else moves.

## Alternatives

- **Authorize paid runners + owner-supplied machines**: keeps parity required
  but spends money the free project has no budget for, and the human-runtime
  half still has no machines.
- **Keep parity required and defer 1.0 indefinitely**: blocks every release
  card behind a platform nobody has asked for.

## Status note

`state/evidence/PLAT-001/` keeps the compile-only CI facts and
`docs/platform/PLATFORM_REPORTS.yaml` stays empty of runtime rows — under
this ADR the absence is the declared posture, not a missing gate.
