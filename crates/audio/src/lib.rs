//! Placeholder crate: no capture or processing code lives here. Microphone
//! capture is implemented and tested in the desktop frontend
//! (`apps/desktop/src/capture.ts`: `CaptureOwner`, `MAX_CAPTURE_SECONDS`);
//! scored-utterance analysis lives in `crates/speech-runtime`. Local-only by
//! default; recordings are never uploaded without explicit provider opt-in
//! (docs/08). Delete this crate when nothing references it.

pub const CRATE_NAME: &str = "lts-audio";

#[cfg(test)]
mod tests {
    #[test]
    fn crate_identifies_itself() {
        assert_eq!(super::CRATE_NAME, "lts-audio");
    }
}
