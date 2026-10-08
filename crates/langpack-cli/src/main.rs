//! `langpack` author CLI: init, validate, lint, test, audit-licenses,
//! audit-curriculum, audit-sources, audit-lexicon, build, catalog, inspect, install, rollback.

use clap::{Parser, Subcommand, ValueEnum};
use lts_langpack::archive;
use lts_langpack::{Mode, Pack, Severity, graph};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::ExitCode;

#[derive(Parser)]
#[command(name = "langpack", about = "Language pack author tooling", version)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Scaffold a minimal 0.2 pack that validates clean immediately.
    Init {
        /// Target directory (must not exist or be empty).
        path: String,
        /// Pack id (reverse-domain style).
        #[arg(long, default_value = "local.example.new-pack")]
        pack_id: String,
        /// Target locale tag (placeholder; set the real language).
        #[arg(long, default_value = "en-US")]
        locale: String,
        /// Display name.
        #[arg(long, default_value = "New Pack")]
        name: String,
    },
    /// Validate a pack directory against the layout contract and schemas.
    Validate {
        /// Pack root directory.
        path: String,
        /// Validation posture. Scaffold tolerates draft state; install
        /// enforces promotion gates (licenses, resolved references).
        #[arg(long, value_enum, default_value = "scaffold")]
        mode: ModeArg,
        /// Emit machine-readable JSON diagnostics.
        #[arg(long)]
        json: bool,
        /// Engine version to check pack compatibility against.
        #[arg(long)]
        engine_version: Option<String>,
    },
    /// Quality pass: scaffold validation + curriculum + source audits.
    /// Fails on warnings as well as errors.
    Lint {
        /// Pack root directory.
        path: String,
        #[arg(long)]
        json: bool,
    },
    /// Full conformance gate: install-mode validation + all audits.
    /// Fails on any error; warnings are reported but tolerated.
    Test {
        /// Pack root directory.
        path: String,
        #[arg(long)]
        json: bool,
        /// Engine version to check pack compatibility against.
        #[arg(long)]
        engine_version: Option<String>,
    },
    /// Curriculum graph audit: prerequisite cycles, dependency mirror,
    /// unreachable goals.
    AuditCurriculum {
        /// Pack root directory.
        path: String,
        #[arg(long)]
        json: bool,
    },
    /// Source provenance audit: locators, retrieved dates, term
    /// consistency, unused sources.
    AuditSources {
        /// Pack root directory.
        path: String,
        #[arg(long)]
        json: bool,
    },
    /// Lexicon script-purity and stress audit: writing-system
    /// contamination and Cyrillic stress self-consistency.
    AuditLexicon {
        /// Pack root directory.
        path: String,
        #[arg(long)]
        json: bool,
    },
    /// Audit source/license records; fails the reference build on blocked
    /// or unlicensed redistribution (docs/10).
    AuditLicenses {
        /// Pack root directory.
        path: String,
        /// Emit machine-readable JSON (diagnostics + attribution report).
        #[arg(long)]
        json: bool,
        /// Print the aggregated attribution report.
        #[arg(long)]
        attribution_report: bool,
    },
    /// Import lexical data from a registered source into the pack as
    /// unreviewed draft entries in a separate lexicon/imported-*.jsonl
    /// file. Curriculum files are never touched; attribution/license
    /// inventory entries are generated. Reference-only/blocked sources
    /// are rejected (docs/10).
    ImportLexicon {
        /// Pack root directory.
        path: String,
        /// Source id registered in sources.jsonl.
        #[arg(long)]
        source: String,
        /// Source-side JSONL export (key/form/reading/glosses/pos/tags).
        #[arg(long)]
        input: String,
        /// Locale for the gloss field.
        #[arg(long, default_value = "en-US")]
        gloss_locale: String,
    },
    /// Scaffold a schema-valid starter unit (K-24): draft status,
    /// REPLACE placeholders marked for the author; validates with
    /// warnings until filled in.
    NewUnit {
        /// Pack root directory.
        path: String,
        /// Unit content id, e.g. xx.unit.food.market.
        id: String,
    },
    /// Append a schema-valid starter lexicon entry (K-24) to
    /// lexicon/entries.jsonl.
    NewLexicon {
        /// Pack root directory.
        path: String,
        /// Lexicon content id, e.g. xx.lex.food.apple.
        id: String,
    },
    /// Build a deterministic .lpk archive (sorted entries, fixed
    /// timestamps, SHA-256 manifest).
    Build {
        /// Pack root directory.
        path: String,
        /// Output archive path.
        #[arg(short, long)]
        out: String,
    },
    /// Build/refresh a community catalog (catalog/packs.json) from built
    /// .lpk archives: entries carry version, sha256, size, and the
    /// three-way platform status marker (docs/13 PLAT-001):
    /// `tested_platforms` (maintainer/owner runtime evidence),
    /// `community_confirmed_platforms` (derived only from human report
    /// records) and `untested_platforms` (the rest). Entries are upserted
    /// by pack_id. Publishing archives + catalog remains owner gate O-05.
    Catalog {
        /// Built .lpk archive paths to include.
        archives: Vec<String>,
        /// Catalog file to create/update.
        #[arg(long, default_value = "catalog/packs.json")]
        file: String,
        /// Download URL template; placeholders {pack_id} {version}
        /// {filename}. Must be https (app-enforced allowlist applies at
        /// install; see docs/packs/CONTRIBUTING.md).
        #[arg(long)]
        url_template: String,
        /// Human-run platform report records
        /// (docs/platform/PLATFORM_REPORTS.yaml). Each record must bind the
        /// exact app build and the exact pack archive; the CLI fails with
        /// machine-readable errors on malformed records, missing or stale
        /// hash bindings, and any attempt to populate `tested_platforms`
        /// from a report.
        #[arg(long)]
        platform_reports: Option<String>,
    },
    /// Print an archive's manifest without extracting.
    Inspect {
        /// Archive path.
        path: String,
        #[arg(long)]
        json: bool,
    },
    /// Verify and install an archive into a pack store.
    Install {
        /// Archive path.
        path: String,
        /// Pack store directory.
        #[arg(long)]
        store: String,
    },
    /// Point the installed pack's current version at another version.
    Rollback {
        /// Pack id.
        pack_id: String,
        /// Pack store directory.
        #[arg(long)]
        store: String,
        /// Specific version to roll back to (default: highest other).
        #[arg(long)]
        to: Option<String>,
    },
}

