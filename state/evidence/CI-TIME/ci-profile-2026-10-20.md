# CI profile — run 39459901584

## step-timings

Profiled from GitHub API for **run 39459901584** (workflow CI, head_sha d2f8069, fully green), repo `Berzerker5653/open-language-learning`.
Job/step durations computed from `started_at`/`completed_at` on `GET /repos/.../actions/jobs/<id>` — no inference.

### Per-job totals (all jobs start in parallel within ~12 s; run wall clock = max job)

| job | started (UTC) | finished (UTC) | duration (s) | sum(steps) (s) | job id |
|---|---|---|---|---|---|
| security | 16:43:12 | 16:46:41 | **209** | 207 | 118756334361 |
| platform-compile (windows-latest) | 16:43:14 | 16:45:10 | **116** | 114 | 118756334693 |
| platform-compile (macos-latest) | 16:43:24 | 16:44:37 | **73** | 68 | 118756334748 |
| schemas | 16:43:13 | 16:50:52 | **459** | 453 | 118756334778 |
| rust | 16:43:13 | 17:30:05 | **2812** | 2809 | 118756334908 |
| desktop-smoke | 16:43:13 | 16:50:28 | **435** | 432 | 118756334942 |
| web | 16:43:13 | 16:43:52 | **39** | 35 | 118756334967 |

**Wall-clock-defining job: `rust` — 2812 s (46.9 min)**, run span 16:43:11→17:30:05 (~2814 s). Every other finished job ends by 16:50:52, so **2251 s (80% of the wall clock) is pure `rust` tail after the 2nd-to-last job (`schemas`, 459 s) completes**. `platform-bundles` was skipped (manual). Second-longest job: `schemas` 459 s; third: `desktop-smoke` 435 s.

### Full step table — `rust` job (id 118756334908, 2812 s, the wall-clock job)

| # | step | duration (s) |
|---|---|---|
| 1 | Set up job | 3 |
| 2 | Run actions/checkout@v5 | 2 |
| 3 | Install Tauri system dependencies | 36 |
| 4 | Run dtolnay/rust-toolchain@1.97.1 | 8 |
| 5 | Run Swatinem/rust-cache@v2 | 32 |
| 6 | Cache published pack archives | 5 |
| 7 | Restore reference-pack audio (published archives) | 166 |
| 8 | Aligner sidecar staging script regression test | 0 |
| 9 | Pack bundle staging script regression test | 2 |
| 10 | Run cargo fmt --all --check | 0 |
| 11 | Run cargo clippy --workspace --all-targets -- -D warnings | 8 |
| 12 | Run cargo test --workspace | 2459 |
| 13 | Pack conformance (ja-JP + ru-RU + example template) | 84 |
| 14 | Pack conformance for the generated proofs (eo-community, ar-ma) | 3 |
| 15 | Post Cache published pack archives | 0 |
| 16 | Post Run Swatinem/rust-cache@v2 | 1 |
| 17 | Post Run actions/checkout@v5 | 0 |
| 18 | Complete job | 0 |

### Full step table — `desktop-smoke` job (id 118756334942, 435 s)

| # | step | duration (s) |
|---|---|---|
| 1 | Set up job | 3 |
| 2 | Run actions/checkout@v5 | 2 |
| 3 | Install Tauri system dependencies | 33 |
| 4 | Run pnpm/action-setup@v4 | 3 |
| 5 | Run actions/setup-node@v5 | 7 |
| 6 | Run dtolnay/rust-toolchain@1.97.1 | 9 |
| 7 | Run Swatinem/rust-cache@v2 | 26 |
| 8 | Cache published pack archives | 5 |
| 9 | Restore reference-pack audio (published archives) | 145 |
| 10 | Run ./scripts/smoke-desktop.sh | 199 |
| 11 | Post Cache published pack archives | 0 |
| 12 | Post Run Swatinem/rust-cache@v2 | 0 |
| 13 | Post Run actions/setup-node@v5 | 0 |
| 14 | Post Run pnpm/action-setup@v4 | 0 |
| 15 | Post Run actions/checkout@v5 | 0 |
| 16 | Complete job | 0 |

