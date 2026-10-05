//! Conformance fixtures for the 0.2 pack validator (PACK-001/002).

use lts_langpack::{Mode, Pack, Severity};
use std::path::PathBuf;

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/packs")
        .join(name)
}

fn validate(name: &str, mode: Mode) -> Vec<lts_langpack::Diagnostic> {
    let pack = Pack::load_dir(&fixture(name)).unwrap_or_else(|e| panic!("cannot load {name}: {e}"));
    pack.validate(mode, None)
}

fn codes(diags: &[lts_langpack::Diagnostic]) -> Vec<&str> {
    diags.iter().map(|d| d.code.as_str()).collect()
}

fn error_count(diags: &[lts_langpack::Diagnostic]) -> usize {
    diags
        .iter()
        .filter(|d| d.severity == Severity::Error)
        .count()
}

#[test]
fn valid_minimal_is_clean_in_both_modes() {
    for mode in [Mode::Scaffold, Mode::Install] {
        let diags = validate("valid-minimal", mode);
        assert_eq!(
            diags
                .iter()
                .filter(|d| d.severity != Severity::Info)
                .count(),
            0,
            "valid-minimal ({mode:?}): {diags:?}"
        );
    }
}

#[test]
fn japanese_draft_seed_validates_as_scaffold() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../languages/ja-JP");
    let pack = Pack::load_dir(&root).unwrap();
    assert_eq!(pack.schema_version(), "0.2");
    let diags = pack.validate(Mode::Scaffold, None);
    assert_eq!(
        error_count(&diags),
        0,
        "seed draft must validate in scaffold mode: {diags:?}"
    );
    assert_eq!(
        diags
            .iter()
            .filter(|d| d.severity == Severity::Warning)
            .count(),
        0,
        "seed draft must be warning-clean: {diags:?}"
    );
    // The on-ramp transfer assessment is now authored (K-06); the pack
    // no longer declares unresolved references.
    assert!(
        !codes(&diags).contains(&"declared_unresolved_reference"),
        "migrated seed must not declare unresolved references: {diags:?}"
    );
}

#[test]
fn japanese_seed_is_install_eligible() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../languages/ja-JP");
    let pack = Pack::load_dir(&root).unwrap();
    let diags = pack.validate(Mode::Install, None);
    // K-32: owner decision 2026-10-04 (LIC-001, pack content) licensed the
    // on-ramp pack CC BY 4.0; install-mode validation must now be clean.
    assert_eq!(
        diags
            .iter()
            .filter(|d| d.severity == Severity::Error)
            .count(),
        0,
        "licensed seed must pass install validation: {diags:?}"
    );
}

#[test]
fn valid_full_covers_every_content_type() {
    for mode in [Mode::Scaffold, Mode::Install] {
        let diags = validate("valid-full", mode);
        assert_eq!(
            diags
                .iter()
                .filter(|d| d.severity != Severity::Info)
                .count(),
            0,
            "valid-full ({mode:?}): {diags:?}"
        );
    }
}

#[test]
fn engine_version_compatibility_is_checked() {
    let pack = Pack::load_dir(&fixture("valid-full")).unwrap();
    let diags = pack.validate(Mode::Scaffold, Some("1.5.0"));
    assert!(
        !diags.iter().any(|d| d.code == "engine_incompatible"),
        "1.5.0 is inside [0.1.0, 2.0.0): {diags:?}"
    );
    let diags = pack.validate(Mode::Scaffold, Some("2.0.0"));
    assert!(
        diags.iter().any(|d| d.code == "engine_incompatible"),
        "2.0.0 is excluded: {diags:?}"
    );
}

#[test]
fn scaffold_draft_is_accepted_as_scaffold_only() {
    let diags = validate("valid-scaffold-draft", Mode::Scaffold);
    assert_eq!(
        error_count(&diags),
        0,
        "draft must validate in scaffold mode: {diags:?}"
    );
    assert!(
        codes(&diags).contains(&"declared_unresolved_reference"),
        "draft must be flagged: {diags:?}"
    );
}

