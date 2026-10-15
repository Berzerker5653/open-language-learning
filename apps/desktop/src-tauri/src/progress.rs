//! K-62: one progress vocabulary for every long operation.
//!
//! The failure this exists to prevent is a progress indicator invented out of
//! nothing — a bar that keeps moving because nothing knows what is happening.
//! So the type is deliberately coarse: `stage` is a phase the engine actually
//! enters, and `percent` is `Some` only when a real fraction is known. Every
//! other stage is reported as indeterminate and the UI says so.

/// What a long operation is doing right now. Emitted to the UI as the
/// `engine-progress` event each time a stage is *entered* — announcing a stage
/// after it finished would still leave the learner watching a frozen button.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct Progress {
    /// Which operation this belongs to (`install-pack`, `install-model`).
    pub operation: &'static str,
    /// What is being worked on: a pack or model id.
    pub subject: String,
    /// The phase entered: `prepare`, `fetch`, `verify`, `install`, `record`,
    /// or the terminal `cancelled` (an operation a cancel stopped).
    pub stage: &'static str,
    /// Genuine fraction of completed work, 0-100, or `None` when the engine
    /// does not know one.
    pub percent: Option<u8>,
}

impl Progress {
    /// A stage the engine has just entered, with no known fraction.
    pub fn stage(operation: &'static str, subject: &str, stage: &'static str) -> Progress {
        Progress {
            operation,
            subject: subject.to_string(),
            stage,
            percent: None,
        }
    }

    /// A stage with a fraction that was actually computed from finished work.
    pub fn with_percent(
        operation: &'static str,
        subject: &str,
        stage: &'static str,
        percent: u8,
    ) -> Progress {
        Progress {
            operation,
            subject: subject.to_string(),
            stage,
            percent: Some(percent),
        }
    }
}

/// Builds the callback long operations report through. Every stage becomes an
/// `engine-progress` event; a delivery failure is ignored because progress is
/// a nicety that must never turn into an install error.
pub fn reporter(app: &tauri::AppHandle) -> impl FnMut(&Progress) {
    use tauri::Emitter;
    move |p| {
        let _ = app.emit("engine-progress", p);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// K-60 lesson, applied to the new channel: the renderer reads these keys
    /// by name, and serde's default snake_case is what crosses. A rename here
    /// breaks the progress line exactly the way `scenarioId` broke the station
    /// — silently, in a real window, with a green test suite.
    #[test]
    fn a_stage_crosses_the_boundary_with_the_field_names_the_renderer_reads() {
        let p = Progress::with_percent("install-pack", "org.openlanguage.ja-JP", "install", 40);
        let json = serde_json::to_value(&p).unwrap();
        assert_eq!(json["operation"], "install-pack");
        assert_eq!(json["subject"], "org.openlanguage.ja-JP");
        assert_eq!(json["stage"], "install");
        assert_eq!(json["percent"], 40);
        // Exactly these four fields, by these names. The renderer has nothing
        // else to read, so a rename that only looks tidy — `percent` becoming
        // `progress`, say — fails here instead of in a real window.
        let fields = json.as_object().unwrap();
        assert_eq!(fields.len(), 4);
        for key in ["operation", "subject", "stage", "percent"] {
            assert!(fields.contains_key(key), "missing field {key}");
        }
    }

    /// The honest default: not knowing a fraction is reported as unknown, not
    /// as a made-up zero the UI would render as an empty bar.
    #[test]
    fn an_unknown_fraction_stays_absent_instead_of_becoming_zero() {
        let p = Progress::stage("install-model", "whisper-tiny", "fetch");
        assert_eq!(p.percent, None);
        assert_eq!(
            serde_json::to_value(&p).unwrap()["percent"],
            serde_json::Value::Null
        );
    }
}
