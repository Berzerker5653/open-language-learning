# ADR 0038: the scenario help guarantee is a pack-declared promise; archives published before it stay installable

**Status:** **Accepted** (2026-10-19) — agent-authored 2026-10-19; the owner
signed the ADR on 2026-10-19 ("accept", recorded at their in-session direction):
it changes what the install gate accepts and restates a published-catalog property.

**Date:** 2026-10-19

## Context

Commit `8dc4000` (U07) attached three `Severity::Error` codes —
`scenario_support_rung_undelivered`, `scenario_action_label_missing`,
`scenario_support_choices_small` (`crates/langpack/src/pack.rs`) — to every
schema-`0.2` pack. That is the same `schema_version` the already-published
0.4.0/0.4.1/0.4.2 reference archives declare, and their scenario content
predates the fields. CI at `88d7b98` proved the consequence instead of
predicting it: `scripts/fetch-pack-audio.sh` downloads the pinned 0.4.2
archive (`catalog/packs.json`) and `lts-langpack-cli install` refused it —
`pack rejected by install validation: 215 error(s)` — killing the `rust` and
`desktop-smoke` jobs before any Rust stage. The engine on `main` could no
longer install the only packs the in-app catalog offers, and the recorded
live-install release evidence could not be re-executed.

The runtime had a matching honesty hole: an old pack declares ladder rungs
but carries no `support` payloads. Pressing a rung called
`Scenario::use_support` (marking the level consumed and stamping
`support_level` into the node's evidence — which mastery-credit gating at
`supported_max_level: 3` then reads) and *then* looked for a payload,
finding none: the button greyed out, no help appeared, and the phantom
press silently voided the node's contribution to the `supported` stage.

## Decision

The guarantee is a promise a pack **declares**:

- New optional manifest key `capabilities.scenario_help` (boolean, default
  `false`) in `schemas/v0.2/language-pack-manifest.schema.json`. A non-bool
  value is a schema error; an absent key is false, mirroring the
  `capabilities.rtl` pattern (ADR-0029).
- The validator fires the three codes (unchanged `Severity::Error`, both
  `Scaffold` and `Install` posture) only for 0.2 scenario docs of packs that
  declare the key — the call-site gate is
  `inst.v2 && Pack::help_guarantee_declared()`.
- The install gate is **not** weakened for any pack, and no archive is
  republished here; `schema_version` stays 0.2.
- A pack that does not declare the promise may still offer ladder rungs,
  but the runtime must not pretend: `support_at` refuses a rung the current
  node has no payload for **before** any session mutation (no `support_used`
  entry, no evidence stamp), the wire `LadderView` carries `delivered`, and
  the UI disables such rungs with a stated reason.
- The declaration is made where the promise is kept: both reference packs,
  both conformance proofs (`examples/eo-community`, `examples/ar-ma`), the
  example template, and `scripts/new-pack.py` scaffolds (generator emits
  per-rung payloads and per-token labels, and declares the key).
- Tests pin both directions: declared → Error at build and install for a
  payload-less scenario; undeclared → the same archive builds, installs and
  validates clean; a manifest guard keeps the shipped declarations from
  rotting.

## Consequences

Published 0.4.0–0.4.2 archives install again, so CI audio restore, the
ignored live-install proofs and in-app catalog installs work; the tree's
conformance stays strict (all five declaring packs pass validate/lint/test
with 0 errors). Old packs keep ladder rungs they cannot serve, and the app
now says so instead of charging `support_used` for nothing. Full U07 UX on
learner devices still requires the owner to republish the reference packs
(0.4.3, gate O-05) with the key declared — recorded as an owner dependency,
not assumed here. A later schema 0.3 may flip the default to `true` and
retire the key, the same bounded-exception shape as ADR-0032.

## Alternatives considered

- **Version-gate on `manifest.version >= 0.4.3`:** the tracked packs are
  0.4.2, so the gate is inert on the tree being developed; bumping the tree
  without publishing makes `fetch-pack-audio.sh` fail on a missing catalog
  entry — the exact move ADR-0032's Alternatives rejected — and install
  never evaluates the manifest engine range anyway
  (`archive.rs` calls `validate(Mode::Install, None)`).
- **Downgrade the codes to Warning in install posture:** the CLI `test`
  conformance command *runs* `Mode::Install` and exits 0 on warnings, so
  CI's own install-mode gate would go silent; `archive.rs`'s install gate
  discards warnings entirely, so nothing reaches the learner; and it
  inverts every existing mode-dependent severity, loosening a boundary
  `SECURITY.md` names as a security property.
- **Scenario schema 0.3:** correct semantics (a new promise belongs to a new
  contract generation) but pack-wide versioning — it would re-version every
  community pack for one content rule and strand current apps against 0.3
  packs. This ADR's key is that option's migration ramp.