#[derive(Clone, Copy, ValueEnum)]
enum ModeArg {
    Scaffold,
    Install,
}

impl From<ModeArg> for Mode {
    fn from(v: ModeArg) -> Mode {
        match v {
            ModeArg::Scaffold => Mode::Scaffold,
            ModeArg::Install => Mode::Install,
        }
    }
}

fn print_diags(diags: &[lts_langpack::Diagnostic]) {
    for d in diags {
        let sev = match d.severity {
            Severity::Error => "error",
            Severity::Warning => "warning",
            Severity::Info => "info",
        };
        let loc = if d.path.is_empty() {
            d.file.clone()
        } else {
            format!("{}{}", d.file, d.path)
        };
        println!("{sev}[{}] {loc}: {}", d.code, d.message);
    }
}

fn load_bytes(path: &str) -> Result<Vec<u8>, ExitCode> {
    fs::read(path).map_err(|e| {
        eprintln!("error: cannot read {path}: {e}");
        ExitCode::from(2)
    })
}

fn load_pack(path: &str, json: bool) -> Result<Pack, ExitCode> {
    Pack::load_dir(Path::new(path)).map_err(|e| {
        if json {
            println!(
                "{}",
                serde_json::json!({ "error": format!("cannot load pack at {path}: {e}") })
            );
        } else {
            eprintln!("error: cannot load pack at {path}: {e}");
        }
        ExitCode::from(2)
    })
}

fn report(
    label: &str,
    diags: &[lts_langpack::Diagnostic],
    json: bool,
    extra: Option<serde_json::Value>,
) -> (usize, usize) {
    let errors = diags
        .iter()
        .filter(|d| d.severity == Severity::Error)
        .count();
    let warnings = diags
        .iter()
        .filter(|d| d.severity == Severity::Warning)
        .count();
    if json {
        let mut obj = serde_json::json!({
            "check": label,
            "errors": errors,
            "warnings": warnings,
            "diagnostics": diags,
        });
        if let (Some(map), Some(extra_map)) = (
            obj.as_object_mut(),
            extra.as_ref().and_then(|e| e.as_object()),
        ) {
            for (k, v) in extra_map {
                map.insert(k.clone(), v.clone());
            }
        }
        println!("{obj}");
    } else {
        print_diags(diags);
        println!("{label}: {errors} error(s), {warnings} warning(s)");
    }
    (errors, warnings)
}

