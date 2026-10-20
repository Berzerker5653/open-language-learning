# ADR 0040: content is AI-authored with machine gates and community confirmation; no external qualified-reviewer gate exists

**Status:** **Accepted** (2026-10-20) — agent-authored 2026-10-20 recording the
owner's in-session directive during the blocker-clearing review ("we will only
be making this content with AI … if we get a user who is fluent in the language
and they can confirm it's correct, then and only then will we mark it off as
checked by whoever … I will not be seeking outside confirmation"). It changes
what "reviewed" means for shipped content and which cards can ever be `done`.

**Date:** 2026-10-20

## Context

Every remaining content card — `JA-A1-003`, `JA-A2-002`, `JA-B1-002`,
`JA-B2-002` (qualified band reviews), `JA-KANJI-MNEMONICS-001` (17 authored
mnemonics naming elements the sourced radical list no longer contains), and
the required `JA-A2-001` (A2 coverage, whose authored increment — units 808–819,
12 scenarios, 136 lexicon, 144 sentences — passed every machine gate) — was
blocked on the same immovable thing: **a qualified human reviewer nobody is
going to hire.** The project is free, unfunded, and single-owner. The prior
policy (AGENTS: an AI cannot self-certify a qualified human review) correctly
prevented *claiming* review that never happened, but with no reviewer ever
coming, it functioned as a permanent freeze on content work, not as a quality
bar. ADR-0034 already moved the B-band review cards off the release chain;
the A-band residue still gates 1.0 through `JA-A2-001`.

docs/18 already forbids claiming human verification, and every pack already
carries an honest review posture. The only thing the reviewer gate was
actually producing was blocked cards.

## Decision

1. **The project seeks no external qualified review — ever — as a spending
   decision.** The band-review cards (`JA-A1-003`, `JA-A2-002`, `JA-B1-002`,
   `JA-B2-002`) and `SPEECH-007` stay `blocked` with that blocker named. They
   are never marked `done`: they describe work that will not happen. Their
   existence is the honest record that the content is *not* expert-verified.
2. **Content acceptance = machine gates + honest posture + owner acceptance.**
   Schema validation, lint, curriculum/content/learner-copy audits, provenance
   records, and the machine-checkable mismatch counts (the validator's own
   `Severity::Error` gates) are the enforceable bar; docs/18's ban on
   human-verification claims stays; the owner accepts cards on that evidence.
   `JA-A2-001` is `done` on that basis: its increment is machine-audited at
   0/0 across every pack gate, and the owner directed it closed.
3. **Community confirmation is the only "checked by" path that exists.** A
   fluent user confirming content inside the app, attributed, is the sole way
   any item ever gains a `confirmed by <person>` mark — never by an agent
   self-certifying. This is product work, not release process:
   roadmap card `CONTENT-CONFIRM-001` (in-app community confirmation of
   content correctness, attributed, exportable, never required for 1.0).
   Until it ships, every pack ships with its honest unverified posture.
4. **Frozen content work is unfrozen under this posture:** the 17 mismatched
   kanji mnemonics (`JA-KANJI-MNEMONICS-001`) may be re-authored by AI against
   the sourced decomposition, with the machine mismatch check (17 → 0) as the
   acceptance gate and no claim beyond the pack's declared posture.

## Consequences

The release path's last content blocker clears: `REL-001`'s required chain no
longer waits on reviewer capacity. Packs continue to state, in metadata and
in-app, that content is AI-authored and not expert-verified — the honesty
guarantee is now carried entirely by claims discipline (docs/18, docs/16) and
machine gates rather than by a gate that would never open. Risk is explicit:
linguistic errors can ship and will be corrected through errata, pack updates,
and (later) community confirmation; anything user-visible that *measures*
learning stays honest by the existing abstain-first rules.

## Alternatives

- **Hire qualified reviewers** — rejected by the owner (free project, no spend
  on outside confirmation).
- **Leave the cards blocking 1.0 forever** — releases nothing while pretending
  a bar exists that will never be enforced.

## Status note

The AGENTS clause "qualified human review … cannot be self-certified by an
AI" still binds *claims*: an agent may never write `reviewed`/`confirmed` on a
human gate. What changed is that no such gate gates the product anymore; the
directive recorded above outranks the process documents per the priority order
in this file's own header.
