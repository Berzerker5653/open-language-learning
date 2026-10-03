//! Source/license audit conformance (PACK-003, docs/10).

use lts_langpack::{Pack, Severity};
use std::path::PathBuf;

fn audit(
    name: &str,
) -> (
    Vec<lts_langpack::Diagnostic>,
    Vec<lts_langpack::audit::AttributionEntry>,
) {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/packs")
        .join(name);
    let pack = Pack::load_dir(&root).unwrap_or_else(|e| panic!("cannot load {name}: {e}"));
    pack.audit_licenses()
}

fn error_codes(diags: &[lts_langpack::Diagnostic]) -> Vec<&str> {
    diags
        .iter()
        .filter(|d| d.severity == Severity::Error)
        .map(|d| d.code.as_str())
        .collect()
}

#[test]
fn unknown_license_blocks_reference_build() {
    let (diags, _) = audit("invalid-license-unknown");
    assert!(
        error_codes(&diags).contains(&"missing_license"),
        "{diags:?}"
    );
}

#[test]
fn reference_only_source_cannot_be_bundled() {
    let (diags, _) = audit("invalid-reference-only-bundled");
    let c = error_codes(&diags);
    assert!(c.contains(&"reference_only_bundled"), "{diags:?}");
    assert!(c.contains(&"blocked_redistribution"), "{diags:?}");
}

#[test]
fn attribution_requirement_without_entry_fails() {
    let (diags, _) = audit("invalid-missing-attribution");
    assert!(
        error_codes(&diags).contains(&"missing_attribution"),
        "{diags:?}"
    );
}

#[test]
fn clean_chain_audits_and_reports_attribution() {
    let (diags, report) = audit("valid-audit");
    assert!(
        diags.iter().all(|d| d.severity != Severity::Error),
        "clean chain: {diags:?}"
    );
    assert_eq!(report.len(), 1);
    assert_eq!(report[0].source_id, "src-dict");
    assert!(report[0].attribution.contains("CC-BY-SA-4.0"));
}

#[test]
fn seed_draft_blocks_redistribution_and_reports_sources() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../languages/ja-JP");
    let pack = Pack::load_dir(&root).unwrap();
    let (diags, report) = pack.audit_licenses();
    assert!(
        error_codes(&diags).contains(&"original_redistribution_blocked"),
        "{diags:?}"
    );
    assert!(
        diags.iter().any(|d| d.code == "license_pending"),
        "{diags:?}"
    );
    assert_eq!(
        report.len(),
        4,
        "all four seed sources must appear in the attribution report"
    );
    assert!(
        report
            .iter()
            .any(|e| e.source_id == "commonvoice-ja-27" && e.attribution.contains("Mozilla"))
    );
}

#[test]
fn source_provenance_flags_gaps_and_term_conflicts() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/packs")
        .join("invalid-source-terms");
    let pack = Pack::load_dir(&root).unwrap();
    let diags = pack.audit_sources();
    let codes: Vec<&str> = diags.iter().map(|d| d.code.as_str()).collect();
    assert!(codes.contains(&"source_missing_url"), "{diags:?}");
    assert!(codes.contains(&"source_missing_retrieved"), "{diags:?}");
    assert!(codes.contains(&"source_terms_inconsistent"), "{diags:?}");
    assert!(
        diags
            .iter()
            .any(|d| d.code == "unused_source" && d.severity == Severity::Info),
        "{diags:?}"
    );
    // Provenance gaps are quality warnings, not schema errors.
    assert!(
        diags.iter().all(|d| d.severity != Severity::Error),
        "{diags:?}"
    );
}

#[test]
fn clean_source_chain_has_no_provenance_warnings() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/packs")
        .join("valid-full");
    let pack = Pack::load_dir(&root).unwrap();
    let diags = pack.audit_sources();
    assert!(
        diags
            .iter()
            .all(|d| d.severity != Severity::Error && d.severity != Severity::Warning),
        "clean provenance: {diags:?}"
    );
}