const INIT_MANIFEST: &str = "\
schema_version: \"0.2\"
pack_id: \"{pack_id}\"
display_name: \"{name}\"
version: \"0.0.1\"
target_locale: \"{locale}\"
source_locales: [\"en-US\"]
engine:
  min_version: \"0.1.0\"
  max_version_exclusive: null
maturity: \"experimental\"
capabilities:
  listening: false
  speaking: false
  reading: false
  writing: false
license:
  content_license: \"TBD\"
  redistribution_allowed: false
";

const INIT_GOALS: &str = "# Author goals here; each entry validates against
# schemas/v0.2/goal.schema.json. See schemas/v0.2/README.md.
goals: []
";

fn cmd_init(path: &str, pack_id: &str, locale: &str, name: &str) -> ExitCode {
    let root = Path::new(path);
    if root.exists() {
        let mut rd = match fs::read_dir(root) {
            Ok(rd) => rd,
            Err(e) => {
                eprintln!("error: cannot inspect {path}: {e}");
                return ExitCode::from(2);
            }
        };
        if rd.next().is_some() {
            eprintln!("error: {path} exists and is not empty");
            return ExitCode::from(1);
        }
    } else if let Err(e) = fs::create_dir_all(root) {
        eprintln!("error: cannot create {path}: {e}");
        return ExitCode::from(2);
    }
    let files: [(&str, String); 5] = [
        (
            "manifest.yaml",
            INIT_MANIFEST
                .replace("{pack_id}", pack_id)
                .replace("{locale}", locale)
                .replace("{name}", name),
        ),
        ("curriculum/goals.yaml", INIT_GOALS.to_string()),
        ("sources.jsonl", String::new()),
        ("licenses.jsonl", String::new()),
        ("grammar/concepts.jsonl", String::new()),
    ];
    for (rel, contents) in files {
        let full = root.join(rel);
        if let Some(dir) = full.parent() {
            if let Err(e) = fs::create_dir_all(dir) {
                eprintln!("error: cannot create {}: {e}", dir.display());
                return ExitCode::from(2);
            }
        }
        match fs::File::create(&full) {
            Ok(mut f) => {
                if let Err(e) = f.write_all(contents.as_bytes()) {
                    eprintln!("error: cannot write {}: {e}", full.display());
                    return ExitCode::from(2);
                }
            }
            Err(e) => {
                eprintln!("error: cannot create {}: {e}", full.display());
                return ExitCode::from(2);
            }
        }
    }
    println!("initialized 0.2 pack at {path}");
    println!("next: langpack validate {path} && langpack lint {path}");
    ExitCode::SUCCESS
}

fn parse_id(raw: &str, want_kind: &str) -> Result<lts_domain::ContentId, ExitCode> {
    let parsed = lts_domain::ContentId::parse(raw).map_err(|e| {
        eprintln!("error: invalid content id {raw:?}: {e}");
        ExitCode::from(1)
    })?;
    if parsed.kind().segment() != want_kind {
        eprintln!("error: id {raw:?} must be a {want_kind} id (segment `{want_kind}`)");
        return Err(ExitCode::from(1));
    }
    Ok(parsed)
}

fn first_goal_id(root: &Path, locale: &str) -> String {
    let mut files: Vec<std::path::PathBuf> = Vec::new();
    for cand in [
        root.join("curriculum/goals.yaml"),
        root.join("curriculum/goals.yml"),
    ] {
        if cand.exists() {
            files.push(cand);
        }
    }
    if let Ok(rd) = fs::read_dir(root.join("curriculum/goals")) {
        for e in rd.filter_map(|e| e.ok()) {
            let p = e.path();
            if matches!(
                p.extension().and_then(|x| x.to_str()),
                Some("yaml") | Some("yml")
            ) {
                files.push(p);
            }
        }
    }
    files.sort();
    for f in files {
        if let Some(serde_yaml::Value::Mapping(map)) = fs::read_to_string(&f)
            .ok()
            .and_then(|t| serde_yaml::from_str::<serde_yaml::Value>(&t).ok())
        {
            if let Some(serde_yaml::Value::Sequence(goals)) =
                map.get(serde_yaml::Value::String("goals".into()))
            {
                for g in goals {
                    if let serde_yaml::Value::Mapping(m) = g {
                        if let Some(serde_yaml::Value::String(id)) =
                            m.get(serde_yaml::Value::String("id".into()))
                        {
                            return id.clone();
                        }
                    }
                }
            }
        }
    }
    format!("{locale}.goal.replace-me")
}

fn cmd_new_unit(path: &str, id: &str) -> ExitCode {
    if let Err(code) = parse_id(id, "unit") {
        return code;
    }
    let root = Path::new(path);
    if !root.join("manifest.yaml").exists() {
        eprintln!("error: {path} is not a pack (no manifest.yaml)");
        return ExitCode::from(1);
    }
    let segments: Vec<&str> = id.split('.').collect();
    let locale = segments[0];
    // slug: everything after the `unit` kind segment.
    let slug = segments[2..].join("-");
    // Next sequence number: max existing NNN prefix + 10.
    let units_dir = root.join("curriculum/units");
    let mut max_seq: Option<u32> = None;
    if let Ok(rd) = fs::read_dir(&units_dir) {
        for e in rd.filter_map(|e| e.ok()) {
            let name = e.file_name().to_string_lossy().to_string();
            if let Some(n) = name.get(0..3).and_then(|p| p.parse::<u32>().ok()) {
                max_seq = Some(max_seq.map_or(n, |m| m.max(n)));
            }
        }
    }
    let seq = max_seq.map_or(0, |m| m + 10);
    let file = units_dir.join(format!("{seq:03}-{slug}.yaml"));
    if file.exists() {
        eprintln!("error: {} already exists", file.display());
        return ExitCode::from(1);
    }
    let goal_id = first_goal_id(root, locale);
    let activity_id = format!("{}.activity.{}-encounter", locale, segments[2..].join("."));
    let contents = [
        format!("id: \"{id}\""),
        format!("goal_id: \"{goal_id}\""),
        "title: \"REPLACE: lesson title\"".to_string(),
        "summary: \"REPLACE: one-line summary\"".to_string(),
        "estimated_minutes: 5".to_string(),
        "activities:".to_string(),
        format!("  - id: \"{activity_id}\""),
        "    type: \"encounter-read\"".to_string(),
        "    modality: \"reading\"".to_string(),
        "    support_level: 0".to_string(),
        "    content_refs: []".to_string(),
    ]
    .join("\n")
        + "\n";
    if let Err(e) = fs::create_dir_all(&units_dir) {
        eprintln!("error: cannot create {}: {e}", units_dir.display());
        return ExitCode::from(2);
    }
    if let Err(e) = fs::write(&file, contents) {
        eprintln!("error: cannot write {}: {e}", file.display());
        return ExitCode::from(2);
    }
    println!("created {}", file.display());
    println!("replace: title, summary, goal_id (if REPLACE), activity content_refs");
    println!("next: langpack validate {path}");
    ExitCode::SUCCESS
}

fn cmd_new_lexicon(path: &str, id: &str) -> ExitCode {
    if let Err(code) = parse_id(id, "lex") {
        return code;
    }
    let root = Path::new(path);
    if !root.join("manifest.yaml").exists() {
        eprintln!("error: {path} is not a pack (no manifest.yaml)");
        return ExitCode::from(1);
    }
    let file = root.join("lexicon/entries.jsonl");
    if let Some(dir) = file.parent() {
        if let Err(e) = fs::create_dir_all(dir) {
            eprintln!("error: cannot create {}: {e}", dir.display());
            return ExitCode::from(2);
        }
    }
    let line = format!(
        "{{\"id\":\"{id}\",\"status\":\"draft\",\"forms\":[{{\"text\":\"REPLACE\",\"is_primary\":true}}],\"readings\":[{{\"text\":\"REPLACE\",\"script\":\"latin\"}}],\"glosses\":{{\"en-US\":[\"REPLACE\"]}},\"sources\":[\"REPLACE-SOURCE\"]}}\n"
    );
    match fs::OpenOptions::new().append(true).create(true).open(&file) {
        Ok(mut f) => {
            if let Err(e) = f.write_all(line.as_bytes()) {
                eprintln!("error: cannot write {}: {e}", file.display());
                return ExitCode::from(2);
            }
        }
        Err(e) => {
            eprintln!("error: cannot open {}: {e}", file.display());
            return ExitCode::from(2);
        }
    }
    println!("appended {id} to {}", file.display());
    println!("replace: form text, reading, gloss, and the REPLACE-SOURCE citation");
    println!("next: langpack validate {path}");
    ExitCode::SUCCESS
}

// --- PLAT-001 three-way platform status (docs/13_RELEASE_AND_DISTRIBUTION) --
//
// `tested_platforms` is maintainer/owner-run runtime evidence and is never
// derived from report records. `community_confirmed_platforms` comes only from
// human-run report records merged into docs/platform/PLATFORM_REPORTS.yaml,
// each binding the exact app build (app_version + app_commit) and the exact
// pack archive (pack_version + pack_sha256). Every platform in the universe
// that is neither is `untested_platforms`.

/// Platform universe the catalog reports on; widening it here is the only
/// place the tri-state is defined.
const ALL_PLATFORMS: [&str; 3] = ["linux", "windows", "macos"];
const REPORT_FIELDS: [&str; 13] = [
    "id",
    "platform",
    "os_version",
    "app_version",
    "app_commit",
    "pack_id",
    "pack_version",
    "pack_sha256",
    "date",
    "reporter",
    "reporter_category",
    "outcome",
    "issues",
];
const REPORTER_CATEGORIES: [&str; 2] = ["community-reporter", "maintainer"];
const OUTCOMES: [&str; 3] = ["works", "works-with-issues", "fails"];
/// Outcomes that justify calling a platform community-confirmed. `fails`
/// records are valid evidence but clear a confirmation instead.
const CONFIRMING_OUTCOMES: [&str; 2] = ["works", "works-with-issues"];

#[derive(Debug)]
struct ReportIssue {
    code: &'static str,
    record: String,
    message: String,
}

fn issue(code: &'static str, record: &str, message: impl Into<String>) -> ReportIssue {
    ReportIssue {
        code,
        record: record.to_string(),
        message: message.into(),
    }
}

/// Platform-report failures are emitted as one machine-readable JSON line so
/// CI and report-triage tooling can act on the codes (docs/13).
fn report_failures(file: &str, failures: &[ReportIssue]) {
    let items: Vec<serde_json::Value> = failures
        .iter()
        .map(|f| {
            serde_json::json!({
                "code": f.code,
                "record": f.record,
                "message": f.message,
            })
        })
        .collect();
    eprintln!(
        "{}",
        serde_json::json!({
            "error": "platform-report-invalid",
            "file": file,
            "failures": items,
        })
    );
}

fn known_platforms() -> [String; 3] {
    ALL_PLATFORMS.map(String::from)
}

fn is_hex(s: &str, exact: Option<usize>) -> bool {
    if !s.bytes().all(|b| b.is_ascii_hexdigit()) {
        return false;
    }
    match exact {
        Some(n) => s.len() == n,
        None => (7..=40).contains(&s.len()),
    }
}

fn is_date(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 10
        && b[4] == b'-'
        && b[7] == b'-'
        && b[..4].iter().all(u8::is_ascii_digit)
        && b[5..7].iter().all(u8::is_ascii_digit)
        && b[8..].iter().all(u8::is_ascii_digit)
        && s[5..7].parse::<u8>().is_ok_and(|m| (1..=12).contains(&m))
        && s[8..].parse::<u8>().is_ok_and(|d| (1..=31).contains(&d))
}

fn short_hash(s: &str) -> String {
    s.chars().take(12).collect()
}

/// Non-empty string value of `field`, if present.
fn report_field<'a>(rec: &'a serde_json::Value, field: &str) -> Option<&'a str> {
    rec.get(field).and_then(|v| v.as_str()).filter(|s| !s.is_empty())
}

