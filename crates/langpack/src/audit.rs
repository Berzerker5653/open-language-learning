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
/// The three obligations a Creative-Commons-style id can impose on downstream
/// copies. This is the toolchain's only licence comparison and it answers one
/// question: does the licence a pack declares for its material drop an
/// obligation the source's licence imposes? Ids outside this table —
/// proprietary terms, "All rights reserved", a bespoke pack licence — are
/// deliberately left unjudged rather than guessed at. LIC-002,
/// docs/adr/0028-license-permissiveness-detection.md.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
struct Obligations {
    share_alike: bool,
    non_commercial: bool,
    no_derivatives: bool,
}

fn obligations(spdx: Option<&str>) -> Option<Obligations> {
    if unknown_license(spdx) {
        return None;
    }
    let dashes = spdx?.trim().to_ascii_uppercase().replace(' ', "-");
    if dashes == "CC0" || dashes == "CC0-1.0" {
        return Some(Obligations {
            share_alike: false,
            non_commercial: false,
            no_derivatives: false,
        });
    }
    if !dashes.starts_with("CC-BY") {
        return None;
    }
    Some(Obligations {
        share_alike: dashes.contains("-SA"),
        non_commercial: dashes.contains("-NC"),
        no_derivatives: dashes.contains("-ND"),
    })
}

