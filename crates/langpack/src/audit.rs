//! Source/license audit (PACK-003, docs/10).
//!
//! `audit_licenses` fails the reference build on: missing license for a
//! distributed third-party asset, unknown redistribution status,
//! reference-only sources copied into the pack (bundled), attribution
//! requirements with no attribution entry, and pending/blocked original
//! content licensing. It also aggregates the attribution report the
//! Sources/Licenses screen needs.

use crate::diagnose::{Diagnostic, Severity};
use crate::pack::Pack;
use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs;

#[derive(Serialize, Clone, Debug)]
pub struct AttributionEntry {
    pub source_id: String,
    pub title: String,
    pub license: String,
    pub attribution: String,
}

fn unknown_license(spdx: Option<&str>) -> bool {
    match spdx {
        None => true,
        Some(s) => {
            let s = s.trim();
            s.is_empty()
                || s.eq_ignore_ascii_case("unknown")
                || s.eq_ignore_ascii_case("tbd")
                || s == "null"
        }
    }
}

impl Pack {
    /// Source provenance completeness audit (PACK-005 `audit-sources`).
    pub fn audit_sources(&self) -> Vec<Diagnostic> {
        let mut referenced: std::collections::HashSet<String> = std::collections::HashSet::new();
        for inst in &self.instances {
            for (_, target, field) in crate::pack::references(inst.schema, inst.v2, &inst.value) {
                if field == "sources" || field == "scope.source_id" {
                    referenced.insert(target);
                }
            }
        }
        let mut diags = Vec::new();
        for inst in self.instances.iter().filter(|i| i.schema == "source-entry") {
            let v = &inst.value;
            let id = v.get("id").and_then(Value::as_str).unwrap_or("?");
            if v.get("url").and_then(Value::as_str).is_none() {
                diags.push(Diagnostic::new(
                    &inst.file,
                    inst.pointer.clone(),
                    "source_missing_url",
                    format!("source {id:?} records no URL/DOI locator (docs/10 source registry)"),
                    Severity::Warning,
                ));
            }
            if v.get("retrieved").is_none() {
                diags.push(Diagnostic::new(
                    &inst.file,
                    inst.pointer.clone(),
                    "source_missing_retrieved",
                    format!("source {id:?} records no accessed/retrieved date"),
                    Severity::Warning,
                ));
            }
            let reference_only = v
                .get("access")
                .and_then(|a| a.get("mode"))
                .and_then(Value::as_str)
                == Some("reference-only");
            let redistribution = v
                .get("use")
                .and_then(|u| u.get("redistribution_allowed"))
                .and_then(Value::as_bool);
            if reference_only && redistribution == Some(true) {
                diags.push(Diagnostic::new(
                    &inst.file,
                    format!("{}/use", inst.pointer),
                    "source_terms_inconsistent",
                    format!("source {id:?} is access mode reference-only but claims redistribution_allowed true; verify exact upstream terms"),
                    Severity::Warning,
                ));
            }
            if !referenced.contains(id) {
                diags.push(Diagnostic::new(
                    &inst.file,
                    inst.pointer.clone(),
                    "unused_source",
                    format!("source {id:?} is not referenced by any content record"),
                    Severity::Info,
                ));
            }
        }
        diags
    }

    /// License/redistribution audit + attribution report.
    pub fn audit_licenses(&self) -> (Vec<Diagnostic>, Vec<AttributionEntry>) {
        if self.schema_version() == "0.1" {
            self.audit_v1()
        } else {
            self.audit_v2()
        }
    }

