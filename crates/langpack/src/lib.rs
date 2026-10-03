//! Pack model, schema validation, and queries. Populated by PACK-001..005.

pub const CRATE_NAME: &str = "lts-langpack";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-langpack");
    }
}
