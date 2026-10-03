//! Actionable validation diagnostics.

use serde::Serialize;

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Info,
    Warning,
    Error,
}

/// One actionable finding. `file` is pack-root-relative; `path` is a JSON
/// pointer into the document (JSONL documents prefix `/<line>`).
#[derive(Serialize, Clone, Debug)]
pub struct Diagnostic {
    pub file: String,
    pub path: String,
    pub code: String,
    pub message: String,
    pub severity: Severity,
}

impl Diagnostic {
    pub fn new(
        file: impl Into<String>,
        path: impl Into<String>,
        code: impl Into<String>,
        message: impl Into<String>,
        severity: Severity,
    ) -> Self {
        Self {
            file: file.into(),
            path: path.into(),
            code: code.into(),
            message: message.into(),
            severity,
        }
    }
}
