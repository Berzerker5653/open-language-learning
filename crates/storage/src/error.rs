use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("sqlite: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("json: {0}")]
    Json(#[from] serde_json::Error),
    #[error("migration {version} failed: {message}")]
    Migration { version: i64, message: String },
    #[error(
        "database schema version {found} is newer than this build supports ({max}); upgrade the app before opening this profile"
    )]
    TooNew { found: i64, max: i64 },
    #[error("not found: {0}")]
    NotFound(String),
    #[error("already present: {0}")]
    AlreadyExists(String),
    /// A value the caller handed in cannot be stored honestly (e.g. a
    /// non-canonical `due_at`; sweep finding 9, 2026-10-26).
    #[error("invalid value: {0}")]
    Invalid(String),
}
