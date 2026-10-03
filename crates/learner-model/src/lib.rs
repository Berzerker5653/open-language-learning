//! Evidence -> mastery derivation. Populated by LEARN-002/LEARN-005.

pub const CRATE_NAME: &str = "lts-learner-model";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-learner-model");
    }
}