### All other jobs — steps with dur >= 2 s (remainder are 0–1 s setup/post noise)

| job | step | duration (s) |
|---|---|---|
| security | Run actions/checkout@v5 | 2 |
| security | Secret scan (gitleaks) | 4 |
| security | Run pnpm/action-setup@v4 | 4 |
| security | Run actions/setup-node@v5 | 6 |
| security | JS dependency audit | 2 |
| security | Run dtolnay/rust-toolchain@1.97.1 | 8 |
| security | Rust advisory audit | 173 |
| security | SBOM (CycloneDX 1.5, Rust + npm) | 5 |
| platform-compile (windows-latest) | Set up job | 2 |
| platform-compile (windows-latest) | Run actions/checkout@v5 | 9 |
| platform-compile (windows-latest) | Run pnpm/action-setup@v4 | 12 |
| platform-compile (windows-latest) | Run actions/setup-node@v5 | 16 |
| platform-compile (windows-latest) | Run pnpm install --frozen-lockfile | 4 |
| platform-compile (windows-latest) | Run dtolnay/rust-toolchain@1.97.1 | 13 |
| platform-compile (windows-latest) | Run Swatinem/rust-cache@v2 | 26 |
| platform-compile (windows-latest) | Compile-check desktop app | 28 |
| platform-compile (windows-latest) | Post Run actions/checkout@v5 | 3 |
| platform-compile (macos-latest) | Set up job | 2 |
| platform-compile (macos-latest) | Run actions/checkout@v5 | 4 |
| platform-compile (macos-latest) | Run pnpm/action-setup@v4 | 4 |
| platform-compile (macos-latest) | Run actions/setup-node@v5 | 13 |
| platform-compile (macos-latest) | Run pnpm install --frozen-lockfile | 2 |
| platform-compile (macos-latest) | Run dtolnay/rust-toolchain@1.97.1 | 8 |
| platform-compile (macos-latest) | Run Swatinem/rust-cache@v2 | 17 |
| platform-compile (macos-latest) | Compile-check desktop app | 16 |
| schemas | Run actions/checkout@v5 | 2 |
| schemas | Run actions/setup-python@v6 | 3 |
| schemas | Run python -m pip install -r tools/requirements.txt | 2 |
| schemas | Run python tools/validate_handoff.py --require-explicit-ledger-records | 13 |
| schemas | Run python -m unittest discover -s tools -p 'test_validate_handoff.py' | 429 |
| web | Run actions/checkout@v5 | 2 |
| web | Run pnpm/action-setup@v4 | 3 |
| web | Run actions/setup-node@v5 | 8 |
| web | Run pnpm install --frozen-lockfile | 2 |
| web | Run pnpm fmt:check | 5 |
| web | Run pnpm lint | 3 |
| web | Run pnpm test | 8 |

### Top-10 slowest steps across the run

| rank | duration (s) | job | step |
|---|---|---|---|
| 1 | 2459 | rust | Run cargo test --workspace |
| 2 | 429 | schemas | Run python -m unittest discover -s tools -p 'test_validate_handoff.py' |
| 3 | 199 | desktop-smoke | Run ./scripts/smoke-desktop.sh |
| 4 | 173 | security | Rust advisory audit |
| 5 | 166 | rust | Restore reference-pack audio (published archives) |
| 6 | 145 | desktop-smoke | Restore reference-pack audio (published archives) |
| 7 | 84 | rust | Pack conformance (ja-JP + ru-RU + example template) |
| 8 | 36 | rust | Install Tauri system dependencies |
| 9 | 33 | desktop-smoke | Install Tauri system dependencies |
| 10 | 32 | rust | Run Swatinem/rust-cache@v2 |

### rust job internals (from fetched job logs, timestamp-parsed)

