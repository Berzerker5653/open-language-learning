//! JA-RES-001: the Japanese source/license matrix is an executable
//! contract — it must parse, cover the required categories, classify
//! every candidate with the canonical vocabulary, and give every
//! non-shippable entry an alternative or an explicit blocker.

use serde_yaml::Value;

fn matrix() -> Value {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../docs/provenance/JA_SOURCE_MATRIX.yaml"
    );
    let text = std::fs::read_to_string(path).expect("source matrix must exist");
    serde_yaml::from_str(&text).expect("source matrix must parse")
}

fn field(e: &Value, key: &str) -> String {
    e.get(key)
        .and_then(|v| v.as_str())
        .unwrap_or_else(|| panic!("entry {:?} missing required field {key}", e.get("id")))
        .to_string()
}

#[test]
fn matrix_covers_required_categories() {
    let m = matrix();
    let cats = m.get("categories").unwrap().as_mapping().unwrap();
    for required in [
        "functional_standards",
        "grammar",
        "lexicon",
        "orthography",
        "phonology_prosody",
        "corpora_audio",
    ] {
        let entries = cats
            .get(required)
            .and_then(|v| v.as_sequence())
            .unwrap_or_else(|| panic!("category {required} must exist with entries"));
        assert!(!entries.is_empty(), "category {required} is empty");
    }
}

#[test]
fn every_entry_is_classified_with_registry_fields() {
    let m = matrix();
    let cats = m.get("categories").unwrap().as_mapping().unwrap();
    let allowed = ["allowed", "derived", "reference-only", "blocked", "unknown"];
    let mut count = 0;
    for (_cat, entries) in cats {
        for e in entries.as_sequence().unwrap() {
            count += 1;
            for key in [
                "id",
                "title",
                "org",
                "url",
                "license",
                "license_url",
                "accessed",
                "type",
                "redistribution",
                "notes",
            ] {
                field(e, key);
            }
            let r = field(e, "redistribution");
            assert!(
                allowed.contains(&r.as_str()),
                "entry {} has non-canonical redistribution {r:?}",
                field(e, "id")
            );
        }
    }
    assert!(count >= 25, "matrix too thin: {count} entries");
}

#[test]
fn nonshippable_entries_have_alternative_or_blocker() {
    let m = matrix();
    let cats = m.get("categories").unwrap().as_mapping().unwrap();
    for entries in cats.values() {
        for e in entries.as_sequence().unwrap() {
            let r = field(e, "redistribution");
            if matches!(r.as_str(), "unknown" | "blocked" | "reference-only") {
                let covered = e.get("alternative").is_some() || e.get("blocker").is_some();
                assert!(
                    covered,
                    "{} ({r}) needs an alternative or explicit blocker",
                    field(e, "id")
                );
            }
        }
    }
}