/// Missing-record fields get codes that name the binding they break, so a
/// reporter can tell "you did not pin the archive" from "you typo'ed".
fn missing_code(field: &str) -> &'static str {
    match field {
        "pack_sha256" => "missing-hash-binding",
        "app_version" | "app_commit" => "missing-build-binding",
        _ => "missing-field",
    }
}

/// Parse and schema-check the human-run platform report file. Zero records is
/// the current valid state: it simply confirms nothing.
fn load_platform_reports(path: &str) -> Result<Vec<serde_json::Value>, Vec<ReportIssue>> {
    let text = fs::read_to_string(path).map_err(|e| {
        vec![issue(
            "report-file-unreadable",
            path,
            format!("cannot read {path}: {e}"),
        )]
    })?;
    let yaml = match serde_yaml::from_str::<serde_yaml::Value>(&text) {
        Ok(v) => v,
        Err(e) => {
            return Err(vec![issue(
                "report-file-malformed",
                path,
                format!("invalid YAML: {e}"),
            )]);
        }
    };
    let root = serde_json::to_value(&yaml).map_err(|e| {
        vec![issue(
            "report-file-malformed",
            path,
            format!("cannot read records: {e}"),
        )]
    })?;
    let Some(map) = root.as_object() else {
        return Err(vec![issue(
            "report-file-malformed",
            path,
            "top level must be a mapping with a \"reports\" array",
        )]);
    };
    let mut failures = Vec::new();
    if let Some(v) = map.get("schema_version") {
        if v.as_str() != Some("1") && v.as_i64() != Some(1) {
            failures.push(issue(
                "unsupported-schema-version",
                path,
                format!("schema_version {v} is not understood (expected 1)"),
            ));
        }
    }
    for key in map.keys() {
        if key == "tested_platforms" || key == "tested" {
            failures.push(issue(
                "tested-promotion-denied",
                path,
                "tested_platforms is maintainer/owner runtime evidence; report records can never populate it (docs/13)",
            ));
        } else if key != "reports" && key != "schema_version" {
            failures.push(issue(
                "unknown-field",
                path,
                format!("unknown top-level field {key}"),
            ));
        }
    }
    let records: Vec<serde_json::Value> = match map.get("reports").and_then(|v| v.as_array()) {
        Some(a) => a.clone(),
        None => {
            failures.push(issue(
                "report-file-malformed",
                path,
                "missing \"reports\" array",
            ));
            return Err(failures);
        }
    };
    let mut seen: BTreeSet<String> = BTreeSet::new();
    for (i, rec) in records.iter().enumerate() {
        let fallback = format!("reports[{i}]");
        let label = rec.get("id").and_then(|v| v.as_str()).unwrap_or(&fallback);
        let Some(obj) = rec.as_object() else {
            failures.push(issue("report-file-malformed", label, "record must be a mapping"));
            continue;
        };
        for key in obj.keys() {
            if !REPORT_FIELDS.contains(&key.as_str()) {
                failures.push(issue(
                    "unknown-field",
                    label,
                    format!("unknown field {key} (schema: {REPORT_FIELDS:?})"),
                ));
            }
        }
        for field in REPORT_FIELDS {
            if field != "issues" && report_field(rec, field).is_none() {
                failures.push(issue(
                    missing_code(field),
                    label,
                    format!("missing required field {field}"),
                ));
            }
        }
        if rec.get("issues").is_some_and(|v| !v.is_array()) {
            failures.push(issue("bad-field", label, "issues must be an array of strings"));
        }
        if let Some(items) = rec.get("issues").and_then(|v| v.as_array()) {
            for item in items {
                if !item.is_string() {
                    failures.push(issue("bad-field", label, "issues entries must be strings"));
                }
            }
        }
        if let Some(v) = report_field(rec, "platform") {
            if !ALL_PLATFORMS.contains(&v) {
                failures.push(issue(
                    "unknown-platform",
                    label,
                    format!("platform {v:?} is not one of {ALL_PLATFORMS:?}"),
                ));
            }
        }
        if let Some(v) = report_field(rec, "reporter_category") {
            if !REPORTER_CATEGORIES.contains(&v) {
                failures.push(issue(
                    "bad-field",
                    label,
                    format!("reporter_category {v:?} must be one of {REPORTER_CATEGORIES:?}"),
                ));
            }
        }
        if let Some(v) = report_field(rec, "outcome") {
            if !OUTCOMES.contains(&v) {
                failures.push(issue(
                    "bad-field",
                    label,
                    format!("outcome {v:?} must be one of {OUTCOMES:?}"),
                ));
            }
        }
        if let Some(v) = report_field(rec, "app_commit") {
            if !is_hex(v, None) {
                failures.push(issue(
                    "bad-build-binding",
                    label,
                    "app_commit must be a 7-40 character hex git commit",
                ));
            }
        }
        if let Some(v) = report_field(rec, "pack_sha256") {
            if !is_hex(v, Some(64)) {
                failures.push(issue(
                    "bad-hash-binding",
                    label,
                    "pack_sha256 must be 64 hex characters of the exact archive",
                ));
            }
        }
        if let Some(v) = report_field(rec, "date") {
            if !is_date(v) {
                failures.push(issue("bad-field", label, format!("date {v:?} must be YYYY-MM-DD")));
            }
        }
        if let Some(id) = report_field(rec, "id") {
            if !seen.insert(id.to_string()) {
                failures.push(issue("duplicate-id", label, format!("duplicate record id {id}")));
            }
        }
    }
    if failures.is_empty() {
        Ok(records)
    } else {
        Err(failures)
    }
}