    fn audit_v2(&self) -> (Vec<Diagnostic>, Vec<AttributionEntry>) {
        let mut diags = Vec::new();
        let sources: HashMap<&str, &Value> = self
            .instances
            .iter()
            .filter(|i| i.schema == "source-entry")
            .filter_map(|i| {
                i.value
                    .get("id")
                    .and_then(Value::as_str)
                    .map(|id| (id, &i.value))
            })
            .collect();

        for inst in self
            .instances
            .iter()
            .filter(|i| i.schema == "license-inventory")
        {
            let id = inst.value.get("id").and_then(Value::as_str).unwrap_or("?");
            let kind = inst
                .value
                .get("scope")
                .and_then(|s| s.get("kind"))
                .and_then(Value::as_str)
                .unwrap_or("");
            let lic = inst.value.get("license");
            let spdx = lic.and_then(|l| l.get("spdx")).and_then(Value::as_str);
            if lic.and_then(|l| l.get("pending")).and_then(Value::as_bool) == Some(true) {
                diags.push(Diagnostic::new(
                    &inst.file,
                    format!("{}/license", inst.pointer),
                    "license_pending",
                    format!("inventory entry {id:?} has a pending license (owner decision LIC-001); reference build blocked"),
                    Severity::Error,
                ));
            } else if unknown_license(spdx) {
                diags.push(Diagnostic::new(
                    &inst.file,
                    format!("{}/license", inst.pointer),
                    "missing_license",
                    format!("inventory entry {id:?} has no resolvable license (spdx missing/unknown); reference build blocked"),
                    Severity::Error,
                ));
            }

            if kind == "pack-original"
                && inst
                    .value
                    .get("redistribution_allowed")
                    .and_then(Value::as_bool)
                    != Some(true)
            {
                diags.push(Diagnostic::new(
                    &inst.file,
                    inst.pointer.clone(),
                    "original_redistribution_blocked",
                    format!("original content {id:?} may not be redistributed until the owner resolves licensing (LIC-001)"),
                    Severity::Error,
                ));
            }

            if kind == "derived-from-source" || kind == "third-party-asset" {
                let src_id = inst
                    .value
                    .get("scope")
                    .and_then(|s| s.get("source_id"))
                    .and_then(Value::as_str);
                let Some(src_id) = src_id else {
                    diags.push(Diagnostic::new(
                        &inst.file,
                        format!("{}/scope", inst.pointer),
                        "missing_source_record",
                        format!("third-party inventory entry {id:?} must reference a source record (require_source_record)"),
                        Severity::Error,
                    ));
                    continue;
                };
                let Some(src) = sources.get(src_id) else {
                    diags.push(Diagnostic::new(
                        &inst.file,
                        format!("{}/scope/source_id", inst.pointer),
                        "unknown_source",
                        format!("inventory entry {id:?} references unknown source {src_id:?}"),
                        Severity::Error,
                    ));
                    continue;
                };
                let src_redistribution = src
                    .get("use")
                    .and_then(|u| u.get("redistribution_allowed"))
                    .and_then(Value::as_bool);
                if src_redistribution != Some(true) {
                    diags.push(Diagnostic::new(
                        &inst.file,
                        format!("{}/scope/source_id", inst.pointer),
                        "blocked_redistribution",
                        format!("source {src_id:?} does not permit redistribution, but {id:?} bundles/derives from it"),
                        Severity::Error,
                    ));
                }
                if kind == "third-party-asset"
                    && src
                        .get("access")
                        .and_then(|a| a.get("mode"))
                        .and_then(Value::as_str)
                        == Some("reference-only")
                {
                    diags.push(Diagnostic::new(
                        &inst.file,
                        format!("{}/scope", inst.pointer),
                        "reference_only_bundled",
                        format!("source {src_id:?} is reference-only and cannot be marked as a bundled asset ({id:?})"),
                        Severity::Error,
                    ));
                }
                if unknown_license(
                    src.get("license")
                        .and_then(|l| l.get("spdx"))
                        .and_then(Value::as_str),
                ) {
                    diags.push(Diagnostic::new(
                        &inst.file,
                        format!("{}/scope/source_id", inst.pointer),
                        "missing_license",
                        format!("source {src_id:?} has no resolvable license for bundled/derived content {id:?}"),
                        Severity::Error,
                    ));
                }
                let attribution_required = src
                    .get("use")
                    .and_then(|u| u.get("attribution_required"))
                    .and_then(Value::as_bool)
                    != Some(false);
                let has_attribution = inst
                    .value
                    .get("attribution")
                    .and_then(Value::as_str)
                    .is_some()
                    || src
                        .get("use")
                        .and_then(|u| u.get("attribution_text"))
                        .and_then(Value::as_str)
                        .is_some();
                if attribution_required && !has_attribution {
                    diags.push(Diagnostic::new(
                        &inst.file,
                        inst.pointer.clone(),
                        "missing_attribution",
                        format!("source {src_id:?} requires attribution but inventory entry {id:?} carries none"),
                        Severity::Error,
                    ));
                }
            }
        }

        let report = build_report(&self.instances);
        (diags, report)
    }

