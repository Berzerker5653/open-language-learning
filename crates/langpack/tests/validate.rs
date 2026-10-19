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
    // Media presence is a build/release concern, not a licensing one
    // (ADR-0016): a CI checkout has no generated .wav bytes, and install-mode
    // validation reports that as a single `media_unbuilt` error. This test pins
    // the licensing/promotion gates; the media gate itself lives in
    // tests/media.rs and runs for real in scripts/build-catalog.sh.
    let errors = diags
        .iter()
        .filter(|d| d.severity == Severity::Error && d.code != "media_unbuilt")
        .count();
    assert_eq!(
        errors, 0,
        "licensed seed must pass install validation: {diags:?}"
    );
}

#[test]
fn japanese_declares_exactly_one_script_introduction_unit() {
    // K-67/ADR-0021: `script-introduction` is the app's only cue for
    // "teach this writing system first". Zero declarations is a valid
    // (feature-off) pack; two would give a fresh learner contradictory
    // starting sets, so the pack pins exactly one.
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../languages/ja-JP");
    let pack = Pack::load_dir(&root).unwrap();
    let declared: Vec<&str> = pack
        .instances()
        .iter()
        .filter(|i| i.schema == "unit")
        .filter(|i| {
            i.value
                .get("capabilities")
                .and_then(|c| c.as_array())
                .is_some_and(|caps| caps.iter().any(|c| c == "script-introduction"))
        })
        .map(|i| i.value["id"].as_str().unwrap_or("?"))
        .collect();
    assert_eq!(
        declared,
        ["ja.unit.kana-hiragana-vowels-ko"],
        "ja-JP must declare exactly one script-introduction unit: {declared:?}"
    );
}
/// R08: the Russian on-ramp promises Cyrillic before anything else, so it
/// has to declare the same single cue. Without it a brand-new Russian
/// profile gets no first instruction at all, while the goals behind it stay
/// gated on evidence the learner was never pointed at.
#[test]
fn russian_declares_exactly_one_script_introduction_unit() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../languages/ru-RU");
    let pack = Pack::load_dir(&root).unwrap();
    let declared: Vec<&str> = pack
        .instances()
        .iter()
        .filter(|i| i.schema == "unit")
        .filter(|i| {
            i.value
                .get("capabilities")
                .and_then(|c| c.as_array())
                .is_some_and(|caps| caps.iter().any(|c| c == "script-introduction"))
        })
        .map(|i| i.value["id"].as_str().unwrap_or("?"))
        .collect();
    assert_eq!(
        declared,
        ["ru.unit.on-ramp.cyrillic-a-o-m-t"],
        "ru-RU must declare exactly one script-introduction unit: {declared:?}"
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
    assert!(
        diags
            .iter()
            .any(|d| d.code == "duplicate_id" && d.file.contains("lexicon/entries.jsonl")),
        "v0.2 lexicon duplicates must be caught: {diags:?}"
    );
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

// --- K-67/ADR-0021: unit capability declarations ---
// A unit may declare `capabilities` (currently only `script-introduction`).
// A claim needs content; an unknown name must fail loudly; the absence of
// the key must change nothing. Each case drops one unit onto a temp copy
// of `valid-minimal` so the checks are pinned without freezing a whole
// fixture tree per case.

fn copy_dir(from: &std::path::Path, to: &std::path::Path) {
    std::fs::create_dir_all(to).expect("create dir");
    for entry in std::fs::read_dir(from).expect("read dir").flatten() {
        let dest = to.join(entry.file_name());
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            copy_dir(&entry.path(), &dest);
        } else {
            std::fs::copy(entry.path(), &dest).expect("copy file");
        }
    }
}

fn pack_with_unit(unit_yaml: &str) -> (tempfile::TempDir, Pack) {
    let tmp = tempfile::tempdir().expect("tempdir");
    let seed =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-minimal");
    copy_dir(&seed, tmp.path());
    let units = tmp.path().join("curriculum/units");
    std::fs::create_dir_all(&units).expect("units dir");
    std::fs::write(units.join("000-capability.yaml"), unit_yaml).expect("write unit");
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    (tmp, pack)
}

const CAP_UNIT_HEAD: &str = "\
id: es.unit.cap.intro
goal_id: es.goal.intro.greet
title: The letters to learn first
activities:
- id: es.activity.cap.encounter
  type: encounter-read
  modality: reading
  support_level: 5
";
const CAP_WITH_ITEMS: &str = "  content_refs: [es.lex.greet.hola]\n";
const CAP_DECLARE: &str = "capabilities:\n- script-introduction\n";

