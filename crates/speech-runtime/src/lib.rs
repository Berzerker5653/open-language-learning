//! Provider adapters only; linguistic interpretation comes from the pack.
//! Populated by SPEECH-002..007.

pub mod asr;
pub mod quality;

pub use asr::{SherpaSubprocessAsr, from_wav16, to_wav16};
pub use quality::EnergyVad;

pub const CRATE_NAME: &str = "lts-speech-runtime";