- `Run cargo test --workspace` spans 16:47:35→17:28:34 (2459 s). Compilation is **not** the cost: `Finished dev profile in 7.68s`, `Finished test profile in 25.23s` — rust-cache hit makes compile ~33 s. **Test execution ≈ 2433 s** (sum of per-binary `finished in`).
- Per-binary breakdown (cargo prints per test target): **`lts_desktop` unittests src/lib.rs = 2392 s of the 2459 s (97%)**. All other 61 binaries/test-targets sum to ~41 s; the biggest are `validate.rs` 15.5 s and `cli.rs` 14.2 s.
- Inside `lts_desktop` lib tests (169 tests, 2 ignored): **32 "test has been running for over 60 seconds" warnings**; timestamp gaps show ≥4 s stalls totalling 2341 s, headlined by tests at ~194–200 s each: `an_installed_pack_that_is_also_bundled_is_listed_exactly_once` (200 s), `russian_cyrillic_practice_unlocks_the_greetings_gate` (197 s), `pronunciation_demo_comes_from_pack_contrasts` (196 s), `goal_map_surfaces_pack_goals_with_prereqs_and_mastery` (196 s), `dictation_target_prefers_kana_only_and_rotates` (196 s), `pack_claims_report_installed_pack_data_without_upgrading_trust` (194 s), `the_claim_report_survives_a_trust_change_without_lying_about_it` (188 s), `stress_display_settings_are_data_driven_and_persisted` (184 s), `writing_targets_are_parsed_once_per_version_root` (121 s). These are the reference-pack-backed UI tests; the binary runs with default parallelism but the long tests dominate the tail.
- `cargo clippy --workspace --all-targets -- -D warnings`: **8 s** (rust-cache full hit); `cargo fmt --all --check`: 0 s.

### Cache evidence (rust job logs)

- `Swatinem/rust-cache@v2` (32 s restore): **full cache hit** — key `v0-rust-rust-Linux-x64-d0ea4c79-855319b8`, **Cache Size ~1202 MB (1,259,887,879 B)**, restored 16:44:02→16:44:34. Post step 1 s. No miss.
- `Cache published pack archives` (actions/cache@v4, 5 s): **hit** on key `pack-audio-dbbda61c...`, **~607 MB (636,414,156 B)**. Post step: "Cache hit occurred on the primary key ... not saving cache" (0 s).
- `Restore reference-pack audio (published archives)` = 166 s even on cache hit: 5 s cache download + 85 s ja-JP re-verify/copy (4902 files, "already valid=0") + 79 s ru-RU (4856 files). The languages/ trees are fresh checkouts so every file is re-verified every run. desktop-smoke pays the same step at 145 s.

### apt-install durations

- rust `Install Tauri system dependencies`: **36 s** (16:43:18→16:43:54; apt-get update ~9 s + 61.1 MB download incl. libwebkit2gtk-4.1 25.5 MB + unpack). desktop-smoke: **33 s**. platform-compile jobs (win/mac) don't apt-install.

### Wall-clock structure (implications)

- All jobs launch in parallel (16:43:12–16:43:24). Nothing else matters until `rust` finishes at 17:30:05; the other six jobs are all done by 16:50:52.
- To cut wall time without weakening any gate, the entire problem is the `rust` job's single 2459 s `cargo test --workspace` step (97% of it = the `lts_desktop` lib test binary) plus the 166 s audio re-verify. Splitting `lts_desktop` lib tests across parallel jobs (e.g. `cargo test --workspace -p lts_desktop -- --skip <fast>` vs the slow reference-pack tests, or `--test-threads`/partitioning) attacks 2392 s directly; the ~33 s of compile, 8 s clippy, 36 s apt, 32 s cache restore are already near-zero.

_(section authored by scout `MedicalConstrictor` — step-timings)_

---

## rust-local-profile

Local profiling of the rust-job phases on the gaming PC. Machine facts: **32 logical cores** (not 16), rustc/cargo 1.97.1, `target/` = 93 GB **warm** tree. CI ratio used: test-execution is ~pure-CPU+I/O; local 455-test CPU-sum × (4/32 cores) ≈ CI step time, and it checks out (see validation).

