//! Durable local storage. Populated by DATA-001/DATA-002.

pub const CRATE_NAME: &str = "lts-storage";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-storage");
    }
}
