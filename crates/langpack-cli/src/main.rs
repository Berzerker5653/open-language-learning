//! `langpack` author CLI: init, validate, lint, test, audit-licenses,
//! audit-curriculum, audit-sources, build, inspect, install, rollback.

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
    /// Build a deterministic .lpk archive (sorted entries, fixed
    /// timestamps, SHA-256 manifest).
    Build {
        /// Pack root directory.
        path: String,
        /// Output archive path.
        #[arg(short, long)]
        out: String,
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

fn main() -> ExitCode {
    let cli = Cli::parse();
    match cli.command {
        Command::Init {
            path,
            pack_id,
            locale,
            name,
        } => cmd_init(&path, &pack_id, &locale, &name),
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