/// Stamp the three-way platform status onto every catalog entry and onto the
/// catalog root. `tested_platforms` is carried through untouched; the root
/// `community_confirmed_platforms` is the intersection over entries (a
/// per-platform claim for the whole catalog needs every entry confirmed).
fn stamp_platform_status(
    catalog: &mut serde_json::Value,
    reports: &[serde_json::Value],
) -> Result<(), Vec<ReportIssue>> {
    let tested: Vec<String> = catalog["tested_platforms"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let mut failures = Vec::new();
    // Newest record per (pack_id, platform) decides the current status; ties
    // break on id so the derivation stays deterministic.
    let mut newest: BTreeMap<(String, String), (String, String, bool)> = BTreeMap::new();
    for rec in reports {
        let label = rec["id"].as_str().unwrap_or("(unnamed)").to_string();
        let pack_id = rec["pack_id"].as_str().unwrap_or("").to_string();
        let platform = rec["platform"].as_str().unwrap_or("").to_string();
        let entry = catalog["packs"]
            .as_array()
            .and_then(|ps| ps.iter().find(|p| p["pack_id"].as_str() == Some(pack_id.as_str())));
        let Some(entry) = entry else {
            failures.push(issue(
                "unknown-pack",
                &label,
                format!("{pack_id} is not in this catalog, so the record binds no published entry"),
            ));
            continue;
        };
        let entry_sha = entry["sha256"].as_str().unwrap_or("");
        let entry_version = entry["version"].as_str().unwrap_or("");
        let rec_sha = rec["pack_sha256"].as_str().unwrap_or("");
        let rec_version = rec["pack_version"].as_str().unwrap_or("");
        if rec_sha != entry_sha || rec_version != entry_version {
            failures.push(issue(
                "stale-pack-binding",
                &label,
                format!(
                    "{pack_id} v{rec_version} sha {} no longer matches the catalog entry \
                     v{entry_version} sha {}; a rebuilt or bumped pack invalidates prior \
                     runtime evidence",
                    short_hash(rec_sha),
                    short_hash(entry_sha)
                ),
            ));
            continue;
        }
        let confirming = CONFIRMING_OUTCOMES.contains(&rec["outcome"].as_str().unwrap_or(""));
        let date = rec["date"].as_str().unwrap_or("").to_string();
        let key = (pack_id, platform);
        let stale = newest
            .get(&key)
            .is_some_and(|(d, id, _)| (d.as_str(), id.as_str()) >= (date.as_str(), label.as_str()));
        if !stale {
            newest.insert(key, (date, label, confirming));
        }
    }
    let mut confirmed: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for ((pack_id, platform), (_, _, confirming)) in &newest {
        if *confirming {
            confirmed
                .entry(pack_id.clone())
                .or_default()
                .push(platform.clone());
        }
    }
    let mut root_confirmed: Option<Vec<String>> = None;
    if let Some(packs) = catalog["packs"].as_array_mut() {
        for entry in packs.iter_mut() {
            let pack_id = entry["pack_id"].as_str().unwrap_or("").to_string();
            let community: Vec<String> = known_platforms()
                .into_iter()
                .filter(|p| {
                    !tested.contains(p)
                        && confirmed
                            .get(&pack_id)
                            .is_some_and(|c| c.contains(p))
                })
                .collect();
            let untested: Vec<String> = known_platforms()
                .into_iter()
                .filter(|p| !tested.contains(p) && !community.contains(p))
                .collect();
            entry["tested_platforms"] = serde_json::json!(tested);
            entry["community_confirmed_platforms"] = serde_json::json!(community);
            entry["untested_platforms"] = serde_json::json!(untested);
            root_confirmed = Some(match root_confirmed {
                None => community,
                Some(prev) => prev.into_iter().filter(|p| community.contains(p)).collect(),
            });
        }
    }
    let root_community = root_confirmed.unwrap_or_default();
    let root_untested: Vec<String> = known_platforms()
        .into_iter()
        .filter(|p| !tested.contains(p) && !root_community.contains(p))
        .collect();
    catalog["community_confirmed_platforms"] = serde_json::json!(root_community);
    catalog["untested_platforms"] = serde_json::json!(root_untested);
    if failures.is_empty() {
        Ok(())
    } else {
        Err(failures)
    }
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    match cli.command {
        Command::Init {
            path,
            pack_id,
            locale,
            name,
        } => cmd_init(&path, &pack_id, &locale, &name),
        Command::NewUnit { path, id } => cmd_new_unit(&path, &id),
        Command::NewLexicon { path, id } => cmd_new_lexicon(&path, &id),
        Command::Validate {
            path,
            mode,
            json,
            engine_version,
        } => {
            let pack = match load_pack(&path, json) {
                Ok(pack) => pack,
                Err(c) => return c,
            };
            let diags = pack.validate(mode.into(), engine_version.as_deref());
            let (errors, _) = report(
                match mode {
                    ModeArg::Scaffold => "validate(scaffold)",
                    ModeArg::Install => "validate(install)",
                },
                &diags,
                json,
                None,
            );
            if errors > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
        Command::Lint { path, json } => {
            let pack = match load_pack(&path, json) {
                Ok(pack) => pack,
                Err(c) => return c,
            };
            let mut diags = pack.validate(Mode::Scaffold, None);
            diags.extend(graph::audit_curriculum(&pack));
            diags.extend(pack.audit_sources());
            diags.extend(pack.audit_lexicon());
            let (errors, warnings) = report("lint", &diags, json, None);
            if errors > 0 || warnings > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
        Command::Test {
            path,
            json,
            engine_version,
        } => {
            let pack = match load_pack(&path, json) {
                Ok(pack) => pack,
                Err(c) => return c,
            };
            let mut diags = pack.validate(Mode::Install, engine_version.as_deref());
            diags.extend(graph::audit_curriculum(&pack));
            diags.extend(pack.audit_sources());
            diags.extend(pack.audit_lexicon());
            let (lic_diags, report_entries) = pack.audit_licenses();
            diags.extend(lic_diags);
            let (errors, warnings) = report(
                "test",
                &diags,
                json,
                Some(serde_json::json!({ "attribution_report": report_entries })),
            );
            if errors > 0 {
                ExitCode::from(1)
            } else {
                if warnings > 0 {
                    eprintln!("note: {warnings} warning(s); promotion gates still pass");
                }
                ExitCode::SUCCESS
            }
        }
        Command::AuditCurriculum { path, json } => {
            let pack = match load_pack(&path, json) {
                Ok(pack) => pack,
                Err(c) => return c,
            };
            let diags = graph::audit_curriculum(&pack);
            let (errors, _) = report("audit-curriculum", &diags, json, None);
            if errors > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
        Command::AuditSources { path, json } => {
            let pack = match load_pack(&path, json) {
                Ok(pack) => pack,
                Err(c) => return c,
            };
            let diags = pack.audit_sources();
            let (errors, _) = report("audit-sources", &diags, json, None);
            if errors > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
        Command::AuditLexicon { path, json } => {
            let pack = match load_pack(&path, json) {
                Ok(pack) => pack,
                Err(c) => return c,
            };
            let diags = pack.audit_lexicon();
            let (errors, _) = report("audit-lexicon", &diags, json, None);
            if errors > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
        Command::AuditLicenses {
            path,
            json,
            attribution_report,
        } => {
            let pack = match load_pack(&path, json) {
                Ok(pack) => pack,
                Err(c) => return c,
            };
            let (diags, report_entries) = pack.audit_licenses();
            let (errors, _) = report(
                "audit-licenses",
                &diags,
                json,
                Some(serde_json::json!({ "attribution_report": report_entries })),
            );
            if !json && attribution_report {
                println!("--- attribution report ---");
                for e in &report_entries {
                    println!("{} [{}] ({})", e.title, e.license, e.source_id);
                    println!("  {}", e.attribution);
                }
            }
            if errors > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
        Command::ImportLexicon {
            path,
            source,
            input,
            gloss_locale,
        } => {
            match lts_langpack::leximport::import_lexicon(
                Path::new(&path),
                &source,
                Path::new(&input),
                &gloss_locale,
            ) {
                Ok(o) => {
                    println!("imported {} entries into {}", o.entries, o.output_file);
                    println!("license entries added: {}", o.licenses_added);
                    println!("--- required attribution ---");
                    for e in &o.attribution {
                        println!("{} [{}] ({})", e.title, e.license, e.source_id);
                        println!("  {}", e.attribution);
                    }
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("error: import failed: {e}");
                    ExitCode::from(1)
                }
            }
        }
        Command::Build { path, out } => match archive::build(Path::new(&path)) {
            Ok((bytes, sha)) => {
                if let Err(e) = fs::write(&out, &bytes) {
                    eprintln!("error: cannot write {out}: {e}");
                    return ExitCode::from(2);
                }
                println!("built {out} ({} bytes)", bytes.len());
                println!("sha256 {sha}");
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: build failed: {e}");
                ExitCode::from(1)
            }
        },
        Command::Catalog {
            archives,
            file,
            url_template,
            platform_reports,
        } => {
            if !url_template.starts_with("https://") {
                eprintln!(
                    "error: --url-template must be https (the app enforces https at install)"
                );
                return ExitCode::from(1);
            }
            // Community confirmation is human-run evidence only: with no report
            // file nothing is confirmed, and every non-tested platform stays
            // explicitly untested (docs/13 PLAT-001).
            let reports_path = platform_reports.unwrap_or_default();
            let reports = if reports_path.is_empty() {
                eprintln!(
                    "note: no --platform-reports file given; community_confirmed_platforms stays empty"
                );
                Vec::new()
            } else {
                match load_platform_reports(&reports_path) {
                    Ok(r) => r,
                    Err(failures) => {
                        report_failures(&reports_path, &failures);
                        return ExitCode::from(1);
                    }
                }
            };
            let mut catalog = fs::read_to_string(&file)
                .ok()
                .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                .unwrap_or_else(|| {
                    serde_json::json!({
                        "catalog_version": "1",
                        "note": "Generated by `langpack catalog`; publishing archives and this file is owner gate O-05.",
                        "tested_platforms": ["linux"],
                        "community_confirmed_platforms": [],
                        "untested_platforms": ["windows", "macos"],
                        "packs": [],
                    })
                });
            if catalog.get("tested_platforms").is_none() {
                // PLAT-001: only Linux has maintainer-run runtime evidence.
                // This field is maintainer-owned; report records never feed it.
                catalog["tested_platforms"] = serde_json::json!(["linux"]);
            }
            let packs = match catalog["packs"].as_array_mut() {
                Some(p) => p,
                None => {
                    eprintln!("error: {file} has no \"packs\" array");
                    return ExitCode::from(1);
                }
            };
            for arc in &archives {
                let bytes = match load_bytes(arc) {
                    Ok(b) => b,
                    Err(c) => return c,
                };
                let am = match archive::inspect(&bytes) {
                    Ok(m) => m,
                    Err(e) => {
                        eprintln!("error: {arc}: {e}");
                        return ExitCode::from(1);
                    }
                };
                let yaml = match archive::read_entry(&bytes, "manifest.yaml") {
                    Ok(v) => v,
                    Err(e) => {
                        eprintln!("error: {arc}: missing manifest.yaml: {e}");
                        return ExitCode::from(1);
                    }
                };
                let m: serde_json::Value =
                    match serde_yaml::from_str(&String::from_utf8_lossy(&yaml)) {
                        Ok(v) => v,
                        Err(e) => {
                            eprintln!("error: {arc}: bad manifest.yaml: {e}");
                            return ExitCode::from(1);
                        }
                    };
                let authors = m["authors"]
                    .as_array()
                    .map(|a| {
                        a.iter()
                            .filter_map(|v| v.as_str())
                            .collect::<Vec<_>>()
                            .join(", ")
                    })
                    .unwrap_or_default();
                let maturity = m["maturity"].as_str().unwrap_or("experimental");
                let filename = Path::new(arc)
                    .file_name()
                    .map(|f| f.to_string_lossy().into_owned())
                    .unwrap_or_else(|| arc.clone());
                let url = url_template
                    .replace("{pack_id}", &am.pack_id)
                    .replace("{version}", &am.version)
                    .replace("{filename}", &filename);
                let entry = serde_json::json!({
                    "pack_id": am.pack_id,
                    "version": am.version,
                    "display_name": m["display_name"].as_str().unwrap_or(&am.pack_id),
                    "locale": m["target_locale"].as_str().unwrap_or(""),
                    "author": authors,
                    "license": m["license"]["content_license"].as_str().unwrap_or("UNLICENSED"),
                    "review_status": if matches!(maturity, "reference" | "certified" | "reviewed") { "reviewed" } else { "community" },
                    "min_sdk_version": m["engine"]["min_version"].as_str().unwrap_or("0.1.0"),
                    "url": url,
                    "sha256": archive::hex_sha256(&bytes),
                    "size_bytes": bytes.len(),
                });
                packs.retain(|p| p["pack_id"].as_str() != Some(&am.pack_id));
                packs.push(entry);
                println!("catalog: {arc} -> {} v{}", am.pack_id, am.version);
            }
            packs.sort_by_key(|p| p["pack_id"].as_str().unwrap_or("").to_string());
            let count = packs.len();
            if let Err(failures) = stamp_platform_status(&mut catalog, &reports) {
                // Nothing is written: unvalidatable evidence must never reach
                // a published catalog (docs/13).
                report_failures(&reports_path, &failures);
                return ExitCode::from(1);
            }
            let out = serde_json::to_string_pretty(&catalog).expect("serialize catalog");
            if let Err(e) = fs::write(&file, format!("{out}\n")) {
                eprintln!("error: cannot write {file}: {e}");
                return ExitCode::from(2);
            }
            println!("wrote {file} ({count} entries)");
            ExitCode::SUCCESS
        }
        Command::Inspect { path, json } => {
            let bytes = match load_bytes(&path) {
                Ok(b) => b,
                Err(c) => return c,
            };
            match archive::inspect(&bytes) {
                Ok(m) => {
                    if json {
                        println!("{}", serde_json::to_string(&m).unwrap());
                    } else {
                        println!(
                            "{} {} v{} (schema {})",
                            m.format, m.pack_id, m.version, m.schema_version
                        );
                        for f in &m.files {
                            println!("  {:>10}  {}  {}", f.size, &f.sha256[..12], f.path);
                        }
                    }
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("error: {e}");
                    ExitCode::from(1)
                }
            }
        }
        Command::Install { path, store } => {
            let bytes = match load_bytes(&path) {
                Ok(b) => b,
                Err(c) => return c,
            };
            match archive::install(&bytes, Path::new(&store)) {
                Ok(o) => {
                    println!(
                        "installed {} v{} at {}",
                        o.pack_id,
                        o.version,
                        o.directory.display()
                    );
                    if let Some(prev) = &o.previous {
                        println!("previous version: {prev} (rollback available)");
                    }
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("error: install rejected: {e}");
                    ExitCode::from(1)
                }
            }
        }
        Command::Rollback { pack_id, store, to } => {
            match archive::rollback(&pack_id, Path::new(&store), to.as_deref()) {
                Ok(v) => {
                    println!("{pack_id} current version is now {v}");
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("error: rollback failed: {e}");
                    ExitCode::from(1)
                }
            }
        }
    }
}