#[test]
fn draft_unresolved_reference_and_license_gates_block_install() {
    let diags = validate("valid-scaffold-draft", Mode::Install);
    let c = codes(&diags);
    assert!(
        c.contains(&"declared_unresolved_reference"),
        "declared unresolved refs reject promotion: {diags:?}"
    );
    assert!(
        c.contains(&"redistribution_blocked"),
        "license gate must fire: {diags:?}"
    );
    assert!(error_count(&diags) >= 2);
}

#[test]
fn migrated_prerequisites_warn_for_human_review() {
    let diags = validate("valid-migrated-prereq", Mode::Scaffold);
    assert_eq!(
        error_count(&diags),
        0,
        "migrated records are schema-valid: {diags:?}"
    );
    let d = diags
        .iter()
        .find(|d| d.code == "migrated_prerequisite")
        .expect("warning expected");
    assert_eq!(d.severity, Severity::Warning);
}

#[test]
fn deferred_modality_prerequisites_are_representable() {
    let diags = validate("valid-deferred-modality", Mode::Install);
    assert_eq!(
        error_count(&diags),
        0,
        "speaking-scoped prereqs in a speaking-deferred pack must not error: {diags:?}"
    );
}

#[test]
fn bad_id_grammar_fails() {
    let diags = validate("invalid-id-grammar", Mode::Scaffold);
    assert!(codes(&diags).contains(&"id_grammar"), "{diags:?}");
    assert!(
        codes(&diags).contains(&"schema"),
        "schema must also reject: {diags:?}"
    );
    assert!(error_count(&diags) >= 2);
}

#[test]
fn duplicate_ids_fail() {
    let diags = validate("invalid-duplicate-ids", Mode::Scaffold);
    assert!(codes(&diags).contains(&"duplicate_id"), "{diags:?}");
    assert!(error_count(&diags) >= 1);
}

#[test]
fn locale_mismatch_fails() {
    let diags = validate("invalid-locale-mismatch", Mode::Scaffold);
    assert!(codes(&diags).contains(&"locale_mismatch"), "{diags:?}");
}

#[test]
fn inverted_engine_range_fails() {
    let diags = validate("invalid-engine-range", Mode::Scaffold);
    assert!(codes(&diags).contains(&"engine_range"), "{diags:?}");
}

#[test]
fn cloze_target_not_in_text_fails() {
    let diags = validate("invalid-cloze-target", Mode::Scaffold);
    assert!(
        codes(&diags).contains(&"cloze_target_not_in_text"),
        "{diags:?}"
    );
    assert_eq!(
        error_count(&diags),
        1,
        "only the cloze rule should fail: {diags:?}"
    );
}

#[test]
fn sentence_content_validates_in_0_2() {
    let diags = validate("valid-full", Mode::Scaffold);
    assert_eq!(error_count(&diags), 0, "{diags:?}");
}

#[test]
fn bare_prerequisite_ids_fail_in_0_2() {
    let diags = validate("invalid-bare-prereq", Mode::Scaffold);
    assert!(
        codes(&diags).contains(&"schema"),
        "bare prereq must fail schema: {diags:?}"
    );
    let msg = diags
        .iter()
        .find(|d| d.code == "schema")
        .unwrap()
        .message
        .clone();
    assert!(
        msg.contains("object"),
        "diagnostic should explain the record shape: {msg}"
    );
}

#[test]
fn out_of_range_support_level_fails() {
    let diags = validate("invalid-support-level", Mode::Scaffold);
    assert!(codes(&diags).contains(&"schema"), "{diags:?}");
    let msgs: Vec<&str> = diags
        .iter()
        .filter(|d| d.code == "schema")
        .map(|d| d.message.as_str())
        .collect();
    assert!(
        msgs.iter().any(|m| m.contains("maximum")),
        "diagnostic should name the bound: {msgs:?}"
    );
}

