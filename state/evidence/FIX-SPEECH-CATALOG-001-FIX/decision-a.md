# D1 decision record — adopt bounded-staleness auto-refresh (option a)

Date: 2026-11-27 · Card: FIX-SPEECH-CATALOG-001 (board t_0dafc90b) ·
Review: state/evidence/REVIEW-SPEECH-CATALOG-001/spec-verdict.md (D1)

## The conflict

`lib.rs run()` (since 6626cc73) spawns a background catalog check on every
startup when the cached public catalog is missing or older than 7 days, and
silently adopts the fetched catalog on validation success. ADR-0042's
"Alternatives considered" rejected "Silent background auto-refresh on every
launch: a surprise picker change is worse than an explicit check". The
mechanism is also not in the SPEECH-CATALOG-001 ship list. Review D1:
amend the ADR or make adoption explicit.

## Decision: option (a) — amend the ADR

Bounded-staleness auto-refresh is adopted as the intended behavior, and
ADR-0042 is amended to say so (Decision paragraph + superseding note on the
rejected alternative). Rationale:

1. The ADR's own premise is that the model landscape moves fast; requiring a
   click for the catalog to move contradicts the reason the remote catalog
   exists.
2. The rejected surprise is bounded and mild: refresh only fires when the
   cache is >7 days old, it is metadata-only (no model file is ever
   downloaded without an explicit user install), and it can only ADD a row to
   the model list — no learner selection changes, no default flips.
3. Every adoption path keeps the full fail-closed guarantees: the fetch is
   size-capped, the catalog is validated in full before caching, the cache is
   re-validated on every read, and any failure silently keeps the last-good
   copy. A hostile or broken update cannot brick the picker or re-point
   downloads (reviewer adversarial probes confirmed this pre-amendment).

## Veto path (owner)

If the owner vetoes (a), flip to option (b): keep the automatic fetch but make
adoption explicit — surface a "N new models available" notice in Settings that
the learner acts on (recorded in ADR-0042 Alternatives as the veto path). Not
implemented in this card.
