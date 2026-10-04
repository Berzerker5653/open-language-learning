//! Pack loading and validation.

use crate::diagnose::{Diagnostic, Severity};
use crate::layout::{self, DocShape};
use crate::schema::SchemaSet;
use jsonschema::Validator;
use lts_domain::{ContentId, EngineCompat};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Validation posture. Scaffold accepts draft state (unresolved references
/// as warnings); install additionally enforces promotion gates.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Mode {
    Scaffold,
    Install,
}

#[derive(Clone, Debug)]
pub struct Instance {
    pub file: String,
    pub schema: &'static str,
    /// JSON pointer prefix of this instance within its file.
    pub pointer: String,
    pub value: Value,
    /// True when validated against the 0.2 contract.
    pub v2: bool,
}

pub struct Pack {
    root: PathBuf,
    version: String,
    pub(crate) instances: Vec<Instance>,
    /// Parsed documents without a schema (0.1 structural files).
    pub(crate) structural: Vec<(String, Value)>,
    /// Binary media assets (validated as present, never parsed as text).
    pub(crate) media: Vec<String>,
    unknown_files: Vec<String>,
    parse_errors: Vec<(String, String)>,
    pub(crate) manifest: Option<Value>,
}

impl Pack {
    /// Loaded schema-validated instances (audit/analysis consumers).
    pub fn instances(&self) -> &[Instance] {
        &self.instances
    }

    /// Parsed structural (non-schema) documents by relative path.
    pub fn structural_docs(&self) -> &[(String, Value)] {
        &self.structural
    }

    /// Relative paths of binary media assets.
    pub fn media_files(&self) -> &[String] {
        &self.media
    }