#[test]
fn undeclared_reference_warns_in_scaffold_and_errors_in_install() {
    let diags = validate("invalid-undeclared-ref", Mode::Scaffold);
    let d = diags
        .iter()
        .find(|d| d.code == "unresolved_reference")
        .expect("warning expected");
    assert_eq!(d.severity, Severity::Warning);
    assert_eq!(error_count(&diags), 0);

    let diags = validate("invalid-undeclared-ref", Mode::Install);
    let d = diags
        .iter()
        .find(|d| d.code == "unresolved_reference")
        .expect("error expected");
    assert_eq!(d.severity, Severity::Error);
}

#[test]
fn prerequisite_cycles_fail_with_cycle_path() {
    let diags = validate("invalid-prereq-cycle", Mode::Scaffold);
    let d = diags
        .iter()
        .find(|d| d.code == "prerequisite_cycle")
        .expect("cycle error expected");
    assert_eq!(d.severity, Severity::Error);
    assert!(
        d.message
            .contains("es.goal.intro.greet -> es.goal.intro.speak-greeting -> es.goal.intro.greet"),
        "message must carry the cycle path: {}",
        d.message
    );
}

#[test]
fn dead_goal_audit_reports_unreachable_goals() {
    let diags = validate("invalid-dead-goal", Mode::Scaffold);
    let d = diags
        .iter()
        .find(|d| d.code == "unreachable_goal")
        .expect("audit warning expected");
    assert!(
        d.message.contains("es.goal.island.unreferenced"),
        "{:?}",
        d.message
    );
    assert!(
        !diags
            .iter()
            .any(|d| d.code == "unreachable_goal" && d.message.contains("es.goal.intro.greet")),
        "delivered goal must not be flagged"
    );
    assert_eq!(
        error_count(&diags),
        0,
        "audit is a warning, not an error: {diags:?}"
    );
}

#[test]
fn dependency_mirror_must_agree_with_content_prerequisites() {
    let diags = validate("invalid-dependency-mismatch", Mode::Scaffold);
    let m: Vec<&str> = diags
        .iter()
        .filter(|d| d.code == "dependency_graph_mismatch")
        .map(|d| d.message.as_str())
        .collect();
    assert!(
        m.iter()
            .any(|s| s.contains("no matching content prerequisite")),
        "{m:?}"
    );
    assert!(
        m.iter()
            .any(|s| s.contains("missing from dependencies.yaml mirror")),
        "{m:?}"
    );
}

#[test]
fn matching_dependency_mirror_is_clean() {
    let diags = validate("valid-full", Mode::Install);
    assert!(
        !diags.iter().any(|d| d.code == "dependency_graph_mismatch"),
        "{diags:?}"
    );
    assert!(
        !diags.iter().any(|d| d.code == "unreachable_goal"),
        "{diags:?}"
    );
}

#[test]
fn manifest_scripts_must_match_orthography_ids() {
    let diags = validate("invalid-script-unknown", Mode::Scaffold);
    assert!(codes(&diags).contains(&"script_unknown"), "{diags:?}");
}

#[test]
fn diagnostics_carry_actionable_locations() {
    let diags = validate("invalid-support-level", Mode::Scaffold);
    let d = diags.iter().find(|d| d.code == "schema").unwrap();
    assert_eq!(d.file, "curriculum/units/000-intro.yaml");
    assert!(
        d.path.contains("support_level"),
        "path should point at the offending field: {}",
        d.path
    );
}

