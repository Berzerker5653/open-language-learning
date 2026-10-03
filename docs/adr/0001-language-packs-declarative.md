# ADR 0001 — Language Packs Are Declarative, Untrusted Data

Status: Accepted

## Context

The project wants community- and AI-authored languages. Allowing arbitrary pack code would create security, portability, and maintenance problems.

## Decision

Language packs are declarative data validated against versioned schemas. Packs cannot execute arbitrary code in the application process. New linguistic requirements should extend engine capabilities/schema through reviewed code.

## Consequences

Pros: safer distribution, AI-friendly authoring, cross-platform consistency, predictable validation.
Cons: some unusual language requirements will require engine feature work rather than a quick pack plugin.

## Alternatives

Retrospective rationale added during handoff review; the accepted decision is unchanged. Executable pack plugins could express unusual language behavior quickly but expand the attack surface and complicate portability. Hardcoding each language into the engine would simplify an initial prototype but prevent the intended public pack interface. The chosen declarative boundary preserves the existing decision.
