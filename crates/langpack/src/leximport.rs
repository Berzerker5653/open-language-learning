//! Reviewed lexical import pipeline (JA-RES-006, docs/10 + docs/16).
//!
//! Imports raw lexical data from a source already registered in the pack's
//! `sources.jsonl` into a separate `lexicon/imported-<source>.jsonl` file.
//! Guarantees:
//! - Reproducible: same pack state + same input file → byte-identical
//!   output (entries sorted by source key, stable serialization, no
//!   wall-clock timestamps in the output).
//! - Separated: curriculum files (`curriculum/**`, `lexicon/entries.jsonl`)
//!   are never touched; imported entries live in their own file and are
//!   referenced by nothing until a human reviews them.
//! - Attribution generated: a `derived-from-source` license-inventory
//!   entry is appended when missing, and the attribution text required
//!   by the source entry is returned for the Sources/Licenses screen.
//! - No automatic teaching order: imported entries are always `draft`
//!   and carry no curriculum linkage; sources whose
//!   `use.redistribution_allowed` is false are rejected outright
//!   (reference-only data must not be re-hosted).

use crate::audit::AttributionEntry;
use crate::pack::Pack;
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs::File;
use std::io::{self, BufRead, BufReader, Write};
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ImportError {
    #[error("io: {0}")]
    Io(#[from] io::Error),
    #[error("source '{0}' is not registered in sources.jsonl; register and audit it first")]
    SourceNotFound(String),
    #[error(
        "source '{0}' does not allow redistribution (use.redistribution_allowed false); \
         reference-only or blocked sources must not be re-hosted in the pack"
    )]
    SourceNotRedistributable(String),
    #[error("input line {line}: {reason}")]
    BadInput { line: usize, reason: String },
}

/// One raw lexeme as provided by the upstream source export. Deliberately
/// source-shaped (not pack-shaped) so the mapping is explicit and auditable.
#[derive(Debug)]
struct RawLexeme {
    key: String,
    form: String,
    reading: Option<String>,
    glosses: Vec<String>,
    pos: Option<String>,
    tags: Vec<String>,
}

#[derive(Serialize)]
struct ImportedForm {
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    script: Option<String>,
    is_primary: bool,
}

#[derive(Serialize)]
struct ImportedReading {
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    script: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    transliteration_system: Option<String>,
}

#[derive(Serialize)]
struct ImportedGeneration {
    method: &'static str,
    tool: &'static str,
    notes: String,
}

#[derive(Serialize)]
struct ImportedEntry {
    id: String,
    status: &'static str,
    forms: Vec<ImportedForm>,
    readings: Vec<ImportedReading>,
    glosses: BTreeMap<String, Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    part_of_speech: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    semantic_tags: Vec<String>,
    sources: Vec<String>,
    notes: &'static str,
    generation: ImportedGeneration,
}

/// Result of one import run.
#[derive(Debug)]
pub struct ImportOutcome {
    /// Pack-relative path of the written lexicon file.
    pub output_file: String,
    /// Number of entries written.
    pub entries: usize,
    /// License-inventory entries appended (0 or 1).
    pub licenses_added: usize,
    /// Attribution the source requires for any distribution of the import.
    pub attribution: Vec<AttributionEntry>,
}

fn slugify(s: &str) -> String {
    let mut out = String::new();
    for c in s.chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c.to_ascii_lowercase());
        } else if !out.is_empty() && !out.ends_with('-') {
            out.push('-');
        }
    }
    let trimmed = out.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "entry".to_string()
    } else {
        trimmed
    }
}

fn parse_input(path: &Path) -> Result<Vec<RawLexeme>, ImportError> {
    let file = File::open(path)?;
    let mut lexemes = Vec::new();
    for (idx, line) in BufReader::new(file).lines().enumerate() {
        let line = line?;
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let line_no = idx + 1;
        let v: Value = serde_json::from_str(line).map_err(|e| ImportError::BadInput {
            line: line_no,
            reason: format!("invalid JSON: {e}"),
        })?;
        let get_str = |k: &str| -> Result<Option<String>, ImportError> {
            match v.get(k) {
                None | Some(Value::Null) => Ok(None),
                Some(Value::String(s)) if !s.is_empty() => Ok(Some(s.clone())),
                Some(_) => Err(ImportError::BadInput {
                    line: line_no,
                    reason: format!("'{k}' must be a non-empty string"),
                }),
            }
        };
        let key = get_str("key")?.ok_or(ImportError::BadInput {
            line: line_no,
            reason: "'key' is required".into(),
        })?;
        let form = get_str("form")?.ok_or(ImportError::BadInput {
            line: line_no,
            reason: "'form' is required".into(),
        })?;
        let glosses_v = v.get("glosses").cloned().unwrap_or(Value::Array(vec![]));
        let glosses: Vec<String> = glosses_v
            .as_array()
            .ok_or(ImportError::BadInput {
                line: line_no,
                reason: "'glosses' must be an array".into(),
            })?
            .iter()
            .map(|g| {
                g.as_str()
                    .filter(|s| !s.is_empty())
                    .map(str::to_string)
                    .ok_or(ImportError::BadInput {
                        line: line_no,
                        reason: "gloss items must be non-empty strings".into(),
                    })
            })
            .collect::<Result<_, _>>()?;
        if glosses.is_empty() {
            return Err(ImportError::BadInput {
                line: line_no,
                reason: "'glosses' must contain at least one item".into(),
            });
        }
        let tags_v = v.get("tags").cloned().unwrap_or(Value::Array(vec![]));
        let tags: Vec<String> = tags_v
            .as_array()
            .ok_or(ImportError::BadInput {
                line: line_no,
                reason: "'tags' must be an array".into(),
            })?
            .iter()
            .map(|t| {
                t.as_str()
                    .filter(|s| !s.is_empty())
                    .map(str::to_string)
                    .ok_or(ImportError::BadInput {
                        line: line_no,
                        reason: "tag items must be non-empty strings".into(),
                    })
            })
            .collect::<Result<_, _>>()?;
        lexemes.push(RawLexeme {
            key,
            form,
            reading: get_str("reading")?,
            glosses,
            pos: get_str("pos")?,
            tags,
        });
    }
    Ok(lexemes)
}

