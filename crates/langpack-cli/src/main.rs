//! `langpack` author CLI: validate, audit-licenses, build, inspect,
//! install, rollback. The remaining author workflow (init/lint/test/
//! audit-curriculum/migrate) lands with PACK-005.

use clap::{Parser, Subcommand, ValueEnum};
use lts_langpack::archive;
use lts_langpack::{Mode, Pack, Severity};
use std::fs;
use std::process::ExitCode;

#[derive(Parser)]
#[command(name = "langpack", about = "Language pack author tooling", version)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
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

fn main() -> ExitCode {
    let cli = Cli::parse();
    match cli.command {
        Command::Validate {
            path,
            mode,
            json,
            engine_version,
        } => {
            let pack = match Pack::load_dir(path.as_ref()) {
                Ok(pack) => pack,
                Err(e) => {
                    if json {
                        println!(
                            "{}",
                            serde_json::json!({ "error": format!("cannot load pack at {path}: {e}") })
                        );
                    } else {
                        eprintln!("error: cannot load pack at {path}: {e}");
                    }
                    return ExitCode::from(2);
                }
            };
            let diags = pack.validate(mode.into(), engine_version.as_deref());
            let errors = diags
                .iter()
                .filter(|d| d.severity == Severity::Error)
                .count();
            let warnings = diags
                .iter()
                .filter(|d| d.severity == Severity::Warning)
                .count();
            if json {
                println!(
                    "{}",
                    serde_json::json!({
                        "pack": path,
                        "mode": match mode { ModeArg::Scaffold => "scaffold", ModeArg::Install => "install" },
                        "errors": errors,
                        "warnings": warnings,
                        "diagnostics": diags,
                    })
                );
            } else {
                print_diags(&diags);
                println!("{} error(s), {} warning(s)", errors, warnings);
            }
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
            let pack = match Pack::load_dir(path.as_ref()) {
                Ok(pack) => pack,
                Err(e) => {
                    if json {
                        println!(
                            "{}",
                            serde_json::json!({ "error": format!("cannot load pack at {path}: {e}") })
                        );
                    } else {
                        eprintln!("error: cannot load pack at {path}: {e}");
                    }
                    return ExitCode::from(2);
                }
            };
            let (diags, report) = pack.audit_licenses();
            let errors = diags
                .iter()
                .filter(|d| d.severity == Severity::Error)
                .count();
            if json {
                println!(
                    "{}",
                    serde_json::json!({
                        "pack": path,
                        "errors": errors,
                        "diagnostics": diags,
                        "attribution_report": report,
                    })
                );
            } else {
                print_diags(&diags);
                if attribution_report {
                    println!("--- attribution report ---");
                    for e in &report {
                        println!("{} [{}] ({})", e.title, e.license, e.source_id);
                        println!("  {}", e.attribution);
                    }
                }
                println!("{} audit error(s)", errors);
            }
            if errors > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
        Command::Build { path, out } => match archive::build(path.as_ref()) {
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
            match archive::install(&bytes, store.as_ref()) {
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
            match archive::rollback(&pack_id, store.as_ref(), to.as_deref()) {
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
