# SPEC verdict — SPEECH-CATALOG-001 (code 6626cc73, chore 16acebff, ledger 873bd3db)

**Verdict: PASS-WITH-NOTES.** The lane delivers the frozen contract
(state/notes/SPEECH-CATALOG-001.md + ADR-0042). Every named deliverable is
present and the fail-closed gate resisted every defeat attempt except one
hardening gap. One medium defect is a design-governance conflict with
ADR-0042 (not a broken build). Defects become FIX cards, not silent fixes.

## Contract item-by-item

| Item | Verdict | Evidence |
|---|---|---|
| 1. Catalog v2 fields parsed + validated | MET (note D4) | `ModelEntry.language/recommended` (`#[serde(default)]`, carried into `ModelStatus`); public `catalog/models.json` carries v2 + fields |
| 2. Remote catalog adopted only after FULL validation; fail-closed | MET | `validate_remote_catalog` (version ≥2 numeric, 1..=200 models, unique non-empty ids ≤200 chars, no `..` path segment, payload pin https+github.com/huggingface.co exact-host+no-userinfo/no-port+size>0+lowercase-sha256, or explicit `unpublished`); `refresh_remote_catalog` caps body at 4 MiB (take cap+1 then reject), status==200 required; cache written only after full validation; `load_catalog_at` re-validates the cache on EVERY read → tampered cache falls back to bundled; every reject path tested or reviewer-probed (below) |
| 3. speech.json v1→v2 migration + resolution + off | MET | `load_speech_pref` migrates `{asr_model}` (any schema_version ≠ 2) → `default_model`, empty `per_language`; v2-with-both-keys ignores `asr_model` (v2 wins); `asr_model_for` = `per_language[locale] ?? default_model`; `off` valid at both levels; `save_speech_pref` validates every string against the ACTIVE catalog, whisper.cpp only; tests `speech_pref_v1_migrates_on_load`, `speech_pref_per_language_override_resolves`, `speech_pref_defaults_off_and_validates_selection` |
| 4. Locale from PACK MANIFEST at every consumption site | MET | All `aligner_probe` callers at 6626cc73: pronunciation (6658), dictation (7037), free-speaking (7333) pass `pack_target_locale(&pack_dir)` from `manifest.yaml`; remaining `None` sites are device-level `aligner_status_at` (6494) and the dev `perf_asr_setup` (6904) — not pack consumption paths. No caller uses UI language or a guess. Picker rows key on `InstalledPack.locale`, which is the same raw manifest `target_locale` (`ja-JP`/`ru-RU`) the backend resolves — keys match across the stack |
| 5. Honest runtime-gating copy | MET (note D2) | The per-locale ProseNote states plainly: the built-in listening check always uses the shipped model; picks govern wherever installed models run; Off abstains. No instant-effect lie. But see D2 re "weekly" |
| 6. Settings per-language pickers + refresh | MET (note D3) | Per-locale `<select>` rows (follow-default / Off / catalog models, "(not downloaded)" markers), "Check for newer models" button with busy state; wiring in App.tsx preserves overrides on the legacy `set_speech_model` compat path |

## Gate-defeat attempts (reviewer adversarial tests, throwaway module in the detached worktree, not committed)

All rejected as required: non-numeric `catalog_version`; 201 models; empty id;
lookalike host `github.com.evil.com`; userinfo host; port `github.com:999`;
plain http; uppercase sha256; `size_bytes: 0`; nested `models/../../escape.bin`
path; tampered cache variants (garbage JSON, missing fields, numeric
`catalog_version`) all fall back to the bundled catalog. `unpublished`
placeholder exempt from pinning but still `installable()==false` — refused
before any connection (existing tests `unpublished_payloads_are_never_offered_or_fetched`,
`a_placeholder_url_is_refused_whatever_the_marker_says`,
`remote_catalog_validation_is_fail_closed`,
`remote_catalog_cache_wins_when_valid_and_falls_back_when_tampered` cover the
named defeat list: version, duplicates, evil host, `..`, tampered cache).

**One real hole found (D6):** an entry with `files: []` skips the pin check
(`!entry.files.is_empty() && ...`) and passes validation, and `installable()`
returns true for it (vacuous `all()`), so a hostile catalog can list a
phantom model that the UI offers to "install" (a harmless empty install, but
the gate says installable for something with no pinned payload).

## Defects (spawned as FIX cards, not fixed here)

- **D1 (MED, design governance):** startup background catalog refresh that
  silently ADOPTS the fetched catalog (`run()` in lib.rs, gated only by
  `remote_catalog_is_stale`) re-introduces exactly what ADR-0042 "Alternatives
  considered" REJECTED ("Silent background auto-refresh on every launch:
  rejected — a surprise picker change is worse than an explicit check").
  It is also not in the card's ship list (items 1–6). Either amend ADR-0042
  with the bounded-staleness rationale or make adoption explicit/user-visible.
- **D2 (minor, copy honesty):** Settings copy and a code comment promise the
  app "checks at startup and weekly"; the only mechanism is a startup-time
  check with a 7-day mtime window. A long-running session never re-checks,
  and no weekly timer exists (frontend comment even claims one does). Card
  §5's honesty standard + CODING_STANDARDS "claims measured from artifacts".
- **D3 (MED, test minimum):** zero frontend tests for the new UI — per-locale
  picker (set/clear/off), refresh affordance, error paths. AGENTS.md: "Every
  feature change must include the narrowest useful automated test." Backend
  coverage is genuinely strong; the frontend shipped with none.
- **D4 (minor):** ADR-0042 says Catalog v2 = `models/catalog.json` with
  `catalog_version: 2`, but the bundled `apps/desktop/src-tauri/models/catalog.json`
  still says `catalog_version: "0.1.0"` (only the public copy was bumped).
  Harmless at runtime (bundled copy is never `validate_remote_catalog`-checked)
  but the contract names that file and version.
- **D5 (minor):** validation rules with no test pinning them: the 200-entry
  cap, empty-id rejection, non-numeric version, 4 MiB body cap (reviewer probe
  confirms all behave correctly — they are just unpinned against regression).
- **D6 (minor, hardening):** zero-`files` entry passes validation and reads
  `installable()==true` (see defeat section). Require non-empty files (or
  explicit unpublished) in `validate_remote_catalog` and/or `installable()`.
- **D7 (note):** `aligner_status_at` probes with `None` → device default only.
  A config with `default_model: "off"` + per-locale picks shows device speech
  status as `speech-model-off` while per-locale speaking activities are live.
  Defensible (status is device-level) but worth a product decision.
- **D8 (cosmetic):** picker rows render raw locale codes (`ru-RU`) as learner
  labels; settings.tsx comment says "speech-pref.json", file is `speech.json`.

## Out-of-scope scan

- Startup auto-refresh: out of card ship list, conflicts with ADR → D1.
- App.tsx `writing_check` call reformat (prettier fallout): cosmetic, fine.
- chore 16acebff: pre-existing APP-SPLIT eslint rot removed in its own commit
  before the lane so the lane gate battery is honest — acceptable, disclosed.
