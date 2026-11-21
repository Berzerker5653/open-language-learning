// WEB-SERVE-001: the HTTP serve entry point. Serves the built frontend and
// bridges fetch('/api/<command>') to the same command wiring the desktop
// shell installs. Trusted-network binding only; see src/serve.rs and
// state/notes/WEB-SERVE-001.md for the posture and runbook.
//
// Usage: lts-serve [BIND]   (BIND defaults to $LTS_SERVE_BIND or
// 127.0.0.1:17625; a tailnet phone reaches the app via the GamingPC
// 100.64/10 address, e.g. lts-serve 100.x.y.z:17625)
// The data directory is the same $LTS_DATA_DIR the desktop app uses.

fn main() {
    let bind = std::env::args()
        .nth(1)
        .or_else(|| std::env::var("LTS_SERVE_BIND").ok())
        .unwrap_or_else(|| "127.0.0.1:17625".to_string());
    let dist = std::env::var("LTS_SERVE_DIST")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../dist"));
    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(e) => {
            eprintln!("lts-serve: runtime start failed: {e}");
            std::process::exit(1);
        }
    };
    if let Err(e) = runtime.block_on(lts_desktop::serve::serve(&bind, dist)) {
        eprintln!("lts-serve: {e}");
        std::process::exit(1);
    }
}
