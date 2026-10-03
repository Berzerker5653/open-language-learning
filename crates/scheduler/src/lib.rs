//! Session planner + memory scheduler. Populated by LEARN-003/LEARN-004.

pub const CRATE_NAME: &str = "lts-scheduler";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-scheduler");
    }
}
