//! ADR-0013: the ja-JP phonological contrasts must validate against the
//! v0.2 phonology-contrast schema, and the vowel-length pairs must declare a
//! mora-derived production target so the length feature scores without any
//! reference media. Guards the public schema change (optional `production`
//! block) against data/schema drift.

use lts_langpack::schema::SchemaSet;

fn contrasts() -> Vec<serde_json::Value> {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../languages/ja-JP/phonology/contrasts.jsonl"
    );
    let text = std::fs::read_to_string(path).expect("contrasts.jsonl must exist");
    text.lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| serde_json::from_str(l).expect("each contrast line must be valid JSON"))
        .collect()
}

#[test]
fn contrasts_validate_against_v02_schema() {
    let set = SchemaSet::load().unwrap();
    let v = set.validator("phonology-contrast", true).unwrap();
    for c in contrasts() {
        let errors: Vec<String> = v.iter_errors(&c).map(|e| format!("{e}")).collect();
        assert!(
            errors.is_empty(),
            "schema errors for {:?}: {errors:#?}",
            c["id"]
        );
    }
}

#[test]
fn vowel_length_pairs_declare_mora_derived_targets() {
    // Each vowel-length contrast declares a production target > 1.0 with a
    // tolerance_low high enough that a no-contrast production (ratio ~1.0) is
    // not read as "close" (ADR-0013).
    let mut scored = 0;
    for c in contrasts() {
        if c["feature_id"].as_str() != Some("ja.phon.vowel-length") {
            continue;
        }
        let p = c
            .get("production")
            .unwrap_or_else(|| panic!("{} must declare a production target", c["id"]));
        assert_eq!(p["measure"].as_str(), Some("voiced-duration-ratio"));
        let ratio = p["expected_ratio"].as_f64().unwrap();
        let tlow = p["tolerance_low"].as_f64().unwrap();
        assert!(ratio > 1.0, "{} expected_ratio must exceed 1.0", c["id"]);
        assert!(
            tlow >= 0.85,
            "{} tolerance_low must be >= 0.85 so no-contrast reads shorter",
            c["id"]
        );
        scored += 1;
    }
    assert_eq!(scored, 2, "both vowel-length pairs must declare targets");
}
