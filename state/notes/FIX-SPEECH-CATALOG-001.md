# FIX-SPEECH-CATALOG-001 — speech-model catalog review fixes (t_0dafc90b)

Fix lane for the defects found by REVIEW-SPEECH-CATALOG-001
(state/evidence/REVIEW-SPEECH-CATALOG-001/spec-verdict.md) against the
reviewed code 6626cc73 (SPEECH-CATALOG-001). Board card `t_0dafc90b`.

## Scope (frozen)

- **D1 (design governance):** the startup background catalog refresh that
  silently adopts a fetched catalog (lib.rs `run()`, gated by
  `remote_catalog_is_stale`) conflicts with ADR-0042's rejected "silent
  background auto-refresh". DECIDED: option (a) — amend ADR-0042 to adopt the
  bounded-staleness form (7-day window, full validation + fail-closed on
  every adoption, metadata-only, no automatic model download). Decision
  record: state/evidence/FIX-SPEECH-CATALOG-001-FIX/decision-a.md.
  **Owner veto of (a) flips to option (b): make catalog updates an explicit
  surface — a "N new models available" notice in Settings the learner acts
  on (auto-fetch kept, adoption manual).** Only (a) is implemented.
- **D2 (copy honesty):** Settings copy + App/settings comments claimed the
  app "checks at startup and weekly"; the only mechanism is a startup check
  with a 7-day mtime freshness window (no in-session timer). Copy now says
  "checks when it starts, if it hasn't checked in a week". No i18n locale
  files exist for this surface (all learner copy is inline English), so
  "locales in sync" is vacuous here; tools/audit_learner_copy.py green.
- **D3 (test minimum):** new `apps/desktop/src/settings-speech-catalog.test.tsx`
  (happy-dom interactive root, same harness shape as mywords-undo.test.tsx):
  per-locale rows from speechPackLocales, select/off/clear callback args,
  refresh disabled + aria-busy while catalogBusy (+ enabled click fires the
  handler), stored override preselected, error surfaced via role=alert.
- **D4:** bundled `apps/desktop/src-tauri/models/catalog.json`
  `catalog_version` "0.1.0" → "2" (entries were already v2-shaped); note
  field rewritten to state the file's actual role (bundled fallback; the
  public `catalog/models.json` is the authoritative remote copy).
- **D5:** `remote_catalog_validation_is_fail_closed` extended with: 200/201
  entry-cap boundary, empty-id reject, non-numeric version rejects
  ("two", "2.1"). The 4 MiB body cap lives in `refresh_remote_catalog`
  (network path) — not reachable from a pure struct test; left unpinned,
  reviewer-probed correct.
- **D6:** `validate_remote_catalog` rejects a published entry with an empty
  files list; `installable()` no longer returns vacuous true for it
  (unpublished placeholders stay exempt from the files requirement and keep
  reading not-installable). Pinned in the same test.

Out of scope: D7 (aligner_status_at device-level None) and D8 (raw locale
labels, speech-pref.json comment) are notes/cosmetic in the verdict — not in
this card.

## Acceptance

1. ADR-0042 amended as (a) with the decision cited; option (b) recorded as
   the veto path.
2. Copy/comments describe the real mechanism; copy audit green.
3. The new vitest file covers picker rows, callbacks, busy refresh, error.
4. Bundled catalog declares `catalog_version: "2"`.
5. Fail-closed test pins cap boundary, empty id, non-numeric version.
6. Empty-files published entry: validation rejects, `installable()` false.
7. Lane gates green: cargo fmt --all --check; cargo clippy -p lts-desktop
   --all-targets -- -D warnings; cargo test -p lts-desktop --lib (zero
   failures beyond the four known FIX-PACK-K65-001 names); tsc; vitest;
   prettier + eslint on changed files; tools/audit_learner_copy.py.

## Ledger

- state/evidence/FIX-SPEECH-CATALOG-001-FIX/gates.log
- state/evidence/FIX-SPEECH-CATALOG-001-FIX/decision-a.md
