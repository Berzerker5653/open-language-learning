//! Pack path safety and digest verification (docs/04, docs/08).
//! Populated by PACK-004/SEC-001 and the sweep-pack-trust hardening:
//! the component-walk refusals every pack-declared path must pass
//! before any filesystem access, and the SHA-256 pinning every shipped
//! byte is verified against.

pub mod digests;
pub mod paths;

pub const CRATE_NAME: &str = "lts-security";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-security");
    }
}
