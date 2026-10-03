//! Pack layout contracts.
//!
//! Schema 0.2 (current contract) — every shipped logical content type has a
//! schema and a fixed location:
//!
//! ```text
//! manifest.yaml                    language-pack-manifest   (single doc)
//! language/identity.yaml           language-identity        (single doc)
//! language/normalization.yaml      normalization            (single doc)
//! language/orthography.yaml        orthography              (single doc)
//! language/phonology.yaml          phonology                (single doc)
//! language/pragmatics.yaml         pragmatics               (single doc)
//! curriculum/goals.yaml            goal                     ({goals: [...]})
//! curriculum/units/*.yaml          unit                     (single doc)
//! activities/scenarios/*.yaml      scenario                 (single doc)
//! assessments/definitions.jsonl    assessment               (one per line)
//! grammar/concepts.jsonl           concept                  (one per line)
//! grammar/dependencies.yaml        (mirror of prerequisite edges; structural)
//! sources.jsonl                    source-entry             (one per line)
//! licenses.jsonl                   license-inventory        (one per line)
//! reviews.jsonl                    review-record            (one per line)
//! speech/profiles.jsonl            speech-profile           (one per line)
//! ```
//!
//! Schema 0.1 (frozen legacy; the ja-JP draft pack) — only the seven seed
//! schemas apply; remaining files are parsed structurally:
//!
//! ```text
//! manifest.yaml                    language-pack-manifest   (single doc)
//! curriculum/goals.yaml            goal                     (top-level array)
//! curriculum/units/*.yaml          unit                     (single doc)
//! grammar/concepts.yaml            concept                  (top-level array)
//! lexicon/*.jsonl                  lexical-entry            (one per line)
//! SOURCES.yaml                     source-entry             (top-level array)
//! speech/profile.yaml              speech-profile           (single doc)
//! ```

/// How a file's content maps to schema-validated instances.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DocShape {
    /// Whole file is one instance.
    Single,
    /// File is `{ "<field>": [instances...] }`.
    ArrayField(&'static str),
    /// Whole file is a top-level array of instances.
    ArrayRoot,
    /// One JSON instance per non-blank line.
    Jsonl,
}

/// A file classified against the layout contract.
#[derive(Clone, Debug)]
pub struct Classified {
    /// Schema name (matches the file stem under the version's schema dir),
    /// or `None` for parse-only paths (0.1 structural files, media).
    pub schema: Option<&'static str>,
    pub shape: DocShape,
}

pub fn classify(rel: &str) -> Option<Classified> {
    let single = |name: &'static str| Classified {
        schema: Some(name),
        shape: DocShape::Single,
    };
    let jsonl = |name: &'static str| Classified {
        schema: Some(name),
        shape: DocShape::Jsonl,
    };
    match rel {
        "manifest.yaml" | "manifest.yml" | "manifest.json" => {
            Some(single("language-pack-manifest"))
        }
        "language/identity.yaml" | "language/identity.yml" | "language/identity.json" => {
            Some(single("language-identity"))
        }
        "language/normalization.yaml"
        | "language/normalization.yml"
        | "language/normalization.json" => Some(single("normalization")),
        "language/orthography.yaml" | "language/orthography.yml" | "language/orthography.json" => {
            Some(single("orthography"))
        }
        "language/phonology.yaml" | "language/phonology.yml" | "language/phonology.json" => {
            Some(single("phonology"))
        }
        "language/pragmatics.yaml" | "language/pragmatics.yml" | "language/pragmatics.json" => {
            Some(single("pragmatics"))
        }
        "curriculum/goals.yaml" | "curriculum/goals.yml" | "curriculum/goals.json" => {
            Some(Classified {
                schema: Some("goal"),
                shape: DocShape::ArrayField("goals"),
            })
        }
        "assessments/definitions.jsonl" => Some(jsonl("assessment")),
        "lexicon/entries.jsonl" => Some(jsonl("lexicon-entry")),
        "grammar/concepts.jsonl" => Some(jsonl("concept")),
        "sources.jsonl" => Some(jsonl("source-entry")),
        "licenses.jsonl" => Some(jsonl("license-inventory")),
        "reviews.jsonl" => Some(jsonl("review-record")),
        "speech/profiles.jsonl" => Some(jsonl("speech-profile")),
        _ => {
            if rel.starts_with("media/") {
                return Some(Classified {
                    schema: None,
                    shape: DocShape::Single,
                });
            }
            if rel.starts_with("curriculum/units/") && yaml(rel) {
                return Some(single("unit"));
            }
            if rel.starts_with("activities/scenarios/") && yaml(rel) {
                return Some(single("scenario"));
            }
            if rel == "grammar/dependencies.yaml"
                || rel == "grammar/dependencies.yml"
                || rel == "grammar/dependencies.json"
            {
                return Some(Classified {
                    schema: None,
                    shape: DocShape::Single,
                });
            }
            None
        }
    }
}

/// 0.1 legacy layout. Files outside the seven seeded schemas are parsed but
/// not schema-validated (the 0.1 contract was provisional).
pub fn classify_v1(rel: &str) -> Option<Classified> {
    let single = |name: &'static str| Classified {
        schema: Some(name),
        shape: DocShape::Single,
    };
    let array = |name: &'static str| Classified {
        schema: Some(name),
        shape: DocShape::ArrayRoot,
    };
    match rel {
        "manifest.yaml" | "manifest.yml" | "manifest.json" => {
            Some(single("language-pack-manifest"))
        }
        "curriculum/goals.yaml" | "curriculum/goals.yml" | "curriculum/goals.json" => {
            Some(array("goal"))
        }
        "grammar/concepts.yaml" | "grammar/concepts.yml" | "grammar/concepts.json" => {
            Some(array("concept"))
        }
        "SOURCES.yaml" | "SOURCES.yml" | "SOURCES.json" => Some(array("source-entry")),
        "speech/profile.yaml" | "speech/profile.yml" | "speech/profile.json" => {
            Some(single("speech-profile"))
        }
        _ => {
            if rel.starts_with("curriculum/units/") && yaml(rel) {
                return Some(single("unit"));
            }
            if rel.starts_with("lexicon/") && rel.ends_with(".jsonl") {
                return Some(Classified {
                    schema: Some("lexical-entry"),
                    shape: DocShape::Jsonl,
                });
            }
            // Structural-only: language/, orthography/, phonology/,
            // pragmatics/, activities/, grammar/dependencies.yaml,
            // speech/accepted-variants.yaml, speech/rubrics.yaml,
            // LICENSES.yaml.
            if rel.starts_with("language/")
                || rel.starts_with("orthography/")
                || rel.starts_with("phonology/")
                || rel.starts_with("pragmatics/")
                || rel.starts_with("activities/")
                || rel == "grammar/dependencies.yaml"
                || rel.starts_with("speech/")
                || rel == "LICENSES.yaml"
            {
                return Some(Classified {
                    schema: None,
                    shape: DocShape::Single,
                });
            }
            None
        }
    }
}

fn yaml(rel: &str) -> bool {
    rel.ends_with(".yaml") || rel.ends_with(".yml") || rel.ends_with(".json")
}

/// Human-readable docs and license notices are allowed anywhere.
pub fn is_documentation(rel: &str) -> bool {
    rel.ends_with(".md")
        || rel.ends_with(".txt")
        || rel == "LICENSE"
        || rel.starts_with("NOTICE")
        || rel.starts_with(".")
}
