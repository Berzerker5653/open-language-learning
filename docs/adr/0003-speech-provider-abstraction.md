# ADR 0003 — Pluggable Local-First Speech Providers

Status: Accepted

## Context

ASR/TTS/pronunciation technology changes rapidly and different languages/platforms need different models.

## Decision

Define stable provider interfaces and benchmark implementations. Keep local processing as the default. Language packs request capabilities rather than specific binaries.

## Consequences

More initial interface work, but prevents vendor/model lock-in and allows hardware-specific choices.

## Alternatives

Retrospective rationale added during handoff review; the accepted decision is unchanged. One fixed speech provider would reduce initial adapter work but couple language quality, privacy and platform support to that provider. Cloud-only processing would break the offline/local default. Replaceable local providers preserve the existing decision.