### Phase 1 — fmt/clippy
- `cargo clippy --workspace --all-targets -- -D warnings` (warm target, some tauri/tao check artifacts re-stale): **10.9 s** real (21.4 s user). CI with rust-cache: 8 s. `cargo fmt` is ~0. **Not a target.**

### Phase 2 — cargo test (the 2459 s CI step)
`cargo nextest run --workspace` (report-time profile; nextest 0.9.148, config `report-time=true, slow-timeout=60s` passed via `--config-file /tmp/nextest-prof.toml`, repo untouched):
- Wall: **415.9 s run** (+42 s incremental build; 458 s total), **455 tests, 455 passed** (33 flagged slow, 2 skipped).
- **CPU-sum of timed tests: 9457 s.** Validation of the local→CI ratio: 9457 s ÷ 4 CI cores = 2364 s vs CI measured 2433 s of test execution. Consistent.
- Distribution is pathological: **33 tests ≥ 60 s account for 9372 s = 99.1 % of all test CPU. The other 306 tests total 28 s.**
- All 33 are in **`lts-desktop`** (lib tests in `apps/desktop/src-tauri/src/lib.rs`, 15 517 lines): 94 tests, median 0.45 s, mean 99.95 s.
- **Top 15 slowest (wall s under 32-way nextest parallelism):**
  1. 413.7 `tests::stress_display_settings_are_data_driven_and_persisted`
  2. 411.3 `tests::the_aligner_language_comes_from_the_pack_manifest`
  3. 411.2 `tests::provenance_payload_covers_every_installed_pack_verbatim`
  4. 280.6 `tests::bundled_pack_phrase_entries_carry_valid_slots`
  5. 279.8 `tests::goal_map_surfaces_pack_goals_with_prereqs_and_mastery`
  6. 279.8 `tests::sharded_pack_directories_reach_every_reader`
  7. 279.8 `tests::switching_the_studied_pack_changes_what_the_plan_and_mastery_see`
  8. 278.9 `tests::reading_lookup_of_the_self_intro_sentence_names_the_word_not_its_interior`
  9. 278.9 `tests::katakana_and_kana_words_unlock_with_the_letters_they_need`
  10. 278.6 `tests::profile_export_writes_bundle_and_delete_is_one_shot`
  11. 278.5 `tests::dictation_target_prefers_kana_only_and_rotates`
  12. 278.3 `tests::bundled_japanese_pack_installs_and_records`
  13. 278.2 `tests::an_installed_pack_that_is_also_bundled_is_listed_exactly_once`
  14. 277.7 `tests::a_supported_backup_restores_saved_words_and_history`
  15. 277.6 `tests::phrase_entries_carry_slots_and_target_the_right_slot`
  (next: 277.5 pronunciation_check…, down to 150.1 `writing_targets_are_parsed_once_per_version_root`; the other 3 slow are 260–277 s: russian_contrast_arrives…, a_contrast_the_app_cannot_measure…, russian_cyrillic_practice….)
- **Root cause (named, absurdly slow):** every one of these calls the test helper `install_bundled_pack(data, "org.openlanguage.ja-jp.reference")` (26 call sites; 8 more reference ru-RU; 15 `archive::build(` sites) which runs `lts_langpack::archive::build` over **languages/ja-JP = 409 MB / 4903 wavs** (ru-RU 392 MB / 4857): Pack::load_dir + Scaffold validate + `audit_media` hashing every wav + deterministic in-memory archive of all bytes + SHA-256 — all in the **unoptimized dev profile** — then `archive::install` re-extracts and re-verifies, then `warm_pack` re-parses the whole pack. **Solo measurement, zero contention: `bundled_japanese_pack_installs_and_records` = 133.2 s for ONE test.** The 270–413 s parallel numbers are that ×2–3 under 32-way I/O thrash. Nothing else in the workspace is heavy: `lts-langpack::validate` 31 s, `lts-langpack-cli::cli` 12 s, everything else < 5 s combined.

