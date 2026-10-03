//! Speech provider interfaces. Must compile without any concrete provider
//! dependency (ARCH-001 acceptance). Populated by ARCH-001/SPEECH tasks.

pub const CRATE_NAME: &str = "lts-speech-api";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-speech-api");
    }
}