/// Import `input` (source-side JSONL export) into the pack at `pack_root`
/// under `source_id`. See module docs for the guarantees.
pub fn import_lexicon(
    pack_root: &Path,
    source_id: &str,
    input: &Path,
    gloss_locale: &str,
) -> Result<ImportOutcome, ImportError> {
    let pack = Pack::load_dir(pack_root)?;
    let source = pack
        .instances()
        .iter()
        .find(|i| i.schema == "source-entry" && i.value["id"].as_str() == Some(source_id))
        .ok_or_else(|| ImportError::SourceNotFound(source_id.to_string()))?;
    if source.value["use"]["redistribution_allowed"].as_bool() != Some(true) {
        return Err(ImportError::SourceNotRedistributable(source_id.to_string()));
    }

    let mut lexemes = parse_input(input)?;
    // Deterministic order: by source key.
    lexemes.sort_by(|a, b| a.key.cmp(&b.key));

    // Unique ids: slug from reading (romaji) when present, else key.
    // Collisions get a numeric suffix in sorted order.
    let mut used: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut entries: Vec<ImportedEntry> = Vec::with_capacity(lexemes.len());
    for lex in &lexemes {
        let base = slugify(lex.reading.as_deref().unwrap_or(&lex.key));
        let mut id = format!("ja.lex.imported.{base}");
        let mut n = 2;
        while !used.insert(id.clone()) {
            id = format!("ja.lex.imported.{base}-{n}");
            n += 1;
        }
        let mut glosses = BTreeMap::new();
        glosses.insert(gloss_locale.to_string(), lex.glosses.clone());
        let mut readings = Vec::new();
        if let Some(r) = &lex.reading {
            readings.push(ImportedReading {
                text: r.clone(),
                script: None,
                transliteration_system: Some("modified-hepburn".into()),
            });
        }
        entries.push(ImportedEntry {
            id,
            status: "draft",
            forms: vec![ImportedForm {
                text: lex.form.clone(),
                script: None,
                is_primary: true,
            }],
            readings,
            glosses,
            part_of_speech: lex.pos.clone(),
            semantic_tags: lex.tags.clone(),
            sources: vec![source_id.to_string()],
            notes: "Imported from an external source; unreviewed. \
                    Not eligible for curriculum use until reviewed.",
            generation: ImportedGeneration {
                method: "imported",
                tool: "langpack-cli",
                notes: format!("imported from source '{source_id}'; key '{}'", lex.key),
            },
        });
    }

    let rel = format!("lexicon/imported-{source_id}.jsonl");
    let out_path = pack_root.join(&rel);
    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut out = File::create(&out_path)?;
    for e in &entries {
        writeln!(out, "{}", serde_json::to_string(e).expect("infallible"))?;
    }

    // Generate the derived-from-source license entry if absent.
    let licenses_rel = "licenses.jsonl";
    let licenses_path = pack_root.join(licenses_rel);
    let mut license_lines: Vec<String> = Vec::new();
    if let Ok(f) = File::open(&licenses_path) {
        for line in BufReader::new(f).lines().map_while(Result::ok) {
            if !line.trim().is_empty() {
                license_lines.push(line);
            }
        }
    }
    let already = license_lines.iter().any(|l| {
        serde_json::from_str::<Value>(l).is_ok_and(|v| {
            v["scope"]["kind"].as_str() == Some("derived-from-source")
                && v["scope"]["source_id"].as_str() == Some(source_id)
        })
    });
    let mut licenses_added = 0;
    let spdx = source.value["license"]["spdx"]
        .as_str()
        .unwrap_or("UNLICENSED");
    let attribution_text = source.value["use"]["attribution_text"]
        .as_str()
        .map(str::to_string)
        .unwrap_or_else(|| format!("Imported data from source '{source_id}'."));
    if !already {
        let entry = serde_json::json!({
            "id": format!("lic-{source_id}-derived"),
            "scope": {"kind": "derived-from-source", "source_id": source_id},
            "license": {"spdx": spdx},
            "redistribution_allowed": true,
            "attribution": attribution_text,
        });
        license_lines.push(serde_json::to_string(&entry).expect("infallible"));
        licenses_added = 1;
        let mut lf = File::create(&licenses_path)?;
        for line in &license_lines {
            writeln!(lf, "{line}")?;
        }
    }

    let attribution = vec![AttributionEntry {
        source_id: source_id.to_string(),
        title: source.value["title"]
            .as_str()
            .unwrap_or(source_id)
            .to_string(),
        license: spdx.to_string(),
        attribution: attribution_text,
    }];

    Ok(ImportOutcome {
        output_file: rel,
        entries: entries.len(),
        licenses_added,
        attribution,
    })
}
