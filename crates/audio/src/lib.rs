//! Capture/processing abstractions. Local-only by default; recordings are
//! never uploaded without explicit provider opt-in (docs/08).

pub const CRATE_NAME: &str = "lts-audio";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-audio");
    }
}