    /// Load every classified document under `root`. Parse failures are
    /// collected, not fatal, so one bad file does not hide the rest.
    pub fn load_dir(root: &Path) -> Result<Pack, io::Error> {
        // The manifest selects the contract before we classify anything.
        let version = fs::read_to_string(root.join("manifest.yaml"))
            .or_else(|_| fs::read_to_string(root.join("manifest.yml")))
            .ok()
            .and_then(|text| parse_document("manifest.yaml", &text).ok())
            .and_then(|m| {
                m.get("schema_version")
                    .and_then(Value::as_str)
                    .map(str::to_owned)
            })
            .unwrap_or_else(|| "0.2".to_string());
        let v1 = version == "0.1";

        let mut pack = Pack {
            root: root.to_path_buf(),
            version,
            instances: Vec::new(),
            structural: Vec::new(),
            media: Vec::new(),
            unknown_files: Vec::new(),
            parse_errors: Vec::new(),
            manifest: None,
        };
        let mut files = Vec::new();
        collect_files(root, root, &mut files)?;
        files.sort();
        for rel in files {
            let classified = if v1 {
                layout::classify_v1(&rel)
            } else {
                layout::classify(&rel)
            };
            let Some(classified) = classified else {
                if !layout::is_documentation(&rel) {
                    pack.unknown_files.push(rel);
                }
                continue;
            };
            if rel.starts_with("media/") {
                let meta = fs::metadata(root.join(&rel))?;
                if meta.len() == 0 {
                    pack.parse_errors.push((rel, "empty media asset".into()));
                } else {
                    pack.media.push(rel);
                }
                continue;
            }
            let text = fs::read_to_string(root.join(&rel))?;
            let schema = classified.schema;
            match classified.shape {
                DocShape::Single => match parse_document(&rel, &text) {
                    Ok(value) => match schema {
                        Some(schema) => pack.instances.push(Instance {
                            file: rel,
                            schema,
                            pointer: String::new(),
                            value,
                            v2: !v1,
                        }),
                        None => pack.structural.push((rel, value)),
                    },
                    Err(msg) => pack.parse_errors.push((rel, msg)),
                },
                DocShape::ArrayField(field) => match parse_document(&rel, &text) {
                    Ok(doc) => {
                        if let Some(items) = doc.get(field).and_then(Value::as_array) {
                            for (i, item) in items.iter().enumerate() {
                                pack.instances.push(Instance {
                                    file: rel.clone(),
                                    schema: schema.unwrap(),
                                    pointer: format!("/{field}/{i}"),
                                    value: item.clone(),
                                    v2: !v1,
                                });
                            }
                        } else {
                            pack.parse_errors.push((
                                rel,
                                format!("document must be an object with a `{field}` array"),
                            ));
                        }
                    }
                    Err(msg) => pack.parse_errors.push((rel, msg)),
                },
                DocShape::ArrayRoot => match parse_document(&rel, &text) {
                    Ok(doc) => {
                        if let Some(items) = doc.as_array() {
                            for (i, item) in items.iter().enumerate() {
                                pack.instances.push(Instance {
                                    file: rel.clone(),
                                    schema: schema.unwrap(),
                                    pointer: format!("/{i}"),
                                    value: item.clone(),
                                    v2: !v1,
                                });
                            }
                        } else {
                            pack.parse_errors
                                .push((rel, "document must be a top-level array".into()));
                        }
                    }
                    Err(msg) => pack.parse_errors.push((rel, msg)),
                },
                DocShape::Jsonl => {
                    for (line, text) in text.lines().enumerate() {
                        if text.trim().is_empty() {
                            continue;
                        }
                        match serde_json::from_str::<Value>(text) {
                            Ok(value) => pack.instances.push(Instance {
                                file: rel.clone(),
                                schema: schema.unwrap(),
                                pointer: format!("/{line}"),
                                value,
                                v2: !v1,
                            }),
                            Err(e) => pack
                                .parse_errors
                                .push((rel.clone(), format!("line {}: {e}", line + 1))),
                        }
                    }
                }
            }
        }
        pack.manifest = pack
            .instances
            .iter()
            .find(|i| i.schema == "language-pack-manifest")
            .map(|i| i.value.clone());
        Ok(pack)
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn schema_version(&self) -> &str {
        &self.version
    }

    /// Run schema + semantic checks. Diagnostics are sorted by file.
    pub fn validate(&self, mode: Mode, engine_version: Option<&str>) -> Vec<Diagnostic> {
        let v2 = self.version != "0.1";
        let schemas = match SchemaSet::load() {
            Ok(s) => s,
            Err(e) => return vec![Diagnostic::new("", "", "internal", e, Severity::Error)],
        };
        let mut validators: HashMap<(&'static str, bool), Result<Validator, String>> =
            HashMap::new();
        let mut diags: Vec<Diagnostic> = Vec::new();

        for (file, msg) in &self.parse_errors {
            diags.push(Diagnostic::new(
                file,
                "",
                "parse_error",
                msg.clone(),
                Severity::Error,
            ));
        }
        for file in &self.unknown_files {
            diags.push(Diagnostic::new(
                file,
                "",
                "unknown_file",
                format!(
                    "path is not part of the {ver} pack layout contract (see schemas/README.md)",
                    ver = if v2 { "0.2" } else { "0.1" }
                ),
                Severity::Warning,
            ));
        }
        if self.manifest.is_none() {
            diags.push(Diagnostic::new(
                "manifest.yaml",
                "",
                "manifest_missing",
                "pack root must contain manifest.yaml",
                Severity::Error,
            ));
        }

        // --- schema validation ---
        for inst in &self.instances {
            let entry = validators
                .entry((inst.schema, inst.v2))
                .or_insert_with(|| schemas.validator(inst.schema, inst.v2));
            match entry {
                Ok(validator) => {
                    for err in validator.iter_errors(&inst.value) {
                        let path = format!("{}{}", inst.pointer, err.instance_path());
                        diags.push(Diagnostic::new(
                            &inst.file,
                            path,
                            "schema",
                            err.to_string(),
                            Severity::Error,
                        ));
                    }
                }
                Err(e) => diags.push(Diagnostic::new(
                    &inst.file,
                    "",
                    "internal",
                    e.clone(),
                    Severity::Error,
                )),
            }
        }

        // --- ID collection ---
        // `checked`: namespaced content ids (grammar/locale/duplicate).
        // `defined`: every id seen anywhere, for reference resolution.
        let mut checked: HashMap<String, (String, String)> = HashMap::new();
        let mut defined: HashSet<String> = HashSet::new();
        let target_locale = self
            .manifest
            .as_ref()
            .and_then(|m| m.get("target_locale"))
            .and_then(Value::as_str)
            .unwrap_or("");
        let locale_primary = target_locale
            .split('-')
            .next()
            .unwrap_or("")
            .to_ascii_lowercase();

        for inst in &self.instances {
            let content = matches!(
                inst.schema,
                "goal"
                    | "assessment"
                    | "orthography-unit"
                    | "phonology-contrast"
                    | "concept"
                    | "lexical-entry"
                    | "unit"
                    | "scenario"
            );
            if let Some(id) = inst.value.get("id").and_then(Value::as_str) {
                defined.insert(id.to_string());
                if content {
                    register(&mut checked, id, &inst.file, &inst.pointer, &mut diags);
                }
            }
            match inst.schema {
                "unit" => {
                    for (i, act) in array(&inst.value, "activities") {
                        if let Some(id) = act.get("id").and_then(Value::as_str) {
                            defined.insert(id.to_string());
                            if v2 {
                                register(
                                    &mut checked,
                                    id,
                                    &inst.file,
                                    &format!("{}/activities/{}", inst.pointer, i),
                                    &mut diags,
                                );
                            }
                        }
                    }
                }
                "scenario" => {
                    for (i, node) in array(&inst.value, "nodes") {
                        if let Some(id) = node.get("id").and_then(Value::as_str) {
                            defined.insert(id.to_string());
                            if v2 {
                                register(
                                    &mut checked,
                                    id,
                                    &inst.file,
                                    &format!("{}/nodes/{}", inst.pointer, i),
                                    &mut diags,
                                );
                            }
                        }
                    }
                }
                "orthography" => {
                    for (i, s) in array(&inst.value, "scripts") {
                        if let Some(id) = s.get("id").and_then(Value::as_str) {
                            defined.insert(id.to_string());
                            if v2 {
                                register(
                                    &mut checked,
                                    id,
                                    &inst.file,
                                    &format!("{}/scripts/{}", inst.pointer, i),
                                    &mut diags,
                                );
                            }
                        }
                    }
                }
                "phonology" => {
                    for field in ["phonotactics", "prosody"] {
                        for (i, f) in array(&inst.value, field) {
                            if let Some(id) = f.get("id").and_then(Value::as_str) {
                                defined.insert(id.to_string());
                                if v2 {
                                    register(
                                        &mut checked,
                                        id,
                                        &inst.file,
                                        &format!("{}/{}/{}", inst.pointer, field, i),
                                        &mut diags,
                                    );
                                }
                            }
                        }
                    }
                }
                "pragmatics" => {
                    for field in ["registers", "situations"] {
                        for (i, f) in array(&inst.value, field) {
                            if let Some(id) = f.get("id").and_then(Value::as_str) {
                                defined.insert(id.to_string());
                                if v2 {
                                    register(
                                        &mut checked,
                                        id,
                                        &inst.file,
                                        &format!("{}/{}/{}", inst.pointer, field, i),
                                        &mut diags,
                                    );
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        // 0.1 structural files contribute defined ids (scenarios,
        // situations, registers, scripts, license entries) without
        // grammar checks on local names.
        for (file, doc) in &self.structural {
            collect_ids(doc, &mut Vec::new(), &mut |path, id| {
                defined.insert(id.to_string());
                if id.contains('.') {
                    register(&mut checked, id, file, path, &mut diags);
                }
            });
        }

        // ID grammar + locale consistency for namespaced content ids.
        for (id, (file, pointer)) in &checked {
            match ContentId::parse(id) {
                Ok(_) => {
                    let first = id.split('.').next().unwrap_or("");
                    if !locale_primary.is_empty() && first != locale_primary {
                        diags.push(Diagnostic::new(
                            file,
                            pointer,
                            "locale_mismatch",
                            format!("content id {id:?} starts with {first:?} but the pack target_locale primary subtag is {locale_primary:?}"),
                            Severity::Error,
                        ));
                    }
                }
                Err(e) => diags.push(Diagnostic::new(
                    file,
                    pointer,
                    "id_grammar",
                    format!("content id {id:?} is invalid: {e}"),
                    Severity::Error,
                )),
            }
        }

        // --- declared unresolved references (manifest) ---
        let mut declared_unresolved: HashSet<String> = HashSet::new();
        if let Some(manifest) = &self.manifest {
            for (i, entry) in array(manifest, "unresolved_references") {
                let target = entry.get("target_id").and_then(Value::as_str).unwrap_or("");
                let owner = entry.get("owner_id").and_then(Value::as_str).unwrap_or("");
                let ptr = format!("/unresolved_references/{i}");
                if !target.is_empty() {
                    declared_unresolved.insert(target.to_string());
                    if mode == Mode::Install {
                        diags.push(Diagnostic::new(
                            "manifest.yaml",
                            &ptr,
                            "declared_unresolved_reference",
                            format!("declared unresolved reference to {target:?} blocks install/promotion"),
                            Severity::Error,
                        ));
                    } else {
                        diags.push(Diagnostic::new(
                            "manifest.yaml",
                            &ptr,
                            "declared_unresolved_reference",
                            format!("draft pack declares unresolved reference to {target:?}; scaffold-only"),
                            Severity::Info,
                        ));
                    }
                }
                if !owner.is_empty() && !defined.contains(owner) {
                    diags.push(Diagnostic::new(
                        "manifest.yaml",
                        &ptr,
                        "unresolved_reference",
                        format!(
                            "unresolved_references owner {owner:?} is not defined in this pack"
                        ),
                        Severity::Error,
                    ));
                }
            }
        }

        // --- reference resolution ---
        let ref_severity = if mode == Mode::Install {
            Severity::Error
        } else {
            Severity::Warning
        };
        for inst in &self.instances {
            for (pointer, target, field) in references(inst.schema, v2, &inst.value) {
                let pointer = format!("{}{pointer}", inst.pointer);
                if defined.contains(&target) {
                    continue;
                }
                if declared_unresolved.contains(&target) {
                    continue; // already reported above
                }
                diags.push(Diagnostic::new(
                    &inst.file,
                    pointer,
                    "unresolved_reference",
                    format!("{field} references {target:?}, which is not defined in this pack and not declared in manifest.unresolved_references"),
                    ref_severity,
                ));
            }
        }
        for (file, doc) in &self.structural {
            for (pointer, target, field) in structural_references(doc) {
                if defined.contains(&target) || declared_unresolved.contains(&target) {
                    continue;
                }
                diags.push(Diagnostic::new(
                    file,
                    pointer,
                    "unresolved_reference",
                    format!("{field} references {target:?}, which is not defined in this pack and not declared in manifest.unresolved_references"),
                    ref_severity,
                ));
            }
        }

        // --- cross-file curriculum graph (PACK-002) ---
        let graph = crate::graph::build(&self.instances, &self.structural, v2);
        diags.extend(crate::graph::check(&graph));

        // --- migrated prerequisites need human review ---
        if v2 {
            for inst in &self.instances {
                if inst.schema != "goal" {
                    continue;
                }
                for (i, prereq) in array(&inst.value, "prerequisites") {
                    if prereq.get("migrated_from").is_some() {
                        diags.push(Diagnostic::new(
                            &inst.file,
                            format!("{}/prerequisites/{}", inst.pointer, i),
                            "migrated_prerequisite",
                            "prerequisite was auto-migrated from a bare 0.1 id; its dimension/state defaults require human review",
                            Severity::Warning,
                        ));
                    }
                }
            }
        }

        // --- engine compatibility ---
        if let Some(manifest) = &self.manifest {
            if let Some(engine) = manifest.get("engine") {
                let min = engine.get("min_version").and_then(Value::as_str);
                let max = engine.get("max_version_exclusive").and_then(Value::as_str);
                if let (Some(min), Some(max)) = (min, max) {
                    let min_v = semver::Version::parse(min);
                    let max_v = semver::Version::parse(max);
                    if let (Ok(min_v), Ok(max_v)) = (min_v, max_v) {
                        if min_v >= max_v {
                            diags.push(Diagnostic::new(
                                "manifest.yaml",
                                "/engine",
                                "engine_range",
                                format!("engine.min_version {min:?} must be lower than engine.max_version_exclusive {max:?}"),
                                Severity::Error,
                            ));
                        }
                    }
                }
                if let Some(engine_version) = engine_version {
                    if let Some(req) = compat_requirement(min, max) {
                        match EngineCompat::parse(&req) {
                            Ok(compat) => {
                                if let Ok(v) = semver::Version::parse(engine_version) {
                                    if !compat.matches(&v) {
                                        diags.push(Diagnostic::new(
                                            "manifest.yaml",
                                            "/engine",
                                            "engine_incompatible",
                                            format!("engine {engine_version:?} does not satisfy pack compatibility {req:?}"),
                                            Severity::Error,
                                        ));
                                    }
                                }
                            }
                            Err(e) => diags.push(Diagnostic::new(
                                "manifest.yaml",
                                "/engine",
                                "engine_range",
                                e.to_string(),
                                Severity::Error,
                            )),
                        }
                    }
                }
            }

            // --- manifest scripts vs orthography (0.2 only; 0.1 used
            // display names, a known legacy quirk) ---
            if v2 {
                for (i, script) in array(manifest, "scripts") {
                    let Some(script) = script.as_str() else {
                        continue;
                    };
                    if !defined.contains(script) {
                        diags.push(Diagnostic::new(
                            "manifest.yaml",
                            format!("/scripts/{i}"),
                            "script_unknown",
                            format!("manifest scripts entry {script:?} must be a script id declared in language/orthography.yaml"),
                            Severity::Error,
                        ));
                    }
                }
            }
        }

        // --- install-mode promotion gates ---
        if mode == Mode::Install {
            if let Some(manifest) = &self.manifest {
                let allowed = manifest
                    .get("license")
                    .and_then(|l| l.get("redistribution_allowed"))
                    .and_then(Value::as_bool)
                    .unwrap_or(false);
                if !allowed {
                    diags.push(Diagnostic::new(
                        "manifest.yaml",
                        "/license",
                        "redistribution_blocked",
                        "manifest.license.redistribution_allowed must be true for install; resolve the license inventory first (LIC-001)",
                        Severity::Error,
                    ));
                }
            }
            let licenses: Vec<&Instance> = self
                .instances
                .iter()
                .filter(|i| i.schema == "license-inventory")
                .collect();
            if licenses.is_empty() {
                diags.push(Diagnostic::new(
                    "licenses.jsonl",
                    "",
                    "license_inventory_missing",
                    "install requires a non-empty licenses.jsonl (0.1 packs must migrate first)",
                    Severity::Error,
                ));
            }
            for inst in &self.instances {
                if inst.schema == "license-inventory" {
                    if inst
                        .value
                        .get("redistribution_allowed")
                        .and_then(Value::as_bool)
                        == Some(false)
                    {
                        diags.push(Diagnostic::new(
                            &inst.file,
                            inst.pointer.clone(),
                            "license_redistribution_blocked",
                            format!("inventory entry {:?} forbids redistribution; install is blocked until resolved", inst.value.get("id").and_then(Value::as_str).unwrap_or("?")),
                            Severity::Error,
                        ));
                    }
                    if inst
                        .value
                        .get("license")
                        .and_then(|l| l.get("pending"))
                        .and_then(Value::as_bool)
                        == Some(true)
                    {
                        diags.push(Diagnostic::new(
                            &inst.file,
                            format!("{}/license", inst.pointer),
                            "license_pending",
                            "license selection is pending (owner decision LIC-001); install is blocked",
                            Severity::Error,
                        ));
                    }
                }
            }
            if !self.instances.iter().any(|i| i.schema == "source-entry") {
                diags.push(Diagnostic::new(
                    "sources.jsonl",
                    "",
                    "sources_missing",
                    "install requires provenance sources in sources.jsonl",
                    Severity::Error,
                ));
            }
        }

        diags.sort_by(|a, b| {
            a.file
                .cmp(&b.file)
                .then(a.path.cmp(&b.path))
                .then(a.code.cmp(&b.code))
        });
        diags
    }
}

fn compat_requirement(min: Option<&str>, max: Option<&str>) -> Option<String> {
    match (min, max) {
        (Some(min), Some(max)) => Some(format!(">= {min}, < {max}")),
        (Some(min), None) => Some(format!(">= {min}")),
        _ => None,
    }
}

fn register(
    map: &mut HashMap<String, (String, String)>,
    id: &str,
    file: &str,
    pointer: &str,
    diags: &mut Vec<Diagnostic>,
) {
    if let Some((prev_file, prev_ptr)) =
        map.insert(id.to_string(), (file.to_string(), pointer.to_string()))
    {
        diags.push(Diagnostic::new(
            file,
            pointer,
            "duplicate_id",
            format!("id {id:?} is already defined at {prev_file}{prev_ptr}"),
            Severity::Error,
        ));
    }
}

fn array<'a>(value: &'a Value, field: &str) -> Vec<(usize, &'a Value)> {
    value
        .get(field)
        .and_then(Value::as_array)
        .map(|items| items.iter().enumerate().collect())
        .unwrap_or_default()
}

/// Walk a JSON document collecting every string `id` field with its path.
fn collect_ids(doc: &Value, path: &mut Vec<String>, visit: &mut dyn FnMut(&str, &str)) {
    match doc {
        Value::Object(map) => {
            for (key, value) in map {
                if key == "id" {
                    if let Value::String(id) = value {
                        let joined = path.join("/");
                        visit(&joined, id);
                    }
                } else {
                    path.push(key.clone());
                    collect_ids(value, path, visit);
                    path.pop();
                }
            }
        }
        Value::Array(items) => {
            for (i, item) in items.iter().enumerate() {
                path.push(i.to_string());
                collect_ids(item, path, visit);
                path.pop();
            }
        }
        _ => {}
    }
}

/// References inside 0.1 structural documents (scenarios reference goals).
fn structural_references(doc: &Value) -> Vec<(String, String, &'static str)> {
    let mut out = Vec::new();
    if let Some(id) = doc.get("id").and_then(Value::as_str) {
        let _ = id; // scenario identity already collected
    }
    for (i, t) in array(doc, "target_goal_ids") {
        if let Value::String(s) = t {
            out.push((
                format!("/target_goal_ids/{i}"),
                s.clone(),
                "target_goal_ids",
            ));
        }
    }
    out
}

/// Reference fields per schema kind: (pointer, target, field-name).
pub(crate) fn references(
    schema: &str,
    v2: bool,
    value: &Value,
) -> Vec<(String, String, &'static str)> {
    let mut out = Vec::new();
    let mut c = RefCollector { out: &mut out };
    c.collect(schema, v2, value);
    out
}

struct RefCollector<'a> {
    out: &'a mut Vec<(String, String, &'static str)>,
}

impl RefCollector<'_> {
    fn push(&mut self, pointer: String, target: Option<&Value>, field: &'static str) {
        if let Some(Value::String(s)) = target {
            self.out.push((pointer, s.clone(), field));
        }
    }

    fn push_array(&mut self, base: String, items: Option<&Vec<Value>>, field: &'static str) {
        if let Some(items) = items {
            for (i, item) in items.iter().enumerate() {
                if let Value::String(s) = item {
                    self.out.push((format!("{base}/{i}"), s.clone(), field));
                }
            }
        }
    }

    fn collect(&mut self, schema: &str, v2: bool, value: &Value) {
        match schema {
            "goal" => {
                if v2 {
                    for (i, p) in array(value, "prerequisites") {
                        self.push(
                            format!("/prerequisites/{i}/target"),
                            p.get("target"),
                            "prerequisite target",
                        );
                    }
                } else {
                    self.push_array(
                        "/prerequisites".into(),
                        value.get("prerequisites").and_then(Value::as_array),
                        "prerequisites",
                    );
                }
                self.push_array(
                    "/assessment_ids".into(),
                    value.get("assessment_ids").and_then(Value::as_array),
                    "assessment_ids",
                );
                self.push_array(
                    "/required_concepts".into(),
                    value.get("required_concepts").and_then(Value::as_array),
                    "required_concepts",
                );
                self.push_array(
                    "/contexts".into(),
                    value.get("contexts").and_then(Value::as_array),
                    "contexts",
                );
                self.push_array(
                    "/sources".into(),
                    value.get("sources").and_then(Value::as_array),
                    "sources",
                );
            }
            "unit" => {
                if v2 {
                    self.push("/goal_id".into(), value.get("goal_id"), "goal_id");
                } else {
                    self.push_array(
                        "/goal_ids".into(),
                        value.get("goal_ids").and_then(Value::as_array),
                        "goal_ids",
                    );
                }
                for (i, act) in array(value, "activities") {
                    self.push(
                        format!("/activities/{i}/scenario_id"),
                        act.get("scenario_id"),
                        "scenario_id",
                    );
                    self.push_array(
                        format!("/activities/{i}/content_refs"),
                        act.get("content_refs").and_then(Value::as_array),
                        "content_refs",
                    );
                    self.push_array(
                        format!("/activities/{i}/concept_refs"),
                        act.get("concept_refs").and_then(Value::as_array),
                        "concept_refs",
                    );
                    if !v2 {
                        self.push_array(
                            format!("/activities/{i}/targets"),
                            act.get("targets").and_then(Value::as_array),
                            "targets",
                        );
                    }
                }
                self.push_array(
                    "/sources".into(),
                    value.get("sources").and_then(Value::as_array),
                    "sources",
                );
            }
            "scenario" => {
                self.push("/goal_id".into(), value.get("goal_id"), "goal_id");
                for (i, node) in array(value, "nodes") {
                    self.push_array(
                        format!("/nodes/{i}/next"),
                        node.get("next").and_then(Value::as_array),
                        "next",
                    );
                }
            }
            "assessment" => {
                self.push("/goal_id".into(), value.get("goal_id"), "goal_id");
                self.push(
                    "/speech_profile_id".into(),
                    value.get("speech_profile_id"),
                    "speech_profile_id",
                );
            }
            "lexicon-entry" => {
                self.push_array(
                    "/prerequisite_orthography".into(),
                    value
                        .get("prerequisite_orthography")
                        .and_then(Value::as_array),
                    "prerequisite_orthography",
                );
                self.push_array(
                    "/example_refs".into(),
                    value.get("example_refs").and_then(Value::as_array),
                    "example_refs",
                );
                self.push_array(
                    "/sources".into(),
                    value.get("sources").and_then(Value::as_array),
                    "sources",
                );
            }
            "concept" | "lexical-entry" => {
                self.push_array(
                    "/sources".into(),
                    value.get("sources").and_then(Value::as_array),
                    "sources",
                );
            }
            "license-inventory" => {
                if let Some(scope) = value.get("scope") {
                    self.push(
                        "/scope/source_id".into(),
                        scope.get("source_id"),
                        "scope.source_id",
                    );
                }
            }
            "review-record" => {
                self.push("/target_id".into(), value.get("target_id"), "target_id");
            }
            "speech-profile" => {
                for (i, f) in array(value, "features") {
                    self.push(
                        format!("/features/{i}/feature_id"),
                        f.get("feature_id"),
                        "feature_id",
                    );
                }
            }
            "phonology-contrast" => {
                self.push("/feature_id".into(), value.get("feature_id"), "feature_id");
            }
            "pragmatics" => {
                for (i, s) in array(value, "situations") {
                    self.push_array(
                        format!("/situations/{i}/typical_registers"),
                        s.get("typical_registers").and_then(Value::as_array),
                        "typical_registers",
                    );
                }
            }
            _ => {}
        }
    }
}

fn parse_document(rel: &str, text: &str) -> Result<Value, String> {
    if rel.ends_with(".json") {
        serde_json::from_str(text).map_err(|e| e.to_string())
    } else {
        let yaml: serde_yaml::Value = serde_yaml::from_str(text).map_err(|e| e.to_string())?;
        serde_json::to_value(&yaml)
            .map_err(|e| format!("non-JSON-compatible YAML mapping keys: {e}"))
    }
}

pub(crate) fn collect_files(
    root: &Path,
    dir: &Path,
    out: &mut Vec<String>,
) -> Result<(), io::Error> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            collect_files(root, &path, out)?;
        } else if let Ok(rel) = path.strip_prefix(root) {
            let rel = rel.to_string_lossy().replace('\\', "/");
            if !rel.is_empty() {
                out.push(rel);
            }
        }
    }
    Ok(())
}
