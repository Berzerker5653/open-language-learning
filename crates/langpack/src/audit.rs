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
use std::collections::HashMap;

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
