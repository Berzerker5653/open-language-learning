//! Pack sandbox and integrity validation. Populated by PACK-004/SEC-001.

pub const CRATE_NAME: &str = "lts-security";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-security");
    }
}
