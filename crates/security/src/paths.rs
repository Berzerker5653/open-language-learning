//! Component-walk path safety for pack-supplied relative paths
//! (docs/04, docs/08). Every path a pack declares — zip entry names and
//! `media/manifest.jsonl` `file` values — must pass one of these checks
//! BEFORE any filesystem access on it. A raw `Path::join` of a declared
//! string lets `..` segments escape the pack root (sweep-pack-trust: the
//! media audit turned that into a read oracle for any readable file).

use std::path::{Component, Path};

/// Validate an archive/pack-relative entry name; `None` when unsafe
/// (traversal, absolute, backslash, drive letter, empty or dot
/// components). `Some` carries the normalized `part/part/…` form.
pub fn safe_rel(name: &str) -> Option<String> {
    if name.is_empty() || name.contains('\\') || name.contains(':') || name.starts_with('/') {
        return None;
    }
    let mut parts = Vec::new();
    for c in Path::new(name).components() {
        match c {
            Component::Normal(p) => parts.push(p.to_string_lossy().into_owned()),
            _ => return None,
        }
    }
    if parts.is_empty() {
        return None;
    }
    Some(parts.join("/"))
}

/// Validate a media-asset row's declared `file` value: a safe relative
/// path (same refusals as [`safe_rel`]) that lives strictly inside
/// `media/` — the first component must be `media` and at least one more
/// component must follow. `media/` itself names no asset.
pub fn media_rel(rel: &str) -> Option<String> {
    let normalized = safe_rel(rel)?;
    let mut parts = normalized.split('/');
    if parts.next() != Some("media") {
        return None;
    }
    parts.next()?;
    Some(normalized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_rel_accepts_plain_relative_paths() {
        assert_eq!(safe_rel("manifest.yaml").as_deref(), Some("manifest.yaml"));
        assert_eq!(
            safe_rel("media/ja.demo.kite-0.wav").as_deref(),
            Some("media/ja.demo.kite-0.wav")
        );
        assert_eq!(safe_rel("a/b/c.jsonl").as_deref(), Some("a/b/c.jsonl"));
    }

    #[test]
    fn safe_rel_refuses_every_escape_shape() {
        for bad in [
            "",
            "../escape.txt",
            "media/../../outside-secret.txt",
            "media/../inside-but-rewritten.wav",
            "./current-dir.wav",
            "..",
            ".",
            "/absolute/path",
            "C:/Windows/system32",
            "media\\windows\\sep.wav",
            "C:drive-relative",
        ] {
            assert_eq!(safe_rel(bad), None, "{bad:?} must be refused");
        }
    }

    #[test]
    fn media_rel_requires_a_path_strictly_under_media() {
        assert_eq!(media_rel("media/a.wav").as_deref(), Some("media/a.wav"));
        assert_eq!(
            media_rel("media/sub/dir/a.wav").as_deref(),
            Some("media/sub/dir/a.wav")
        );
        for bad in [
            "a.wav",
            "media",
            "media/",
            "mediabox/a.wav",
            "media/../outside.wav",
            "media/../../outside.wav",
            "MEDIA/a.wav",
            "../media/a.wav",
            "/media/a.wav",
        ] {
            assert_eq!(media_rel(bad), None, "{bad:?} must be refused");
        }
        // An interior `.` never survives the component walk: the join
        // stays strictly inside `media/`, so it normalizes rather than
        // being refused (no escape is expressible with it).
        assert_eq!(media_rel("media/./a.wav").as_deref(), Some("media/a.wav"));
    }
}
