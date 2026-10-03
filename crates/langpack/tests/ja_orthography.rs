//! JA-RES-003: orthography scaffold policy is machine-represented,
//! reading/writing stay separate, and romaji fade is specified.

use lts_langpack::schema::SchemaSet;
use serde_yaml::Value;

fn load(rel: &str) -> Value {
    let path = format!("{}/../../docs/assessment/{rel}", env!("CARGO_MANIFEST_DIR"));
    let text = std::fs::read_to_string(path).expect("orthography artifact must exist");
    serde_yaml::from_str(&text).expect("orthography artifact must parse")
}

#[test]
fn scripts_document_validates_against_v02_schema() {
    let set = SchemaSet::load().unwrap();
    let v = set.validator("orthography", true).unwrap();
    let json = serde_json::to_value(load("JA_ORTHOGRAPHY.yaml")).unwrap();
    let errors: Vec<String> = v.iter_errors(&json).map(|e| format!("{e}")).collect();
    assert!(errors.is_empty(), "schema errors: {errors:#?}");
}

#[test]
fn scaffold_policy_covers_all_five_scaffolds() {
    let p = load("JA_ORTHOGRAPHY_POLICY.yaml");
    let scripts = p["scripts"].as_mapping().unwrap();
    for s in ["hiragana", "katakana", "kanji", "latin_romaji"] {
        assert!(scripts.contains_key(s), "missing script policy {s}");
    }
    assert!(p["furigana"].is_mapping(), "furigana policy missing");
    // Kana on-ramp: both kana scripts start immediately.
    assert_eq!(
        scripts["hiragana"]["introduce"].as_str().unwrap(),
        "on-ramp"
    );
    // Kanji selection rule forbids arbitrary list order.
    assert_eq!(
        scripts["kanji"]["forbidden_selection"].as_str().unwrap(),
        "arbitrary-list-order"
    );
}

#[test]
fn reading_and_writing_competencies_are_separate() {
    let p = load("JA_ORTHOGRAPHY_POLICY.yaml");
    let sep = &p["competency_separation"];
    let reading = sep["reading"]["dimension"].as_str().unwrap();
    let writing = sep["writing"]["dimension"].as_str().unwrap();
    assert_eq!(reading, "comprehension-reading");
    assert_eq!(writing, "production-writing");
    assert_ne!(reading, writing);
    // Writing tracks are distinct and handwriting never gates speaking.
    let tracks: Vec<&str> = sep["writing"]["tracks"]
        .as_sequence()
        .unwrap()
        .iter()
        .map(|t| t.as_str().unwrap())
        .collect();
    assert_eq!(tracks.len(), 4);
    assert!(tracks.iter().any(|t| t.starts_with("handwriting")));
    assert_eq!(
        sep["writing"]["rule"].as_str().unwrap(),
        "handwriting-never-gates-speaking"
    );
    assert_eq!(
        sep["reading"]["rule"].as_str().unwrap(),
        "character-memorization-never-equates-to-comprehension"
    );
}

#[test]
fn romaji_fade_is_specified_and_never_gates() {
    let p = load("JA_ORTHOGRAPHY_POLICY.yaml");
    let fade = &p["romaji_fade"];
    assert!(fade["default_visible_at_start"].as_bool().unwrap());
    assert_eq!(fade["user_modes"].as_sequence().unwrap().len(), 3);
    assert!(
        !fade["auto_rules"].as_sequence().unwrap().is_empty(),
        "fade rules must be specified"
    );
    assert!(fade["reveal_always_available"].as_bool().unwrap());
    assert!(fade["fade_is_not_removal"].as_bool().unwrap());
    assert_eq!(fade["reveal_counts_as"].as_str().unwrap(), "support");
    let gates: Vec<&str> = fade["never_gates"]
        .as_sequence()
        .unwrap()
        .iter()
        .map(|g| g.as_str().unwrap())
        .collect();
    for g in ["speaking-progression", "listening-progression"] {
        assert!(gates.contains(&g), "romaji must never gate {g}");
    }
    assert_eq!(
        p["romaji_fade"]["input_policy"]["reading-writing-progress-measured-in"]
            .as_str()
            .unwrap(),
        "japanese-script"
    );
}
