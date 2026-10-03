//! 0.1 -> 0.2 migration helpers.
//!
//! The one contract change with content impact (docs/03 §7): bare
//! prerequisite IDs become versioned records. Defaults are conservative and
//! every migrated record is flagged with `migrated_from` so the validator
//! demands human review of the implied dimension/state.

use serde_json::{Value, json};

/// Convert a 0.1 goal document into a 0.2 goal document. Bare prerequisite
/// strings become `{target, dimension: recall-meaning, required_state:
/// independent, strength: hard, migrated_from: "0.1-bare"}`.
pub fn goal_0_1_to_0_2(goal: &Value) -> Value {
    let mut out = goal.clone();
    if let Some(prereqs) = out.get("prerequisites").and_then(Value::as_array).cloned() {
        let migrated: Vec<Value> = prereqs
            .iter()
            .map(|p| match p {
                Value::String(target) => json!({
                    "target": target,
                    "dimension": "recall-meaning",
                    "required_state": "independent",
                    "strength": "hard",
                    "migrated_from": "0.1-bare",
                }),
                other => other.clone(),
            })
            .collect();
        out["prerequisites"] = Value::Array(migrated);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Mode, Pack, schema::SchemaSet};
    use serde_json::json;

    #[test]
    fn bare_prerequisites_become_reviewable_records() {
        let migrated = goal_0_1_to_0_2(&json!({
            "id": "ja.goal.a1.example",
            "prerequisites": ["ja.lex.greeting.konnichiwa"],
        }));
        let prereqs = migrated["prerequisites"].as_array().unwrap();
        assert_eq!(prereqs.len(), 1);
        assert_eq!(prereqs[0]["target"], json!("ja.lex.greeting.konnichiwa"));
        assert_eq!(prereqs[0]["dimension"], json!("recall-meaning"));
        assert_eq!(prereqs[0]["required_state"], json!("independent"));
        assert_eq!(prereqs[0]["strength"], json!("hard"));
        assert_eq!(prereqs[0]["migrated_from"], json!("0.1-bare"));
    }

    #[test]
    fn migrated_goal_validates_against_0_2_schema() {
        let migrated = goal_0_1_to_0_2(&json!({
            "id": "ja.goal.a1.example",
            "description": "example",
            "band": "A1",
            "modalities": ["reading"],
            "prerequisites": ["ja.lex.greeting.konnichiwa"],
            "required_concepts": [],
            "assessment_ids": ["ja.assess.a1.example"],
            "transfer_required": true,
            "sources": ["jf-standard"],
            "review_status": "draft",
        }));
        let schemas = SchemaSet::load().unwrap();
        let validator = schemas.validator("goal", true).unwrap();
        let errors: Vec<_> = validator.iter_errors(&migrated).collect();
        assert!(errors.is_empty(), "migrated goal must validate: {errors:?}");
    }

    #[test]
    fn bare_prerequisites_are_rejected_by_0_2_schema() {
        let schemas = SchemaSet::load().unwrap();
        let validator = schemas.validator("goal", true).unwrap();
        let bare = json!({
            "id": "ja.goal.a1.example",
            "description": "example",
            "band": "A1",
            "modalities": ["reading"],
            "prerequisites": ["ja.lex.greeting.konnichiwa"],
            "required_concepts": [],
            "assessment_ids": ["ja.assess.a1.example"],
            "transfer_required": true,
            "sources": ["jf-standard"],
            "review_status": "draft",
        });
        assert!(
            validator.iter_errors(&bare).count() > 0,
            "bare ids must fail 0.2"
        );
    }

    #[test]
    fn migrated_records_trigger_review_warning() {
        // The valid fixture's migrated-prereq variant is covered by the
        // integration tests; this unit check pins the warning code directly.
        let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tests/fixtures/packs/valid-migrated-prereq");
        let pack = Pack::load_dir(&dir).unwrap();
        let diags = pack.validate(Mode::Scaffold, None);
        assert!(
            diags.iter().any(
                |d| d.code == "migrated_prerequisite" && d.severity == crate::Severity::Warning
            ),
            "expected migrated_prerequisite warning, got {diags:?}"
        );
        assert!(
            !diags.iter().any(|d| d.severity == crate::Severity::Error),
            "fixture must be schema-valid: {diags:?}"
        );
    }
}
