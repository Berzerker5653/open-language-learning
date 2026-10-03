//! Provider adapters only; linguistic interpretation comes from the pack.
//! Populated by SPEECH-002..007.

pub mod acoustic;
pub mod alignment;
pub mod asr;
pub mod interpret;
pub mod prosody;
pub mod quality;
pub mod tts;

pub use acoustic::VoicedDurationFeature;
pub use alignment::WhisperConstrainedAligner;
pub use asr::{SherpaSubprocessAsr, from_wav16, to_wav16};
pub use interpret::VowelLengthInterpreter;
pub use quality::EnergyVad;

pub const CRATE_NAME: &str = "lts-speech-runtime";
