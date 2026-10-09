//! K-63: installed pack content is content-addressed and immutable, so the app
//! parses it once per pack version instead of on every command.
//!
//! An installed pack lives at `<data>/packs/<pack-id>/<version>/`. Installing a
//! new version writes a new directory and moves the `current` pointer; nothing
//! edits a version directory in place. That invariant is what makes a
//! process-wide cache keyed by the pack root correct: two lookups can only share
//! a key when they name the same unchanging bytes.
//!
//! The cache holds only content-derived values (the parsed pack and the activity
//! runtime built from it). Anything that reads the *store* — installs, trust
//! state, mastery — changes under the learner and is re-read on every call;
//! caching those would be the kind of stale claim this project refuses.
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, LazyLock, Mutex};

use lts_activity::spec::ActivityRuntime;

type Entry = (Arc<lts_langpack::Pack>, Arc<ActivityRuntime>);

static CACHE: LazyLock<Mutex<HashMap<PathBuf, Entry>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// The activity runtime for one installed pack version: built on first use,
/// shared afterwards. The Scenarios route was re-reading the whole pack per
/// call (~550 ms on the reference machine) while showing the same list.
pub fn runtime(root: &Path) -> Result<Arc<ActivityRuntime>, String> {
    Ok(entry(root)?.1)
}

/// The parsed pack for one installed pack version.
pub fn pack(root: &Path) -> Result<Arc<lts_langpack::Pack>, String> {
    Ok(entry(root)?.0)
}

/// Warm this pack version's entries without returning them. Priming is
/// best-effort: a load failure leaves nothing cached, so the caller that needs
/// the pack sees the real error and a later call can still succeed.
pub fn warm(root: &Path) {
    let _ = entry(root);
}

fn entry(root: &Path) -> Result<Entry, String> {
    // Poison tolerance: a panic inside a loader must not take every later pack
    // read down with it. Entries are inserted whole, so the map is never left
    // half-updated. Load failures are deliberately not cached: a missing or
    // half-installed pack is something the caller can repair and retry.
    let mut cache = CACHE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(hit) = cache.get(root) {
        return Ok(hit.clone());
    }
    let pack = Arc::new(lts_langpack::Pack::load_dir(root).map_err(|e| format!("pack load: {e}"))?);
    let runtime =
        Arc::new(ActivityRuntime::from_pack(&pack).map_err(|e| format!("activity load: {e}"))?);
    let entry = (Arc::clone(&pack), Arc::clone(&runtime));
    cache.insert(root.to_path_buf(), entry.clone());
    Ok(entry)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The cache is only correct while an installed version directory stays
    /// immutable, and only safe while a different version is a different key.
    /// That is the invariant this whole module rests on, so it is checked
    /// rather than assumed.
    #[test]
    fn a_new_version_is_never_served_from_the_old_versions_entry() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        let fixture =
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../tests/fixtures/packs/ja-demo");
        let v1 = root.join("org.openlanguage.ja-demo/0.1.0");
        let v2 = root.join("org.openlanguage.ja-demo/0.2.0");
        copy_dir(&fixture, &v1);
        copy_dir(&fixture, &v2);
        // Same pack id, different bytes, different version key.
        std::fs::remove_file(v2.join("lexicon/entries.jsonl")).unwrap();

        let first = pack(&v1).expect("first version parses");
        let second = pack(&v2).expect("second version parses");
        assert!(
            second.instances().len() < first.instances().len(),
            "a second version directory must be parsed on its own, not served \
             from the entry cached for the first"
        );
        // A repeat call for the same version is shared, not re-parsed.
        assert!(Arc::ptr_eq(&first, &pack(&v1).unwrap()));
    }

    fn copy_dir(from: &Path, to: &Path) {
        std::fs::create_dir_all(to).unwrap();
        for entry in walkdir(from) {
            let rel = entry.strip_prefix(from).unwrap();
            let dest = to.join(rel);
            if entry.is_dir() {
                std::fs::create_dir_all(&dest).unwrap();
            } else {
                if let Some(parent) = dest.parent() {
                    std::fs::create_dir_all(parent).unwrap();
                }
                std::fs::copy(&entry, &dest).unwrap();
            }
        }
    }

    fn walkdir(root: &Path) -> Vec<PathBuf> {
        let mut out = Vec::new();
        let mut stack = vec![root.to_path_buf()];
        while let Some(dir) = stack.pop() {
            for e in std::fs::read_dir(&dir).unwrap().flatten() {
                let p = e.path();
                if p.is_dir() {
                    stack.push(p.clone());
                }
                out.push(p);
            }
        }
        out
    }

    /// Priming is a favour, not a promise: warming a pack that cannot load must
    /// not leave a poisoned or empty entry behind, so the command that really
    /// needs the pack still reports the real error and a later attempt can work.
    #[test]
    fn warming_a_pack_that_cannot_load_caches_nothing() {
        let tmp = tempfile::tempdir().unwrap();
        let missing = tmp.path().join("org.openlanguage.gone/1.0.0");
        warm(&missing);
        assert!(
            pack(&missing).is_err(),
            "a failed prime is not a cached value"
        );
        warm(&missing);
        assert!(
            pack(&missing).is_err(),
            "and retrying the prime changes nothing"
        );
    }
}
