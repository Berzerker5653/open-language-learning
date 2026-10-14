/// Stamps the exact build identity a runtime report has to name.
///
/// `docs/13` binds platform and audit evidence to an app *commit*, and ADR-0015
/// only counts a runtime report when a human ran a specific build. A report that
/// says "the current version" is unbindable, so the binary carries the commit it
/// was compiled from and surfaces it in Settings.
fn main() {
    // R15: the stamp has to be recomputed whenever anything it reads changes.
    // `.git/HEAD` alone is not enough: it only moves on a checkout, while a
    // commit moves the *branch ref* (or `packed-refs`) and a staged change
    // moves the index. Once any `rerun-if-changed` line is printed cargo stops
    // watching the package by default, so the crate's own sources are named
    // too — an edited source is exactly the case where a stale dirty flag
    // would misrepresent the bytes being compiled.
    println!("cargo:rerun-if-changed=../../../.git/HEAD");
    println!("cargo:rerun-if-changed=../../../.git/packed-refs");
    println!("cargo:rerun-if-changed=../../../.git/index");
    if let Some(r) = head_ref() {
        println!("cargo:rerun-if-changed=../../../.git/{r}");
    }
    println!("cargo:rerun-if-changed=src");
    println!("cargo:rerun-if-changed=build.rs");

    let commit = git(&["rev-parse", "--short", "HEAD"]);
    let dirty = !git(&["status", "--porcelain"]).is_empty();
    println!(
        "cargo:rustc-env=LTS_GIT_SHA={}",
        if commit.is_empty() {
            "unknown"
        } else {
            &commit
        }
    );
    println!(
        "cargo:rustc-env=LTS_GIT_DIRTY={}",
        if dirty { "1" } else { "0" }
    );

    tauri_build::build()
}

fn git(args: &[&str]) -> String {
    std::process::Command::new("git")
        .args(args)
        .output()
        .map(|out| {
            if out.status.success() {
                String::from_utf8_lossy(&out.stdout).trim().to_string()
            } else {
                String::new()
            }
        })
        .unwrap_or_default()
}

/// The ref `HEAD` points at, as a path under `.git` (`refs/heads/main`).
/// A detached HEAD names no ref file; the `HEAD` watch already covers it.
fn head_ref() -> Option<String> {
    let head = std::fs::read_to_string("../../../.git/HEAD").ok()?;
    let line = head.trim().strip_prefix("ref:")?.trim();
    (!line.is_empty()).then(|| line.to_string())
}
