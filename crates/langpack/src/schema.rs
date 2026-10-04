//! Embedded schema sets compiled into offline `$id` registries.
//!
//! v0.2 is the current contract (`schemas/v0.2/`); v0.1 is the frozen
//! legacy seed contract (`schemas/` root) kept so the Japanese draft pack
//! still validates. `schema_version` in the manifest selects the contract.

use jsonschema::{Registry, Validator};
use serde_json::Value;
use std::collections::HashMap;

const V2_TEXTS: &[(&str, &str)] = &[
    (
        "common",
        include_str!("../../../schemas/v0.2/common.schema.json"),
    ),
    (
        "language-pack-manifest",
        include_str!("../../../schemas/v0.2/language-pack-manifest.schema.json"),
    ),
    (
        "language-identity",
        include_str!("../../../schemas/v0.2/language-identity.schema.json"),
    ),
    (
        "normalization",
        include_str!("../../../schemas/v0.2/normalization.schema.json"),
    ),
    (
        "orthography",
        include_str!("../../../schemas/v0.2/orthography.schema.json"),
    ),
    (
        "orthography-unit",
        include_str!("../../../schemas/v0.2/orthography-unit.schema.json"),
    ),
    (
        "phonology",
        include_str!("../../../schemas/v0.2/phonology.schema.json"),
    ),
    (
        "pragmatics",
        include_str!("../../../schemas/v0.2/pragmatics.schema.json"),
    ),
    (
        "goal",
        include_str!("../../../schemas/v0.2/goal.schema.json"),
    ),
    (
        "unit",
        include_str!("../../../schemas/v0.2/unit.schema.json"),
    ),
    (
        "scenario",
        include_str!("../../../schemas/v0.2/scenario.schema.json"),
    ),
    (
        "assessment",
        include_str!("../../../schemas/v0.2/assessment.schema.json"),
    ),
    (
        "lexicon-entry",
        include_str!("../../../schemas/v0.2/lexicon-entry.schema.json"),
    ),
    (
        "concept",
        include_str!("../../../schemas/v0.2/concept.schema.json"),
    ),
    (
        "source-entry",
        include_str!("../../../schemas/v0.2/source-entry.schema.json"),
    ),
    (
        "license-inventory",
        include_str!("../../../schemas/v0.2/license-inventory.schema.json"),
    ),
    (
        "review-record",
        include_str!("../../../schemas/v0.2/review-record.schema.json"),
    ),
    (
        "speech-profile",
        include_str!("../../../schemas/v0.2/speech-profile.schema.json"),
    ),
];

const V1_TEXTS: &[(&str, &str)] = &[
    (
        "language-pack-manifest",
        include_str!("../../../schemas/language-pack-manifest.schema.json"),
    ),
    ("goal", include_str!("../../../schemas/goal.schema.json")),
    ("unit", include_str!("../../../schemas/unit.schema.json")),
    (
        "concept",
        include_str!("../../../schemas/concept.schema.json"),
    ),
    (
        "lexical-entry",
        include_str!("../../../schemas/lexical-entry.schema.json"),
    ),
    (
        "source-entry",
        include_str!("../../../schemas/source-entry.schema.json"),
    ),
    (
        "speech-profile",
        include_str!("../../../schemas/speech-profile.schema.json"),
    ),
];

pub struct SchemaSet {
    v2: Registry<'static>,
    v1: Registry<'static>,
    v2_docs: HashMap<&'static str, Value>,
    v1_docs: HashMap<&'static str, Value>,
}

impl SchemaSet {
    /// Parse and register every embedded schema; refs resolve offline only.
    pub fn load() -> Result<Self, String> {
        let (v2, v2_docs) = build(V2_TEXTS)?;
        let (v1, v1_docs) = build(V1_TEXTS)?;
        Ok(Self {
            v2,
            v1,
            v2_docs,
            v1_docs,
        })
    }

    pub fn validator(&self, name: &str, v2: bool) -> Result<Validator, String> {
        let (registry, docs) = if v2 {
            (&self.v2, &self.v2_docs)
        } else {
            (&self.v1, &self.v1_docs)
        };
        let doc = docs
            .get(name)
            .ok_or_else(|| format!("unknown schema '{name}'"))?;
        jsonschema::options()
            .with_registry(registry)
            .offline()
            .build(doc)
            .map_err(|e| format!("compile schema {name}: {e}"))
    }
}

fn build(
    texts: &'static [(&'static str, &'static str)],
) -> Result<(Registry<'static>, HashMap<&'static str, Value>), String> {
    let mut registry = Registry::new();
    let mut docs = HashMap::new();
    for (name, text) in texts {
        let doc: Value = serde_json::from_str(text)
            .map_err(|e| format!("embedded schema {name} is not valid JSON: {e}"))?;
        let id = doc
            .get("$id")
            .and_then(Value::as_str)
            .ok_or_else(|| format!("embedded schema {name} has no $id"))?
            .to_string();
        registry = registry
            .add(id, doc.clone())
            .map_err(|e| format!("register {name}: {e}"))?;
        docs.insert(*name, doc);
    }
    let registry = registry
        .prepare()
        .map_err(|e| format!("prepare schema registry: {e}"))?;
    Ok((registry, docs))
}