    fn audit_v1(&self) -> (Vec<Diagnostic>, Vec<AttributionEntry>) {
        let mut diags = Vec::new();
        for (file, doc) in &self.structural {
            if file != "LICENSES.yaml" {
                continue;
            }
            if let Some(orig) = doc.get("pack_original_content") {
                if orig.get("redistribution").and_then(Value::as_bool) != Some(true) {
                    diags.push(Diagnostic::new(
                        file,
                        "/pack_original_content",
                        "original_redistribution_blocked",
                        "original content may not be redistributed until the owner resolves licensing (LIC-001)",
                        Severity::Error,
                    ));
                }
                if orig
                    .get("status")
                    .and_then(Value::as_str)
                    .map(str::to_lowercase)
                    .unwrap_or_default()
                    .contains("pending")
                {
                    diags.push(Diagnostic::new(
                        file,
                        "/pack_original_content/status",
                        "license_pending",
                        "original content license is an unresolved owner decision (LIC-001)",
                        Severity::Warning,
                    ));
                }
            }
        }
        for inst in self.instances.iter().filter(|i| i.schema == "source-entry") {
            let id = inst.value.get("id").and_then(Value::as_str).unwrap_or("?");
            let status = inst
                .value
                .get("redistribution")
                .and_then(Value::as_str)
                .unwrap_or("unknown");
            if status == "unknown" {
                diags.push(Diagnostic::new(
                    &inst.file,
                    format!("{}/redistribution", inst.pointer),
                    "unknown_redistribution",
                    format!(
                        "source {id:?} has unknown redistribution status; reference build blocked"
                    ),
                    Severity::Error,
                ));
            }
            if status == "allowed"
                && inst
                    .value
                    .get("license")
                    .and_then(Value::as_str)
                    .map(str::to_owned)
                    .is_none()
            {
                diags.push(Diagnostic::new(
                    &inst.file,
                    format!("{}/license", inst.pointer),
                    "missing_license",
                    format!(
                        "source {id:?} claims redistribution is allowed but records no license"
                    ),
                    Severity::Error,
                ));
            }
        }
        let report = self
            .instances
            .iter()
            .filter(|i| i.schema == "source-entry")
            .map(|i| AttributionEntry {
                source_id: i
                    .value
                    .get("id")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string(),
                title: i
                    .value
                    .get("title")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string(),
                license: i
                    .value
                    .get("license")
                    .and_then(Value::as_str)
                    .unwrap_or("unknown")
                    .to_string(),
                attribution: i
                    .value
                    .get("attribution")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string(),
            })
            .collect();
        (diags, report)
    }

