//! Provider adapters only; linguistic interpretation comes from the pack.
//! Populated by SPEECH-001..007.

pub const CRATE_NAME: &str = "lts-speech-runtime";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-speech-runtime");
    }
}