### Phase 3 — pack-conformance block (ci.yml lines 58–91, CI 84 s + 3 s)
- First `cargo build -q -p lts-langpack-cli` after clippy: **12.9 s** (clippy check artifacts don't feed `cargo run`; after `cargo test --workspace` on CI the bin is already built).
- The 24 `cargo run -q` invocations do **not recompile**: warm per-invocation cargo overhead measured **228 ms** (via `cargo run -q … -- lint example-pack` = 0.23 s vs direct binary 0.03 s).
- **Direct `target/debug/langpack` per-command timings (warm):**
  - ja-JP: validate 9.31 s, lint 9.29 s, **test 9.32 s**, audit-curriculum 0.62, audit-lexicon 0.63, audit-licenses 0.60
  - ru-RU: validate 8.76, lint 8.83, **test 8.81**, (audits ~0.6)
  - example-pack lint 0.03; all 14 eo-community/ar-ma commands ≤ 0.04 s each
  - **Total pure work: 56.5 s** for all 24 commands; +24×0.228 s cargo overhead ⇒ ≈ 62 s locally (CI 4-core: 87 s, matches).
  - The ~9 s cost of validate/lint/test is re-loading + media-auditing the 400 MB wav tree **three times per reference pack**; the audits don't touch media (0.6 s).
- Audio (`ls languages/*/media`) **is present locally** (409 MB / 392 MB), so these are the real install-mode numbers; locally identical to the CI-restored state.

### Recommendations (ranked by expected CI-minute savings; no gate weakened)
1. **Shared one-shot pack fixture in `lts-desktop` lib tests — est. −12 to −18 CI min.** One process-wide `OnceLock` install of the ja-JP reference (and one ru-RU archive byte-set) per test binary into a leaked shared temp dir; the ~27 tests that only *query an installed pack* point at the shared `packs/` dir with their own `profiles.db`. Keep genuine install-path asserts (`bundled_japanese_pack_installs_and_records`, `installing_a_pack_warms_its_content_for_the_first_visit`, `an_installed_pack_that_is_also_bundled_is_listed_exactly_once`, the two ru install tests, `provenance_payload…`) doing their own installs. Removes ~3500–4000 CPU-s ≈ 900–1000 CI s. This is the "absurdly slow test" exception: 26 identical 130 s pack-builds per run.
2. **Partition the heavy tests instead of/in addition to #1: nextest `--partition` across 2–3 `rust-test` jobs — est. −11 to −16 min wall.** `cargo nextest run --workspace --partition '1/3' --partition-total 3` in three parallel jobs (nextest also gives per-test report-time in CI logs forever). CPU-minutes unchanged; wall drops because the 33-heavy tail dominates. Combine with #1 → wall of the test phase ≈ 3–5 min.
3. **Kill the audio-restore re-verify on cache hit — −2.5 min.** `Restore reference-pack audio` costs 166 s (rust) + 145 s (desktop-smoke) even on `pack-audio` cache hits because 9758 files are sha-re-verified every run ("already valid=0"). A cache marker keyed on `catalog/packs.json` sha lets the script skip re-copy after one verified unpack (keep the sha256 check on *download*, refuse on key change — same fail-closed contract).
4. **One conformance invocation per pack instead of 3 — −1 min.** Make validate/lint/test share one pack load (or a single `check` subcommand); 3× 400 MB re-audits per pack ≈ 28 s local, CI 84 s step → ~50 s. Pre-building `cargo build -p lts-langpack-cli` once and calling `target/debug/langpack` directly saves only ~230 ms/call (≈5 s total) — cheap hygiene, not a lever.
5. **Split `rust` into `rust-static` (fmt+clippy+2 bash scripts, ~2 min), `rust-test`, `rust-conformance` — ~0 wall win alone but fail-fast: style/conformance verdicts land at ~5 min instead of 47 min**, and the conformance job's cargo build rides the same rust-cache. Only worth doing as the carrier for #2's partitioning.

_(section authored by scout `SupposedReptile` — rust-local-profile)_