#[test]
fn media_assets_load_as_binary_and_pack_stays_clean() {
    let pack = Pack::load_dir(&fixture("ja-demo")).expect("load ja-demo");
    let media = pack.media_files();
    assert!(
        media.contains(&"media/ja.lex.demo.obasan.wav".to_string()),
        "media: {media:?}"
    );
    assert!(
        media.contains(&"media/ja.lex.demo.obaasan.wav".to_string()),
        "media: {media:?}"
    );
    // Phonology + speech profile (assess-guided, calibration null) must
    // validate cleanly in install mode; media never parsed as text.
    let diags = pack.validate(Mode::Install, None);
    assert_eq!(error_count(&diags), 0, "ja-demo install: {diags:?}");
}

#[test]
fn generation_contract_envelopes_unit_content() {
    let diags = validate("invalid-generation-ref", Mode::Scaffold);
    assert!(
        codes(&diags).contains(&"content_outside_generation_contract"),
        "content outside the declared contract must fail: {diags:?}"
    );
}

#[test]
fn goals_sharding_accepted() {
    // K-23: goals may be split across curriculum/goals/*.yaml.
    let diags = validate("valid-goals-sharded", Mode::Scaffold);
    assert_eq!(
        error_count(&diags),
        0,
        "sharded goals must validate: {diags:?}"
    );
}

#[test]
fn review_governance_paths_accepted() {
    // REVIEW-001: review/REVIEW_POLICY.yaml is governance metadata, not an
    // unknown file.
    let diags = validate("valid-review-dir", Mode::Scaffold);
    assert_eq!(
        error_count(&diags),
        0,
        "review policy must validate: {diags:?}"
    );
    assert!(
        !codes(&diags).contains(&"unknown_file"),
        "review/REVIEW_POLICY.yaml must not be flagged: {diags:?}"
    );
}

#[test]
fn stray_file_under_review_dir_flagged() {
    let diags = validate("invalid-review-stray", Mode::Scaffold);
    let flagged = diags
        .iter()
        .any(|d| d.code == "unknown_file" && d.file == "review/stray.yaml");
    assert!(flagged, "only known governance paths are exempt: {diags:?}");
}

#[test]
fn status_flip_with_review_record_is_clean() {
    // GitHub review flow: a PR that flips status must add the record.
    let diags = validate("valid-reviewed-item", Mode::Install);
    assert_eq!(
        error_count(&diags),
        0,
        "reviewed item with record must install: {diags:?}"
    );
    assert!(
        !codes(&diags).contains(&"review_promotion_unsupported"),
        "{diags:?}"
    );
}

#[test]
fn ai_only_approval_cannot_promote_to_verified() {
    let diags = validate("invalid-fake-promotion", Mode::Scaffold);
    assert!(
        codes(&diags).contains(&"review_promotion_unsupported"),
        "ai-assisted approval must not support `verified`: {diags:?}"
    );
    let install = validate("invalid-fake-promotion", Mode::Install);
    assert!(
        install
            .iter()
            .any(|d| d.code == "review_promotion_unsupported" && d.severity == Severity::Error),
        "install must hard-fail a fabricated promotion: {install:?}"
    );
}

#[test]
fn lexicon_script_contamination_and_stress_defects_are_caught() {
    let pack = Pack::load_dir(&fixture("invalid-lexicon-script")).unwrap();
    let diags = pack.audit_lexicon();
    let c = codes(&diags);
    assert!(
        c.contains(&"lexicon_script_contamination"),
        "precomposed accents, Hangul, and Latin-in-kana must be flagged: {diags:?}"
    );
    assert!(
        diags
            .iter()
            .any(|d| d.code == "lexicon_stress_multiple" && d.severity == Severity::Error),
        "double stress mark must be an error: {diags:?}"
    );
    assert!(
        c.contains(&"lexicon_form_no_target_script"),
        "romaji-only primary form must be flagged: {diags:?}"
    );
    // The clean demo pack must stay clean under the same audit.
    let clean = Pack::load_dir(&fixture("eo-demo")).unwrap();
    assert!(
        clean.audit_lexicon().is_empty(),
        "eo-demo must pass audit-lexicon: {:?}",
        clean.audit_lexicon()
    );
}
