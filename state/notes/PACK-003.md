# PACK-003 notes — source/license audit

## What shipped

- `crates/langpack::audit::Pack::audit_licenses()` + CLI
  `langpack audit-licenses <dir> [--json] [--attribution-report]`
  (exit 1 on audit errors = reference build fails).
- 0.2 rules over `sources.jsonl` + `licenses.jsonl`:
  - `missing_license`: inventory or referenced source spdx
    missing/unknown/TBD for distributed/derived content.
  - `license_pending`: pending inventory license (LIC-001 gate).
  - `blocked_redistribution`: source forbids redistribution but an
    inventory entry bundles/derives from it.
  - `reference_only_bundled`: `access.mode: reference-only` source marked
    as `third-party-asset` (reference-only sources cannot be bundled).
  - `missing_attribution`: attribution required (default) with no
    attribution text on the source or the inventory entry.
  - `original_redistribution_blocked`: pack-original entry without
    redistribution permission.
  - `missing_source_record` / `unknown_source`: third-party entries must
    reference a real source record.
- 0.1 rules (seed): `LICENSES.yaml` `pack_original_content`
  (redistribution false → error; pending status → warning) and
  `SOURCES.yaml` `redistribution: unknown` → error, `allowed` without a
  license → error.
- Attribution report: aggregated per-source entries (id, title, license,
  attribution text), preferring inventory attribution; feeds the future
  Sources/Licenses screen (docs/10).

## Fixtures + tests

- `invalid-license-unknown`, `invalid-reference-only-bundled`,
  `invalid-missing-attribution`, `valid-audit` (clean + report).
- Seed ja-JP audit: `original_redistribution_blocked` error +
  `license_pending` warning + 4-entry attribution report — the draft is
  correctly not distributable (LIC-001 owner decision, never self-certified).
- 5 audit tests; 31 langpack tests total green; `./scripts/ci.sh` CI OK;
  release-readiness blockers preserved.

## Decisions

- Audit is a separate command from `validate`: license audit must run in
  CI reference builds independent of scaffold/install posture.
- "unknown" redistribution in 0.2 is represented by unresolvable spdx
  (`unknown`/`TBD`/missing) plus `redistribution_allowed: false`; 0.1's
  tri-state string is audited directly.
- Attribution defaults to required unless `attribution_required: false`.

## Limits / follow-ups

- License *compatibility* policy (e.g. share-alike vs chosen pack license)
  is an LIC-001 owner decision; the audit flags records, it does not make
  legal determinations.
- Content-hash verification of bundled media arrives with PACK-004
  (archive build/install) where hashes are materialized.
