//! Placeholder CLI. The real author workflow (init/validate/build/inspect...)
//! is delivered by PACK-005; until then the binary exits with a clear notice.

fn main() {
    eprintln!(
        "langpack CLI is not implemented yet (roadmap task PACK-005). \
         Use `python tools/validate_handoff.py` for scaffold validation."
    );
    std::process::exit(2);
}