    /// Lexicon script-purity + stress audit (`audit-lexicon`).
    /// Catches writing-system contamination (Latin/Hangul/precomposed
    /// accented Latin inside Cyrillic or kana fields) and Russian word
    /// stress defects (missing/multiple combining marks). Dictionary
    /// cross-checks (JMdict, Zalizniak) stay offline review tooling —
    /// this gate asserts only self-consistency, no third-party data.
    pub fn audit_lexicon(&self) -> Vec<Diagnostic> {
        let mut diags = Vec::new();
        for inst in self
            .instances
            .iter()
            .filter(|i| i.schema == "lexicon-entry")
        {
            let target_reading = inst
                .value
                .get("readings")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter().any(|r| {
                        matches!(
                            r.get("script").and_then(Value::as_str),
                            Some("cyrillic") | Some("hiragana") | Some("katakana")
                        )
                    })
                })
                .unwrap_or(false);
            for field in ["forms", "readings"] {
                let arr = inst
                    .value
                    .get(field)
                    .and_then(Value::as_array)
                    .map(|items| items.iter().enumerate().collect::<Vec<_>>())
                    .unwrap_or_default();
                for (i, item) in arr {
                    let Some(text) = item.get("text").and_then(Value::as_str) else {
                        continue;
                    };
                    let script = item.get("script").and_then(Value::as_str).unwrap_or("");
                    let pointer = format!("{}/{}/{}/text", inst.pointer, field, i);
                    let has_cyr = text.chars().any(|c| ('\u{0400}'..='\u{04ff}').contains(&c));
                    let has_kana = text.chars().any(|c| ('\u{3040}'..='\u{30ff}').contains(&c));
                    let has_cjk = text.chars().any(|c| ('\u{4e00}'..='\u{9fff}').contains(&c));
                    // Hangul is never a legitimate script in these packs.
                    if text.chars().any(|c| {
                        ('\u{1100}'..='\u{11ff}').contains(&c)
                            || ('\u{3130}'..='\u{318f}').contains(&c)
                            || ('\u{ac00}'..='\u{d7a3}').contains(&c)
                    }) {
                        diags.push(Diagnostic::new(
                            &inst.file,
                            pointer.clone(),
                            "lexicon_script_contamination",
                            format!(
                                "text {text:?} contains Hangul codepoints; wrong writing system"
                            ),
                            Severity::Error,
                        ));
                    }
                    if script == "cyrillic" || (script.is_empty() && has_cyr) {
                        for ch in text.chars() {
                            let ok = ('\u{0400}'..='\u{04ff}').contains(&ch)
                                || ch == '\u{0301}'
                                || ch == '-'
                                || ch == ' ';
                            if !ok {
                                diags.push(Diagnostic::new(
                                    &inst.file,
                                    pointer.clone(),
                                    "lexicon_script_contamination",
                                    format!(
                                        "cyrillic text {text:?} contains {ch:?} (U+{:04X}); \
                                         expected Cyrillic + combining stress only",
                                        ch as u32
                                    ),
                                    Severity::Error,
                                ));
                            }
                        }
                    }
                    if script == "hiragana" || script == "katakana" {
                        for ch in text.chars() {
                            let ok = ('\u{3040}'..='\u{30ff}').contains(&ch) || ch == ' ';
                            if !ok {
                                diags.push(Diagnostic::new(
                                    &inst.file,
                                    pointer.clone(),
                                    "lexicon_script_contamination",
                                    format!(
                                        "kana reading {text:?} contains {ch:?} (U+{:04X}); \
                                         expected kana only",
                                        ch as u32
                                    ),
                                    Severity::Error,
                                ));
                            }
                        }
                    }
                    if field == "forms" && target_reading && !has_cyr && !has_kana && !has_cjk {
                        diags.push(Diagnostic::new(
                            &inst.file,
                            pointer.clone(),
                            "lexicon_form_no_target_script",
                            format!("form {text:?} contains no Cyrillic/kana/CJK characters"),
                            Severity::Warning,
                        ));
                    }
                    // Russian lexical stress: every Cyrillic word with two
                    // or more vowels carries exactly one combining acute.
                    // Readings carry pronunciation; forms are orthography.
                    if has_cyr && script == "cyrillic" {
                        for word in text.split(|c: char| {
                            !('\u{0400}'..='\u{04ff}').contains(&c) && c != '\u{0301}'
                        }) {
                            let vowels = word
                                .chars()
                                .filter(|c| "аеёиоуыэюяАЕЁИОУЫЭЮЯ".contains(*c))
                                .count();
                            let inherent_yo = word.contains('ё') || word.contains('Ё');
                            let marks = word.chars().filter(|c| *c == '\u{0301}').count();
                            if word.chars().any(|c| c == '\u{0300}') {
                                diags.push(Diagnostic::new(
                                    &inst.file,
                                    pointer.clone(),
                                    "lexicon_stress_secondary",
                                    format!("word {word:?} uses combining grave (secondary stress); not supported"),
                                    Severity::Error,
                                ));
                            }
                            if vowels >= 2 && marks == 0 && !inherent_yo {
                                diags.push(Diagnostic::new(
                                    &inst.file,
                                    pointer.clone(),
                                    "lexicon_stress_missing",
                                    format!("Cyrillic word {word:?} has {vowels} vowels but no stress mark"),
                                    Severity::Warning,
                                ));
                            }
                            if marks > 1 {
                                diags.push(Diagnostic::new(
                                    &inst.file,
                                    pointer.clone(),
                                    "lexicon_stress_multiple",
                                    format!("Cyrillic word {word:?} has {marks} stress marks"),
                                    Severity::Error,
                                ));
                            }
                        }
                    }
                }
            }
        }
        diags
    }

    /// Media integrity (ADR-0016, docs/10 security boundary "validate hashes
    /// before install"): every `media/manifest.jsonl` row must describe the
    /// bytes that are actually present. The manifest is a shipped pack's only
    /// provenance statement about its audio, so a drifted hash or a vanished
    /// asset would leave the app labelling audio from file presence — exactly
    /// what the manifest exists to prevent.
    ///
    /// Posture is decided first, per pack: **unbuilt** (no declared asset
    /// present at all — a source checkout, where the `.wav` bytes are gitignored
    /// and regenerated) yields one aggregated `media_unbuilt` diagnostic instead
    /// of one per asset; **partially built** is an error in every mode, because a
    /// manifest that describes some but not all of the audio describes the pack
    /// falsely. `require_present` only decides the severity of the unbuilt case:
    /// install and build refuse it, scaffold reports it as info. A present asset
    /// whose bytes disagree with the manifest is an error in every mode.
    pub fn audit_media(&self, require_present: bool) -> Vec<Diagnostic> {
        let mut diags: Vec<Diagnostic> = Vec::new();
        let rows: Vec<&crate::pack::Instance> = self
            .instances
            .iter()
            .filter(|i| i.schema == "media-asset")
            .collect();
        if rows.is_empty() {
            return diags;
        }
        let mut listed: HashSet<String> = HashSet::new();
        // Decide the posture before reporting anything: an unbuilt checkout is
        // expected, a half-built media directory is not.
        let mut planned: Vec<(&crate::pack::Instance, String)> = Vec::new();
        for row in &rows {
            let rel = match row.value.get("file").and_then(Value::as_str) {
                Some(rel) if !rel.is_empty() => rel.to_string(),
                _ => {
                    diags.push(Diagnostic::new(
                        &row.file,
                        row.pointer.clone(),
                        "media_row_unusable",
                        "media manifest row declares no file path",
                        Severity::Error,
                    ));
                    continue;
                }
            };
            if !listed.insert(rel.clone()) {
                diags.push(Diagnostic::new(
                    &row.file,
                    row.pointer.clone(),
                    "media_duplicate",
                    format!("{rel} is declared by more than one media manifest row"),
                    Severity::Error,
                ));
                continue;
            }
            planned.push((row, rel));
        }
        let present = planned
            .iter()
            .filter(|(_, rel)| self.root().join(rel).is_file())
            .count();
        let unbuilt = present == 0;
        if unbuilt {
            diags.push(Diagnostic::new(
                "media/manifest.jsonl",
                String::new(),
                "media_unbuilt",
                format!(
                    "the media manifest declares {} asset(s) and none of them are present; {}",
                    planned.len(),
                    if require_present {
                        "install and build must not proceed on audio this pack never built \
                         (run scripts/generate-pack-audio.py first, ADR-0016)"
                    } else {
                        "expected in a source checkout: the .wav bytes are gitignored and \
                         regenerated before install-mode gates and build (ADR-0016)"
                    }
                ),
                if require_present {
                    Severity::Error
                } else {
                    Severity::Info
                },
            ));
        }
        for (row, rel) in planned {
            let path = self.root().join(&rel);
            let bytes = match fs::read(&path) {
                Ok(bytes) => bytes,
                Err(_) => {
                    if unbuilt {
                        continue;
                    }
                    diags.push(Diagnostic::new(
                        &row.file,
                        format!("{}/file", row.pointer),
                        "media_missing",
                        format!(
                            "{rel} is declared by the media manifest and absent while other \
                             declared assets are present: the media build is partial, so the \
                             manifest does not describe this pack (regenerate with \
                             scripts/generate-pack-audio.py, ADR-0016)"
                        ),
                        Severity::Error,
                    ));
                    continue;
                }
            };
            if let Some(declared) = row.value.get("bytes").and_then(Value::as_u64) {
                if declared != bytes.len() as u64 {
                    diags.push(Diagnostic::new(
                        &row.file,
                        format!("{}/bytes", row.pointer),
                        "media_size_mismatch",
                        format!(
                            "{rel} is {} bytes on disk, manifest declares {declared}",
                            bytes.len()
                        ),
                        Severity::Error,
                    ));
                }
            }
            if let Some(declared) = row.value.get("sha256").and_then(Value::as_str) {
                let got = crate::archive::hex_sha256(&bytes);
                if !got.eq_ignore_ascii_case(declared) {
                    diags.push(Diagnostic::new(
                        &row.file,
                        format!("{}/sha256", row.pointer),
                        "media_hash_mismatch",
                        format!(
                            "{rel} hashes to {got}, the media manifest declares {declared}; \
                             the shipped bytes are not the audited bytes"
                        ),
                        Severity::Error,
                    ));
                }
            }
        }
        if let Ok(entries) = fs::read_dir(self.root().join("media")) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().into_owned();
                if name == "manifest.jsonl" {
                    continue;
                }
                let rel = format!("media/{name}");
                if !listed.contains(&rel) {
                    diags.push(Diagnostic::new(
                        "media/manifest.jsonl",
                        "",
                        "media_unlisted",
                        format!(
                            "{rel} exists in the pack but no manifest row declares it, so its \
                             provenance would have to be inferred from file presence (ADR-0016)"
                        ),
                        Severity::Warning,
                    ));
                }
            }
        }
        diags
    }
}