#[test]
fn capability_declaration_with_items_validates_clean() {
    let (_tmp, pack) = pack_with_unit(&format!("{CAP_UNIT_HEAD}{CAP_WITH_ITEMS}{CAP_DECLARE}"));
    for mode in [Mode::Scaffold, Mode::Install] {
        let diags = pack.validate(mode, None);
        assert_eq!(
            error_count(&diags),
            0,
            "capability + items must be clean ({mode:?}): {diags:?}"
        );
    }
}

#[test]
fn capability_without_items_is_exactly_one_error() {
    for mode in [Mode::Scaffold, Mode::Install] {
        let (_tmp, pack) = pack_with_unit(&format!("{CAP_UNIT_HEAD}{CAP_DECLARE}"));
        let diags = pack.validate(mode, None);
        let hits: Vec<&lts_langpack::Diagnostic> = diags
            .iter()
            .filter(|d| d.code == "unit_capability_items_missing")
            .collect();
        assert_eq!(
            hits.len(),
            1,
            "one capability, no items -> exactly one error ({mode:?}): {diags:?}"
        );
        assert_eq!(hits[0].severity, Severity::Error);
        assert!(
            hits[0].message.contains("es.unit.cap.intro")
                && hits[0].message.contains("script-introduction"),
            "diagnostic must name the unit and the capability: {}",
            hits[0].message
        );
        assert_eq!(error_count(&diags), 1, "no collateral errors: {diags:?}");
    }
}

#[test]
fn unknown_capability_string_fails_validation() {
    // A typo must not silently disable the feature. This reuses the
    // existing enum-violation path: the closed enum in the 0.2 unit
    // schema turns the unknown name into a `schema` Error on the
    // capability index (same path as out_of_range_support_level_fails).
    let yaml = format!("{CAP_UNIT_HEAD}{CAP_WITH_ITEMS}capabilities:\n- script-introdusion\n");
    let (_tmp, pack) = pack_with_unit(&yaml);
    let diags = pack.validate(Mode::Scaffold, None);
    let hits: Vec<&lts_langpack::Diagnostic> = diags
        .iter()
        .filter(|d| d.code == "schema" && d.path.ends_with("/capabilities/0"))
        .collect();
    assert_eq!(hits.len(), 1, "typo must be a schema error: {diags:?}");
    assert_eq!(hits[0].severity, Severity::Error);
    assert_eq!(error_count(&diags), 1, "{diags:?}");
}

#[test]
fn unit_without_capabilities_key_validates_as_before() {
    for mode in [Mode::Scaffold, Mode::Install] {
        let (_tmp, pack) = pack_with_unit(&format!("{CAP_UNIT_HEAD}{CAP_WITH_ITEMS}"));
        let diags = pack.validate(mode, None);
        assert_eq!(
            error_count(&diags),
            0,
            "no capabilities key must stay clean ({mode:?}): {diags:?}"
        );
        assert!(
            !diags
                .iter()
                .any(|d| d.code == "unit_capability_items_missing"),
            "the rule must not fire without the key: {diags:?}"
        );
    }
}

// --- U07 (review finding): scenario help must be delivered, tokens
// must never be learner-facing labels ---
// A ladder rung the learner can press is a promise: every rung > 0 in
// a 0.2 scenario needs a support payload on every node, every
// expected_actions token needs a learner-facing action_labels entry,
// and choices help needs at least two replies. Each case drops one
// scenario onto a temp copy of `valid-minimal` so the codes are pinned
// without freezing a whole fixture tree per case.

fn pack_with_scenario(scenario_yaml: &str) -> (tempfile::TempDir, Pack) {
    let tmp = tempfile::tempdir().expect("tempdir");
    let seed =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/packs/valid-minimal");
    copy_dir(&seed, tmp.path());
    let dir = tmp.path().join("activities/scenarios");
    std::fs::create_dir_all(&dir).expect("scenarios dir");
    std::fs::write(dir.join("000-help.yaml"), scenario_yaml).expect("write scenario");
    let pack = Pack::load_dir(tmp.path()).expect("load pack");
    (tmp, pack)
}

const U07_RUNGED_LADDER: &str = "\
support_ladder:
- support_level: 0
  description: No supports
- support_level: 2
  description: Key phrase card
transfer_variants_required: 0
";
const U07_INDEPENDENT_LADDER: &str = "\
support_ladder:
- support_level: 0
  description: No supports
transfer_variants_required: 0
";

fn u07_scenario(node_extra: &str, ladder: &str) -> String {
    format!(
        "\
id: es.scenario.u07.help
goal_id: es.goal.intro.greet
title: Ask the time
nodes:
- id: es.scenario.u07.help.open
  prompt: Ask a passer-by what time it is.
  expected_actions: [ask-time]
{node_extra}  next: []
{ladder}"
    )
}

