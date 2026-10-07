# AI code + release-hygiene review — 2026-10-06

Status: **AI-reviewed** (no human verification available; owner directed to
proceed and label accordingly). Reviewer: OMP agent, inline (subagent models
unavailable this session).

Scope: Rust workspace crates, desktop app (IPC + UI), pack pipeline
(archive/install/catalog), speech subprocess paths, CI gates, pack data
(ja-JP, ru-RU), docs/state consistency.

## Findings and dispositions

| # | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| 1 | **High** | CI red at HEAD: 789 `languages/ru-RU/curriculum/units/*.yaml` files use YAML anchors/aliases; `tools/validate_handoff.py` rejects aliases by design (handoff integrity rule). The GitHub `schemas` job runs that validator, so the repo failed its own gate. The gap: the CI pack-conformance job validated only ja-JP, never ru-RU. | Fixed: anchors expanded with a per-file semantic-equality check (parsed object before == after; `tools/expand_anchors.py`); validator strictness preserved; ru-RU added to the CI conformance job; `catalog/preview-entries.json` regenerated (archive hashes changed). Handoff validation now PASSES (1842 files). |
| 2 | Medium | Engine-neutrality violation (AGENTS.md: language-specific data out of the engine): evidence for listening/recall/writing recorded hardcoded `ja.activity.demo.*` activity ids (`lib.rs` writing_submit, practice_submit_inner). Learners on eo/ru packs recorded evidence attributing to nonexistent Japanese activity ids. | Fixed: the practiced content record is now the activity id for every modality (the pattern orthography/sentence/contrast paths already used). No policy/scheduler consumer keys on activity ids (provenance only); listening test updated. |
| 3 | Medium | Redirect allowlist gap (`packs.rs`): entry URLs are validated against the GitHub host allowlist, but ureq 2.x follows up to 5 redirects without re-checking the destination host — an allowlisted URL could bounce the client to an arbitrary server. Content integrity was preserved by pinned SHA-256 before install, so this was defense-in-depth, not content compromise. | Fixed: `fetch_capped()` drives all fetches with `redirects(0)` and re-validates https + host allowlist on every hop; relative Locations resolved; 5-hop cap. Test covers the legit github→objects-CDN hop, evil-host bounce, https downgrade, relative Location. |
| 4 | Low | CI formatting gates failing on carried work: 11 files failed `prettier --check`, several Rust files failed `cargo fmt --check` (prior sessions ran tests but not the format gates). | Fixed: formatted; `prettier --check`, `cargo fmt --check`, `clippy -D warnings` all clean. |
| 5 | Low | `catalog/preview-entries.json` pinned stale archive hashes after pack edits (ja-JP contrasts WIP + ru-RU anchor expansion). | Fixed: regenerated via `scripts/build-catalog.sh`. |

## Areas reviewed and found sound (evidence-based)

- **Archive install gate** (`crates/langpack/src/archive.rs`): manifest +
  per-entry path safety (traversal/absolute/backslash/drive/symlink),
  unlisted-entry rejection, per-file + total size caps, decompression-bomb
  cap via `take(size+1)`, per-file SHA-256, install-mode schema validation,
  archive-vs-pack identity agreement, atomic current-pointer swap.
- **Catalog/install** (`apps/desktop/src-tauri/src/packs.rs`): https-only,
  pinned sha256/size, size-capped streaming reads, bait-and-switch identity
  check, trust_state pinned to `community` (catalog review claims never
  promote trust), offline cache.
- **Model manager** (`models.rs`): checksummed staged installs, corruption-
  aware status, no partial install on fetch failure, speech pref validated
  against the whisper runtime catalog (no silent typo → dead aligner).
- **Speech subprocesses** (`asr.rs`, `alignment.rs`, `tts.rs`): argv-array
  exec (no shell), temp stems keyed on pid + atomic counter (race fixed in
  prior session), abstain paths return `ProviderError` reason codes, never
  fake transcripts.
- **Evidence path** (`practice_submit_inner`, `writing_submit`): support
  levels recorded with reveal actions, diagnostic tagging separate from
  formative, FSRS rating only from scored events, per-dimension modality
  mapping intact.
- **Pack data**: ja-JP and ru-RU both pass `validate`/`lint`/`test`
  (0 errors) after fixes; handoff validator green.

## Verification performed

- `cargo test --workspace`: 244 passed, 0 failed (incl. 51 desktop lib).
- `vitest`: 98 passed; `tsc --noEmit` clean; `eslint` clean.
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -D warnings`: clean.
- `prettier --check .`: clean.
- `tools/validate_handoff.py`: PASS (1842 data files; 2 known warnings).
- `langpack validate/lint/test` for ja-JP and ru-RU: 0 errors.
- `scripts/build-catalog.sh`: 4 entries regenerated.

## Not covered (unchanged gates)

- Runtime desktop smoke on real hardware (CI `desktop-smoke` job covers
  Linux; Windows/macOS remain compile-only per PLAT-001).
- Screen-reader matrix (O-03), speech calibration (SPEECH-007), qualified
  content review (REVIEW-001/JA-A1-003): human gates, stay open.
- Linguistic correctness of pack content: AI screening only (labeled draft;
  see `docs/review/ai-screening-2026-10-05/`).