fn build_report(instances: &[crate::pack::Instance]) -> Vec<AttributionEntry> {
    let mut report = Vec::new();
    let mut by_source: HashMap<String, String> = HashMap::new();
    for inst in instances.iter().filter(|i| i.schema == "license-inventory") {
        if let (Some(src), Some(attr)) = (
            inst.value
                .get("scope")
                .and_then(|s| s.get("source_id"))
                .and_then(Value::as_str),
            inst.value.get("attribution").and_then(Value::as_str),
        ) {
            by_source.insert(src.to_string(), attr.to_string());
        }
    }
    for inst in instances.iter().filter(|i| i.schema == "source-entry") {
        let v = &inst.value;
        if v.get("use")
            .and_then(|u| u.get("attribution_required"))
            .and_then(Value::as_bool)
            == Some(false)
        {
            continue;
        }
        let id = v
            .get("id")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        let attribution = by_source
            .get(&id)
            .cloned()
            .or_else(|| {
                v.get("use")
                    .and_then(|u| u.get("attribution_text"))
                    .and_then(Value::as_str)
                    .map(str::to_string)
            })
            .unwrap_or_else(|| "attribution required; text missing".to_string());
        report.push(AttributionEntry {
            source_id: id,
            title: v
                .get("title")
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string(),
            license: v
                .get("license")
                .and_then(|l| l.get("spdx"))
                .and_then(Value::as_str)
                .unwrap_or("unknown")
                .to_string(),
            attribution,
        });
    }
    report.sort_by(|a, b| a.source_id.cmp(&b.source_id));
    report
}
