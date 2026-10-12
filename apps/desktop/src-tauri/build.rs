/// Stamps the exact build identity a runtime report has to name.
///
/// `docs/13` binds platform and audit evidence to an app *commit*, and ADR-0015
/// only counts a runtime report when a human ran a specific build. A report that
/// says "the current version" is unbindable, so the binary carries the commit it
/// was compiled from and surfaces it in Settings.
fn main() {
    // The commit changes whenever HEAD moves; a dirty tree changes the bytes
    // without moving HEAD, so both are tracked.
    println!("cargo:rerun-if-changed=../../../.git/HEAD");

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
