//! LEARN-005 acceptance: the versioned mastery policy artifact loads,
//! validates, and its worked fixtures derive exactly the documented
//! states. Every derived decision records the policy version.

use lts_learner_model::policy::{Fixture, Policy, derive};
use std::path::PathBuf;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn policy() -> Policy {
    let text = std::fs::read_to_string(repo_root().join("docs/assessment/MASTERY_POLICY.yaml"))
        .expect("policy artifact must exist at docs/assessment/MASTERY_POLICY.yaml");
    Policy::load(&text).expect("policy must validate")
}

fn fixture(name: &str) -> Fixture {
    let path = repo_root()
        .join("tests/fixtures/policy")
        .join(format!("{name}.yaml"));
    let text = std::fs::read_to_string(path).unwrap_or_else(|e| panic!("{name}: {e}"));
    serde_yaml::from_str(&text).unwrap_or_else(|e| panic!("{name}: {e}"))
}

#[test]
fn policy_is_versioned_and_marks_thresholds_provisional() {
    let p = policy();
    assert_eq!(p.policy_version, "0.2.0");
    assert_eq!(p.status, "provisional-hypotheses");
    assert_eq!(p.schema_version, 1);
}

#[test]
fn every_declared_fixture_exists_and_derives_expected_states() {
    let p = policy();
    assert!(!p.fixtures.is_empty());
    for name in &p.fixtures {
        let f = fixture(name);
        assert_eq!(f.name, *name, "fixture name must match file");
        for exp in &f.expectations {
            let d = derive(&p, &f, exp.dimension).expect("derive");
            assert_eq!(
                d.state,
                exp.expected_state,
                "fixture {name} dimension {:?}: got {}",
                exp.dimension,
                serde_json::to_string(&d.state).unwrap()
            );
            // Policy version is recorded with every derived decision.
            assert_eq!(d.policy_version, p.policy_version);
        }
    }
}

#[test]
fn required_scenario_coverage() {
    // The acceptance list must be covered by named fixtures.
    let p = policy();
    for required in [
        "novice-single-success-stays-introduced",
        "known-diagnostic-reaches-independent",
        "supported-successes-reach-supported-not-independent",
        "content-correction-leaves-no-residue",
        "repeated-prompt-memorization-capped",
        "technical-failure-no-outcome",
        "transfer-then-delayed-recheck-reaches-retained",
        "deferred-speaking-track-no-fabricated-credit",
        "confident-mismatches-regress-one-step",
    ] {
        assert!(
            p.fixtures.iter().any(|f| f == required),
            "missing {required}"
        );
    }
}

#[test]
fn single_success_never_reaches_independent_even_repeated_same_prompt() {
    // Guard on the docs/03 §5 rule beyond the fixtures: one prompt,
    // many groups, still not independent.
    let p = policy();
    let f = fixture("repeated-prompt-memorization-capped");
    let d = derive(&p, &f, lts_domain::ActivityModality::RecallMeaning).unwrap();
    assert!(d.state < lts_domain::MasteryState::Independent);
}

#[test]
fn policy_validation_rejects_broken_artifacts() {
    let base =
        std::fs::read_to_string(repo_root().join("docs/assessment/MASTERY_POLICY.yaml")).unwrap();

    // States must be canonical.
    let broken = base.replace("  - flexible", "  - mastered");
    assert!(
        Policy::load(&broken).is_err(),
        "non-canonical state accepted"
    );

    // Thresholds must be marked provisional.
    let broken = base.replace("status: provisional-hypotheses", "status: calibrated-truth");
    assert!(
        Policy::load(&broken).is_err(),
        "unmarked calibration claim accepted"
    );

    // A single response can never establish durable mastery.
    let broken = base.replace(
        "min_successes: 2\n    max_support_level: 1\n    min_distinct_prompts: 2",
        "min_successes: 1\n    max_support_level: 1\n    min_distinct_prompts: 1",
    );
    assert!(
        Policy::load(&broken).is_err(),
        "single-response mastery allowed"
    );

    // A disqualifier name must be real vocabulary: a typo would silently
    // switch the rule off (policy 0.2.0 enforcement).
    let broken = base.replace("supplied-reading]", "supplied-reding]");
    assert_ne!(base, broken, "fixture text must contain the disqualifier");
    assert!(
        Policy::load(&broken).is_err(),
        "unknown support action accepted under disqualifying_for"
    );

    // A disqualifier key must be a canonical dimension name.
    let broken = base.replace("production-writing: [", "production-writeh: [");
    assert!(
        Policy::load(&broken).is_err(),
        "unknown dimension key accepted under disqualifying_for"
    );
}