// (Explicit \n escapes: a `"\`-continuation would strip the first
// line's two-space node indent, producing invalid YAML.)
const U07_HELP_DELIVERED: &str = "  support:\n    - level: 2\n      kind: gloss\n      text: Say the words that ask for the time.\n";
const U07_LABELLED: &str = "  action_labels:\n    ask-time: Ask what time it is\n";

#[test]
fn scenario_rung_without_payload_is_undelivered_help() {
    for mode in [Mode::Scaffold, Mode::Install] {
        let (_tmp, pack) = pack_with_scenario(&u07_scenario("", U07_RUNGED_LADDER));
        let diags = pack.validate(mode, None);
        let hits: Vec<&lts_langpack::Diagnostic> = diags
            .iter()
            .filter(|d| d.code == "scenario_support_rung_undelivered")
            .collect();
        assert_eq!(
            hits.len(),
            1,
            "one undelivered rung -> exactly one error ({mode:?}): {diags:?}"
        );
        assert_eq!(hits[0].severity, Severity::Error);
        assert!(
            hits[0].message.contains("level 2")
                && hits[0].message.contains("es.scenario.u07.help.open"),
            "diagnostic must name the rung and the node: {}",
            hits[0].message
        );
    }
}

#[test]
fn scenario_intent_token_without_label_is_unlabelled_action() {
    // Help is delivered, so the only defect left is the bare token.
    for mode in [Mode::Scaffold, Mode::Install] {
        let (_tmp, pack) = pack_with_scenario(&u07_scenario(U07_HELP_DELIVERED, U07_RUNGED_LADDER));
        let diags = pack.validate(mode, None);
        let hits: Vec<&lts_langpack::Diagnostic> = diags
            .iter()
            .filter(|d| d.code == "scenario_action_label_missing")
            .collect();
        assert_eq!(
            hits.len(),
            1,
            "one unlabelled token -> exactly one error ({mode:?}): {diags:?}"
        );
        assert_eq!(hits[0].severity, Severity::Error);
        assert!(
            hits[0].message.contains("ask-time"),
            "diagnostic must name the token: {}",
            hits[0].message
        );
        assert_eq!(error_count(&diags), 1, "no collateral errors: {diags:?}");
    }
}

#[test]
fn scenario_choices_help_below_two_options_is_error() {
    let yaml = u07_scenario(
        "  support:\n    - level: 2\n      kind: choices\n      text: Pick a reply.\n      options: [What time is it?]\n",
        U07_RUNGED_LADDER,
    );
    let (_tmp, pack) = pack_with_scenario(&yaml);
    let diags = pack.validate(Mode::Scaffold, None);
    let hits: Vec<&lts_langpack::Diagnostic> = diags
        .iter()
        .filter(|d| d.code == "scenario_support_choices_small")
        .collect();
    assert_eq!(
        hits.len(),
        1,
        "one option in a choices payload -> exactly one error: {diags:?}"
    );
    assert_eq!(hits[0].severity, Severity::Error);
    assert!(
        hits[0].path.ends_with("/nodes/0/support/0/options"),
        "{}",
        hits[0].path
    );
}

#[test]
fn scenario_with_labels_and_delivered_help_validates_clean() {
    let (_tmp, pack) = pack_with_scenario(&u07_scenario(
        &format!("{U07_LABELLED}{U07_HELP_DELIVERED}"),
        U07_RUNGED_LADDER,
    ));
    for mode in [Mode::Scaffold, Mode::Install] {
        let diags = pack.validate(mode, None);
        assert_eq!(
            error_count(&diags),
            0,
            "labelled + delivered help must be clean ({mode:?}): {diags:?}"
        );
    }
}

#[test]
fn scenario_without_rungs_or_labels_stays_valid_as_before() {
    // 0.1-era shape inside a 0.2 pack: no rung > 0, no action_labels
    // key -> neither U07 rule fires.
    let (_tmp, pack) = pack_with_scenario(&u07_scenario("", U07_INDEPENDENT_LADDER));
    for mode in [Mode::Scaffold, Mode::Install] {
        let diags = pack.validate(mode, None);
        assert_eq!(
            error_count(&diags),
            0,
            "ladder of rungs 0 must stay clean ({mode:?}): {diags:?}"
        );
        assert!(
            !diags.iter().any(|d| d.code.starts_with("scenario_support_")
                || d.code == "scenario_action_label_missing"),
            "the U07 rules must not fire without rungs or labels: {diags:?}"
        );
    }
}
