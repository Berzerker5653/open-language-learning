//! Core domain types. Must stay independent of any specific language pack
//! and of provider implementations (docs/07 dependency rule).

/// Placeholder so the workspace builds before ARCH-001 lands real types.
pub const CRATE_NAME: &str = "lts-domain";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-domain");
    }
}
