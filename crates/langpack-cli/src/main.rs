//! `langpack` author CLI. PACK-001 delivers `validate`; the remaining
//! author workflow (init/build/inspect/migrate) lands with PACK-005.

use clap::{Parser, Subcommand, ValueEnum};
use lts_langpack::{Mode, Pack, Severity};
use std::process::ExitCode;

#[derive(Parser)]
#[command(name = "langpack", about = "Language pack author tooling", version)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Validate a pack directory against the 0.2 layout and schemas.
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
                for d in &diags {
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
                println!("{} error(s), {} warning(s)", errors, warnings);
            }
            if errors > 0 {
                ExitCode::from(1)
            } else {
                ExitCode::SUCCESS
            }
        }
    }
}
