//! JA-RES-002: the encoded Japanese phonology inventory must validate
//! against the v0.2 phonology schema and preserve the invariants the
//! acceptance criteria name (mora/length/gemination coverage, no
//! uncalibrated automatic scoring, ja-scoped ids).

use lts_langpack::schema::SchemaSet;
use serde_yaml::Value;

fn inventory() -> Value {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../docs/assessment/JA_PHONOLOGY.yaml"
    );
    let text = std::fs::read_to_string(path).expect("phonology inventory must exist");
    serde_yaml::from_str(&text).expect("phonology inventory must parse as YAML")
}

#[test]
fn inventory_validates_against_v02_phonology_schema() {
    let set = SchemaSet::load().unwrap();
    let v = set.validator("phonology", true).unwrap();
    let doc = inventory();
    let json = serde_json::to_value(&doc).unwrap();
    let errors: Vec<String> = v.iter_errors(&json).map(|e| format!("{e}")).collect();
    assert!(errors.is_empty(), "schema errors: {errors:#?}");
}

#[test]
fn required_feature_areas_are_encoded() {
    let doc = inventory();
    let ids: Vec<String> = doc["phonotactics"]
        .as_sequence()
        .unwrap()
        .iter()
        .chain(doc["prosody"].as_sequence().unwrap().iter())
        .map(|e| e["id"].as_str().unwrap().to_string())
        .collect();
    for required in [
        "ja.phon.mora-rhythm",
        "ja.phon.moraic-nasal",
        "ja.phon.gemination",
        "ja.phon.vowel-length",
        "ja.phon.pitch-accent-lexical",
        "ja.phon.phrase-intonation",
    ] {
        assert!(ids.iter().any(|i| i == required), "missing {required}");
    }
    // Five-vowel system present.
    let vowels: Vec<&str> = doc["segments"]
        .as_sequence()
        .unwrap()
        .iter()
        .filter(|s| s["type"].as_str() == Some("vowel"))
        .map(|s| s["symbol"].as_str().unwrap())
        .collect();
    assert_eq!(vowels.len(), 5, "expected five vowel phonemes");
}

#[test]
fn no_automatic_scoring_without_calibration() {
    // assess-automatic requires a bound calibrated speech profile;
    // calibration data (SPEECH-007) is not established, so the
    // inventory must not claim it anywhere.
    let doc = inventory();
    let modes = ["segments", "phonotactics", "prosody"]
        .iter()
        .flat_map(|sec| doc[*sec].as_sequence().unwrap().iter())
        .map(|e| e["mode"].as_str().unwrap().to_string())
        .collect::<Vec<_>>();
    assert!(!modes.iter().any(|m| m == "assess-automatic"), "{modes:?}");
    // Pitch accent is explicitly guided-only.
    let prosody = doc["prosody"].as_sequence().unwrap();
    let accent = prosody
        .iter()
        .find(|e| e["id"].as_str() == Some("ja.phon.pitch-accent-lexical"))
        .unwrap();
    assert_eq!(accent["mode"].as_str().unwrap(), "assess-guided");
}
