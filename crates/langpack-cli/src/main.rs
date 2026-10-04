//! `langpack` author CLI: init, validate, lint, test, audit-licenses,
//! audit-curriculum, audit-sources, build, catalog, inspect, install, rollback.

use clap::{Parser, Subcommand, ValueEnum};
use lts_langpack::archive;
use lts_langpack::{Mode, Pack, Severity, graph};
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
    /// tested-platform marker (docs/13 PLAT-001). Entries are upserted by
    /// pack_id. Publishing archives + catalog remains owner gate O-05.
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
        } => {
            if !url_template.starts_with("https://") {
                eprintln!(
                    "error: --url-template must be https (the app enforces https at install)"
                );
                return ExitCode::from(1);
            }
            let mut catalog = fs::read_to_string(&file)
                .ok()
                .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                .unwrap_or_else(|| {
                    serde_json::json!({
                        "catalog_version": "1",
                        "note": "Generated by `langpack catalog`; publishing archives and this file is owner gate O-05.",
                        "tested_platforms": ["linux"],
                        "packs": [],
                    })
                });
            if catalog.get("tested_platforms").is_none() {
                // PLAT-001: only Linux runtime is tested; keep the marker honest.
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