/// Names the obligations `source` imposes that `declared` does not carry.
/// `None` means "not comparable" or "nothing dropped" — the two are
/// intentionally indistinguishable here, because neither is a finding.
fn dropped_obligations(source: Option<&str>, declared: Option<&str>) -> Option<String> {
    let (s, d) = (obligations(source)?, obligations(declared)?);
    let mut lost: Vec<&str> = Vec::new();
    if s.share_alike && !d.share_alike {
        lost.push("ShareAlike");
    }
    if s.non_commercial && !d.non_commercial {
        lost.push("NonCommercial");
    }
    if s.no_derivatives && !d.no_derivatives {
        lost.push("NoDerivatives");
    }
    if lost.is_empty() {
        return None;
    }
    Some(lost.join(" + "))
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
                // LIC-002: the direction 0.4.0 lost — a BY-SA source with the
                // derived work declared under BY. Info severity, not Warning:
                // the reference packs still carry an unresolved terms decision
                // (owner gate O-01(a)), so this reports rather than blocks.
                // docs/adr/0028-license-permissiveness-detection.md records the
                // promotion path.
                if let Some(lost) = dropped_obligations(
                    src.get("license")
                        .and_then(|l| l.get("spdx"))
                        .and_then(Value::as_str),
                    spdx,
                ) {
                    diags.push(Diagnostic::new(
                        &inst.file,
                        format!("{}/license/spdx", inst.pointer),
                        "license_less_permissive_than_source",
                        format!(
                            "derived material {id:?} is declared {} but cites source {src_id:?} under {}; the declaration drops {}",
                            spdx.unwrap_or("?"),
                            src.get("license")
                                .and_then(|l| l.get("spdx"))
                                .and_then(Value::as_str)
                                .unwrap_or("?"),
                            lost
                        ),
                        Severity::Info,
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

        // The same direction at the level a learner sees: the manifest's
        // declared content licence versus every source the pack contributes
        // from. A ShareAlike or NonCommercial source obliges the whole derived
        // work, so a pack cannot declare BY over one. Sources in
        // `access.mode: reference-only` are skipped: they contribute no
        // distributed material (the audit rejects a bundled asset that cites
        // one), so a CC0 declaration over a verification pointer is honest, not
        // a dropped obligation.
        let manifest_inst = self
            .instances
            .iter()
            .find(|i| i.schema == "language-pack-manifest");
        if let Some(manifest) = self.manifest.as_ref().zip(manifest_inst.as_ref()) {
            let declared = manifest
                .0
                .get("license")
                .and_then(|l| l.get("content_license"))
                .and_then(Value::as_str)
                .filter(|s| !unknown_license(Some(*s)));
            if let Some(declared) = declared {
                for inst in self.instances.iter().filter(|i| i.schema == "source-entry") {
                    let Some(src_id) = inst.value.get("id").and_then(Value::as_str) else {
                        continue;
                    };
                    let source_spdx = inst
                        .value
                        .get("license")
                        .and_then(|l| l.get("spdx"))
                        .and_then(Value::as_str);
                    if inst
                        .value
                        .get("access")
                        .and_then(|a| a.get("mode"))
                        .and_then(Value::as_str)
                        == Some("reference-only")
                    {
                        continue;
                    }
                    let Some(lost) = dropped_obligations(source_spdx, Some(declared)) else {
                        continue;
                    };
                    diags.push(Diagnostic::new(
                        &manifest.1.file,
                        "/license/content_license",
                        "license_less_permissive_than_source",
                        format!(
                            "pack content_license {declared:?} drops {lost} imposed by cited source {src_id:?} ({}); the derived work has to carry those terms",
                            source_spdx.unwrap_or("?")
                        ),
                        Severity::Info,
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
    ///
    /// Learner-visible transliteration content is part of this gate:
    /// `reading_transliteration_not_latin` rejects a `transliteration_system`
    /// reading whose text carries kana or an ASCII digit (measured ja-JP
    /// defect class: "kentoう", "ronso2", "jiゅnり"); `romaji_contains_kana`
    /// rejects kana inside a sentence's `romaji` field (digits stay legal
    /// there — sentence texts legitimately contain Arabic numerals); and
    /// `form_script_mismatch` tightens the hiragana/katakana label check —
    /// the union-block check below cannot tell マナー from まなぶ, while
    /// U+30FC (prolonged sound mark) and U+30FB (middot) stay neutral and a
    /// genuinely mixed word (エコくるま) keeps its label, because no single
    /// script label describes it.
    pub fn audit_lexicon(&self) -> Vec<Diagnostic> {
        let mut diags = Vec::new();
        for inst in self
            .instances
            .iter()
            .filter(|i| i.schema == "lexicon-entry")
        {
            let id = inst.value.get("id").and_then(Value::as_str).unwrap_or("?");
            // The script-tagged readings are the pack's declared
            // pronunciations: they anchor the form check below and name,
            // in the messages, what a transliteration is supposed to spell.
            let declared_reading: Vec<&str> = inst
                .value
                .get("readings")
                .and_then(Value::as_array)
                .map(|a| {
                    a.iter()
                        .filter(|r| {
                            matches!(
                                r.get("script").and_then(Value::as_str),
                                Some("cyrillic") | Some("hiragana") | Some("katakana")
                            )
                        })
                        .filter_map(|r| r.get("text").and_then(Value::as_str))
                        .collect()
                })
                .unwrap_or_default();
            let target_reading = !declared_reading.is_empty();
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
                    // A hiragana/katakana label has to be outright wrong, not
                    // merely incomplete: the union-block check above lets a
                    // katakana word pass under "hiragana", so flag a label only
                    // when its text carries no kana of the labelled script at
                    // all. Mixed-script words (エコくるま, はんばーガー) contain
                    // both blocks and have no single correct label, so they are
                    // left alone rather than flagged unfixably. U+30FC, U+30FB
                    // and space are script-neutral, so まーけっと stays clean.
                    let has_hira = text.chars().any(|c| ('\u{3041}'..='\u{309f}').contains(&c));
                    let has_kata = text.chars().any(|c| {
                        ('\u{30a1}'..='\u{30fa}').contains(&c)
                            || ('\u{30fd}'..='\u{30fe}').contains(&c)
                    });
                    if script == "hiragana" && !has_hira {
                        if let Some(ch) = text.chars().find(|c| {
                            ('\u{30a1}'..='\u{30fa}').contains(c)
                                || ('\u{30fd}'..='\u{30fe}').contains(c)
                        }) {
                            diags.push(Diagnostic::new(
                                &inst.file,
                                pointer.clone(),
                                "form_script_mismatch",
                                format!(
                                    "entry {text:?} of item {id:?} is labelled \
                                     \"hiragana\" but contains katakana {ch:?} \
                                     (U+{:04X}); label it katakana",
                                    ch as u32
                                ),
                                Severity::Error,
                            ));
                        }
                    }
                    if script == "katakana" && !has_kata {
                        if let Some(ch) =
                            text.chars().find(|c| ('\u{3041}'..='\u{309f}').contains(c))
                        {
                            diags.push(Diagnostic::new(
                                &inst.file,
                                pointer.clone(),
                                "form_script_mismatch",
                                format!(
                                    "entry {text:?} of item {id:?} is labelled \
                                     \"katakana\" but contains hiragana {ch:?} \
                                     (U+{:04X}); label it hiragana",
                                    ch as u32
                                ),
                                Severity::Error,
                            ));
                        }
                    }
                    // A transliteration reading is learner-visible romaji
                    // scaffold, not a pronunciation: it may not carry kana
                    // or digits ("kentoう", "ronso2"). Letters, space,
                    // hyphen, apostrophe, period and non-kana punctuation
                    // are allowed; the declared kana reading is quoted so
                    // a human sees what the romaji was supposed to spell.
                    if field == "readings" && item.get("transliteration_system").is_some() {
                        if let Some(ch) = text
                            .chars()
                            .find(|c| ('\u{3040}'..='\u{30ff}').contains(c) || c.is_ascii_digit())
                        {
                            diags.push(Diagnostic::new(
                                &inst.file,
                                pointer.clone(),
                                "reading_transliteration_not_latin",
                                format!(
                                    "transliteration {text:?} of item {id:?} contains \
                                     {ch:?} (U+{:04X}); the declared kana reading is \
                                     {declared_reading:?} — write the romaji in Latin \
                                     letters, no kana and no digits",
                                    ch as u32
                                ),
                                Severity::Error,
                            ));
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
        // Sentence `romaji` is learner-visible too, and carries the same
        // kana contamination. Digits stay legal: some sentence texts
        // legitimately contain Arabic numerals ("3-nen shokumu keiken ga
        // arimasu." is correct romaji).
        for inst in self
            .instances
            .iter()
            .filter(|i| i.schema == "sentence" && i.value.get("romaji").is_some())
        {
            let Some(romaji) = inst.value.get("romaji").and_then(Value::as_str) else {
                continue;
            };
            let id = inst.value.get("id").and_then(Value::as_str).unwrap_or("?");
            if let Some(ch) = romaji
                .chars()
                .find(|c| ('\u{3040}'..='\u{30ff}').contains(c))
            {
                diags.push(Diagnostic::new(
                    &inst.file,
                    format!("{}/romaji", inst.pointer),
                    "romaji_contains_kana",
                    format!(
                        "romaji {romaji:?} of sentence {id:?} contains {ch:?} \
                         (U+{:04X}); romaji must contain no kana (digits are allowed)",
                        ch as u32
                    ),
                    Severity::Error,
                ));
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
    ///
    /// The manifest is also tied to the pack's own content items (K-65): when
    /// an item declares a speakable reading, its `model-output` audio row must
    /// record exactly that reading as `text` — audio has to be synthesized
    /// FROM the declared reading, never from the written form or a romaji
    /// transliteration. A row whose text is not the declared reading is the
    /// error `media_text_not_declared_reading` in every mode, because the
    /// manifest would otherwise promise the listener pronunciation the pack
    /// has no evidence for. Items that declare no reading at all are counted
    /// in an aggregated `media_item_without_reading` info: their audio can
    /// only be the written form, and authoring readings is human work.
    ///
    /// Coverage (K-90, ADR-0024): once the media directory is built, every
    /// addressable content item needs a row — with runtime synthesis removed
    /// from the app a missing row is permanent silence, so a built/partially
    /// built manifest that fails to cover an item is the aggregated error
    /// `media_asset_missing` in every mode, and a pack with addressable items
    /// but no media manifest at all is `media_manifest_absent` (an error in
    /// install mode, info in a source checkout).
    pub fn audit_media(&self, require_present: bool) -> Vec<Diagnostic> {
        let mut diags: Vec<Diagnostic> = Vec::new();
        let rows: Vec<&crate::pack::Instance> = self
            .instances
            .iter()
            .filter(|i| i.schema == "media-asset")
            .collect();
        // Content items the desktop resolver can address for audio — the SAME
        // enumeration scripts/generate-pack-audio.py targets() bakes (every
        // sentence, every contrast item as `{contrast-id}-{index}`, every
        // lexicon entry). Keep the two in lockstep: a divergence means the
        // coverage guard below stops matching what learners can actually play.
        // Speakable readings are script-tagged (`reading` fields; lexicon
        // `readings[]` entries with `script`); `transliteration_system`
        // entries are romanization scaffolds, never TTS input.
        let mut spoken: HashMap<String, Vec<String>> = HashMap::new();
        for inst in &self.instances {
            match inst.schema {
                "sentence" => {
                    if let Some(id) = inst.value.get("id").and_then(Value::as_str) {
                        let reading = inst.value.get("reading").and_then(Value::as_str);
                        spoken.insert(
                            id.to_string(),
                            reading.map(str::to_string).into_iter().collect(),
                        );
                    }
                }
                "phonology-contrast" => {
                    if let Some(cid) = inst.value.get("id").and_then(Value::as_str) {
                        if let Some(items) = inst.value.get("items").and_then(Value::as_array) {
                            for (i, item) in items.iter().enumerate() {
                                let reading = item.get("reading").and_then(Value::as_str);
                                spoken.insert(
                                    format!("{cid}-{i}"),
                                    reading.map(str::to_string).into_iter().collect(),
                                );
                            }
                        }
                    }
                }
                "lexicon-entry" => {
                    if let Some(id) = inst.value.get("id").and_then(Value::as_str) {
                        let readings: Vec<String> = inst
                            .value
                            .get("readings")
                            .and_then(Value::as_array)
                            .map(|a| {
                                a.iter()
                                    .filter(|r| r.get("script").is_some())
                                    .filter_map(|r| r.get("text").and_then(Value::as_str))
                                    .map(str::to_string)
                                    .collect()
                            })
                            .unwrap_or_default();
                        spoken.insert(id.to_string(), readings);
                    }
                }
                _ => {}
            }
        }
        if rows.is_empty() {
            if !spoken.is_empty() {
                diags.push(Diagnostic::new(
                    "media/manifest.jsonl",
                    String::new(),
                    "media_manifest_absent",
                    format!(
                        "the pack declares {} audio-addressable item(s) (sentences, contrast \
                         items, lexicon entries) but has no media/manifest.jsonl: nothing \
                         synthesizes at read time anymore (ADR-0024), so every listening \
                         feature on this pack would be silent; bake audio with \
                         scripts/generate-pack-audio.py (ADR-0016, ADR-0023)",
                        spoken.len()
                    ),
                    if require_present {
                        Severity::Error
                    } else {
                        Severity::Info
                    },
                ));
            }
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
        // Coverage (K-90/ADR-0024): with runtime synthesis deleted from the
        // app, a missing manifest row is no longer papered over at read time —
        // it is permanent silence. A built or partially built media directory
        // must cover EVERY addressable content item; the unbuilt posture above
        // already speaks for a checkout where nothing is generated yet.
        if !unbuilt {
            let covered: HashSet<String> = rows
                .iter()
                .filter_map(|r| r.value.get("id").and_then(Value::as_str))
                .map(str::to_string)
                .collect();
            let mut missing: Vec<&String> =
                spoken.keys().filter(|id| !covered.contains(*id)).collect();
            missing.sort();
            if !missing.is_empty() {
                let shown = missing
                    .iter()
                    .take(8)
                    .map(|s: &&String| s.as_str())
                    .collect::<Vec<_>>()
                    .join(", ");
                diags.push(Diagnostic::new(
                    "media/manifest.jsonl",
                    String::new(),
                    "media_asset_missing",
                    format!(
                        "{} audio-addressable item(s) have no media manifest row, so the app \
                         has no audio to play for them and nothing synthesizes at read time \
                         (ADR-0024): {shown}{}; regenerate with scripts/generate-pack-audio.py",
                        missing.len(),
                        if missing.len() > 8 {
                            " (first 8 shown)"
                        } else {
                            ""
                        }
                    ),
                    Severity::Error,
                ));
            }
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
        // Audio↔reading tie (K-65): the learner heard the greeting as
        // "konichi ha" because the generator fed the engine an input form the
        // pinned Kokoro cannot speak as Japanese (romaji input is spelled out
        // letter by letter — measured 2026-10-08, see
        // docs/provenance/ja-jp-greeting-audio-k65.md). The rule that keeps
        // that from shipping: if the item declares a speakable reading, the
        // synthesized row's recorded `text` must be that reading.
        // Speakable readings are script-tagged (`reading` fields; lexicon
        // `readings[]` entries with `script`); `transliteration_system`
        // entries are romanization scaffolds, never TTS input.
        let mut without_reading: Vec<String> = Vec::new();
        for row in &rows {
            if row.value.get("provenance").and_then(Value::as_str) != Some("model-output") {
                continue;
            }
            let Some(id) = row.value.get("id").and_then(Value::as_str) else {
                continue;
            };
            let readings = match spoken.get(id) {
                Some(r) if r.is_empty() => {
                    without_reading.push(id.to_string());
                    continue;
                }
                Some(r) => r,
                None => continue, // row ids with no content item cannot be judged
            };
            let fed = row.value.get("text").and_then(Value::as_str);
            if !fed.is_some_and(|t| readings.iter().any(|r| r == t)) {
                diags.push(Diagnostic::new(
                    &row.file,
                    format!("{}/text", row.pointer),
                    "media_text_not_declared_reading",
                    format!(
                        "{id} ships synthesized audio whose recorded text is {fed:?}, but the \
                         item declares reading(s) {readings:?}: the generator must feed the \
                         declared reading and the manifest must record exactly what was fed \
                         (regenerate with scripts/generate-pack-audio.py, K-65)"
                    ),
                    Severity::Error,
                ));
            }
        }
        if !without_reading.is_empty() {
            let shown = without_reading
                .iter()
                .take(8)
                .cloned()
                .collect::<Vec<_>>()
                .join(", ");
            diags.push(Diagnostic::new(
                "media/manifest.jsonl",
                String::new(),
                "media_item_without_reading",
                format!(
                    "{} model-output asset(s) belong to items that declare no reading, so their \
                     audio can only be the written form and cannot be checked against a declared \
                     reading: {shown}{}; authoring readings is human linguistic work and stays a \
                     review-pending record (K-65)",
                    without_reading.len(),
                    if without_reading.len() > 8 {
                        " (first 8 shown)"
                    } else {
                        ""
                    }
                ),
                Severity::Info,
            ));
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
