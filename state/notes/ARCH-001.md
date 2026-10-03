# ARCH-001 — Core domain IDs, versions, and provider interfaces

## Delivered

- `crates/domain`:
  - `ids`: `ContentId` (schema grammar `^[a-z0-9]+(?:[._-][a-z0-9]+)*$`, typed `ContentKind`
    namespace, language subtag accessor), `PackId` (`^[a-z][a-z0-9.-]+$`), `LocaleTag`
    (schema-level BCP-47 syntax; full registry validation deferred to PACK-001 per
    schemas/README), `ProfileId`, `EventId`. All serde-validated on deserialize.
  - `versioning`: `SchemaVersion` + `SemVer` (full SemVer incl. prerelease+build — the original
    validator bug class is covered by a test), `EngineCompat` (SemVer range matching).
  - `mastery`: `MasteryDimension` (12 axes), `MasteryState` (6 canonical states, ordered),
    `EvidenceAvailability`, `SupportLevel` 0..=5.
  - `evidence`: `EvidenceEvent` (docs/03 §3 fields incl. prompt family, attempt group, held-out,
    provider confidence, content versions), `Outcome` (scored/technical-failure/abstained/skipped/
    deferred/excluded), `Score`, `EvidenceCorrection` (append-only corrections).
  - `curriculum`: `NodeKind`, `EdgeKind`, `PrerequisiteRecord` (target+dimension+state+strength —
    bare IDs cannot imply all-modality mastery), `CurriculumEdge`.
  - `pack`: `PackManifest`, `TrustState` (ordered), `FeatureMode`, `TextDirection`,
    `LicenseSummary` (redistribution flag explicit).
- `crates/speech-api`: all 8 provider traits from docs/05 (object-safe, boxed by future resolver),
  `ProviderOutcome` with the 6 required statuses + reason codes, `ConfidenceBand`, audio/alignment/
  feature/correction types. Zero concrete-provider dependencies.

## Acceptance mapping

1. Typed stable ID/version primitives exist — `ids`/`versioning` modules, 20 domain tests.
2. Provider interfaces compile without concrete provider dependency — `cargo test -p lts-speech-api`
   (3 tests incl. object-safety mock) with no provider crates in the graph.
3. Pack domain model has no ja-JP dependency — domain crate contains no locale-specific behavior;
   `model_is_locale_independent` and `model_handles_any_locale_identically` tests exercise ja/sw/ar
   (incl. RTL direction) through identical code paths.

## Evidence

- `state/evidence/ARCH-001/cargo-test-2026-10-02.txt`: `cargo test --workspace` (19 suites ok,
  0 failed) + `cargo clippy --workspace --all-targets -- -D warnings` clean; `cargo fmt --check` clean.

## Notes for downstream tasks

- PACK-001 must keep the ID grammar and patterns consistent with these primitives (schemas/README
  warns full BCP-47 is SDK work — `LocaleTag` is intentionally syntax-level only).
- LEARN-001 will persist `EvidenceEvent` as-is; storage owns timestamps/clock.
- LEARN-005 policy will version transitions; this crate only fixes vocabulary.

## Next

BOOT-002 (Tauri shell). Known environment blocker: `webkit2gtk-4.1` not installed, sudo needs a
password. Plan: attempt user-local extraction of the Arch packages into a prefix; if that fails
twice, mark BOOT-002 blocked and continue with BOOT-003.
