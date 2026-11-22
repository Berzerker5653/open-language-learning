# REVIEW-SPEECH-INFRA-001 — two-axis review verdict (Pocock)

Reviewer: hermes-default (ai-assisted), 2026-11-22.
Target: the SPEECH-INFRA-001 lane — eligibility registry + honest guided/automatic
gating infra for speech feedback.
Commits reviewed: `b06f18a` (test: end-to-end calibration contract),
`39a3990` (chore(fmt) serve.rs rot), `cddc944` (ledger close), and the
infra the card audits/stands on: `2c722a5` (registry + gate + labels, 2026-10-04).
Board card: t_d9a8e57c (done, 2 runs).

## Overall: changes-requested (2 substantive defects → FIX cards)
- SPEC axis: **changes-requested** (D1, D2 substantive; D3 note)
- STANDARDS axis: **approved-with-notes**
- The lane's own deliverable — the end-to-end contract fence — is real, ran on a
  real vendor, and is honestly evidenced. The defects sit in the *binding
  strength* of the gate the fence measures: two of the five claimed bindings
  (provider version, model payload hash) do not actually bind as the card and
  acceptance bullet 1 claim. SPEECH-007 stays blocked on owner calibration data
  anyway, so the fixes ride naturally into the calibration campaign BEFORE the
  first qualification record is authored — that is the right sequencing and the
  reason this is FIX-cards, not a revert.

---

## (a) SPEC axis — changes-requested

Acceptance bullets (tasks/ROADMAP.yaml SPEECH-INFRA-001) checked one by one:

**Bullet 1 — "Registry binds feature, provider/model/interpreter versions and
hashes, pack version, frozen thresholds, held-out metrics and envelope, and
fails closed when any binding drifts, with a machine-readable reason and guided
posture retained." — PARTIALLY MET.**
The registry (`crates/speech-api/src/calibration.rs`) is a clean fail-closed
design: unfilled thresholds, missing metrics, empty artifact hashes, measured
limit breaches, version/hash drift and envelope misses all return
`NotQualified`/`Guided { reason }` with machine-readable reason strings
(`thresholds-unfilled`, `model-version-drift`, `variety-outside-envelope`, ...),
and the gate stamps every `PronunciationResult` with `mode` + `mode_reason`.
But two bindings are weaker than the bullet claims — see D1 and D2.

**D1 — provider version binding is void in production (substantive).**
`pronunciation_check_at` hardcodes `installed.provider.version = String::new()`
with the comment "an empty version can never match a record, so drift fails
closed" (apps/desktop/src-tauri/src/lib.rs:5739-5744). That comment is false in
both directions:
- The registry never requires a record-side version to be non-empty, so an
  empty record version matches the empty installed version. The lane's OWN
  contract test relies on exactly this: its yaml writes
  `provider: { id: whisper.cpp, version: "" }` (lib.rs:13807) and the
  flip-to-automatic test then passes. Empty↔empty match is the *only* reachable
  path to `Automatic`.
- Conversely, a record with a real provider version (e.g. `v1.7.x`) can NEVER
  match, because the sidecar reports no version — automatic becomes silently
  unreachable with reason `provider-version-drift`.
Net effect: the provider axis contributes zero trust; qualification hinges on
the calibration author deliberately leaving the binding unbound. That violates
"binds provider ... versions ... fails closed when ANY binding drifts".
**FIX-1:** make the provider binding honest — either (a) have the sidecar
surface a real provider version (and/or payload sha) into
`InstalledCombination`, and/or (b) treat empty versions in `eligibility_for`
as unbound (`Guided { reason: "component-version-unbound" }`, registry-side
requirement that every `ComponentRef.version` is non-empty), then update the
contract-test record shape accordingly. Whichever way, fix the misleading
comment; the current test yaml documents the loophole as the contract.

**D2 — model payload hash binding uses `max()` of file hashes (substantive).**
The gate binds the model hash as `m.files.iter().map(|f| f.sha256.clone())
.max()` (lib.rs:5752-5754) — the lexicographically-largest hash among the
catalog manifest's files. For any multi-file model, a re-released payload whose
non-max file changed (same version, same max hash) passes the `model-hash-
mismatch` check untouched: the binding silently misses payload drift. The
flip test (which binds via the same expression, lib.rs:13796-13798) cannot
detect this because both sides share the weakness.
**FIX-2:** bind a combined digest (e.g. sha256 over sorted `path:sha256` pairs
of all manifest files) on BOTH sides (gate + authoring guidance/protocol), so
any file's payload change flips the binding to guided.

**D3 — `target_ids` bound but never enforced; envelope `hardware_tiers`
declared but never checked (note).**
`CalibrationRecord.target_ids` exists precisely for phrase-scoped claims
(docs/17 §23) but neither `eligibility_for` nor the gate checks the attempt's
target ids against it; a feature-level record with `target_ids: []` (as in the
test) authorizes the feature globally. `hardware_tiers` is parsed and never
consulted. Severity low today (no records ship in any pack), but the
calibration campaign must decide enforcement before the first qualification or
the scope declaration becomes decorative. **FIX-3 (campaign-scope):** enforce
non-empty target_ids coverage for phrase-scoped features and the tier check,
or document their deferral in docs/17.

**Bullet 2 — end-to-end contract tests flip automatic/guided — MET.**
Two vendor-gated tests in lib.rs (13865-13899). Verified in
`state/evidence/SPEECH-INFRA-001/gates-lane.log`: run under their own
`calibration_record_` filter, 2/2 ok, ~90 s runtime — real whisper.cpp+ggml-tiny
execution, not a silent skip (the `dictation_vendor()` early-return matches the
existing repo-wide speech-chain convention, and the registry's own 9 unit tests
run everywhere). Qualified record bound to the exact installed combination →
`mode=automatic`, `mode_reason=None`; decoy model version → `guided`,
`mode_reason=model-version-drift`. Note (not a defect): "scored audio outcome
unchanged" is pinned only via `abstain_reason=None`, not the exact corrections
vector — acceptable, the pre-existing ungated pipeline tests pin the scores,
but FIX-1's re-record could assert the corrections list too.

**Bullet 3 — honest UI labels ride the mode; learner-copy audit clean — MET.**
`apps/desktop/src/pronunciation.tsx:194-199` renders distinct copy per mode
("Calibrated automatic feedback: validated for this exact model and
configuration" vs "Guided feedback only: this comparison is a reference, not a
grade..."), vitest 12/12 incl. both-mode labelling (vitest-pronunciation.log),
`audit_learner_copy` 0 findings logged in gates-lane.log.

**Bullet 4 — no behavior change; automatic off by default — MET.**
The lane commit is test-only (+147 lines, one file). No calibration records
ship in any pack (`load_records` returns empty → `no-calibration-record` →
guided); pronunciation regression 4/4 in the lane battery. Automatic remains
unreachable until a qualified record is dropped in — honestly.

**Out-of-scope additions: none in the lane.** `b06f18a` touches only lib.rs
tests. `39a3990` is an unrelated fmt fix, correctly split into its own chore
commit with HEAD-red evidence (fmt-rot.log) — approved per repo rot convention.
Informational only: `2c722a5` bundles REVIEW-001 artifacts with the speech
infra in one October commit (mixed concerns, pre-lane — not this worker's
authorship, no action).

## (b) STANDARDS axis — approved-with-notes

- **Commit/ledger hygiene: exemplary.** Code (`b06f18a`) vs ledger (`cddc944`)
  split; the test commit message asserts only gates that actually ran, with the
  log path named — CODING_STANDARDS §B honored. All 6 task-state evidence paths
  exist on disk (gates-lane.log, gates-tests.log run-1 trail, vitest, audit,
  fmt-rot, notes). `validate_handoff.py --require-explicit-ledger-records`
  re-run at this review: PASSED (2209 files; the lone WARN on STORY-LISTEN-001
  is pre-existing and unrelated).
- **No weakened tests:** none. The vendor gate pattern is the existing
  convention, and the log proves real-vendor execution (90 s, not instant skip).
  The separate `calibration_record_` filter section shows the new tests were
  actually measured (the `pronunciation` filter section is the regression run,
  4/4, 216 filtered — filter discipline followed).
- **Takeover race handling (per skill): correct.** Main tree held
  PRACTICE-GATE-001's WIP incl. lib.rs hunks; the lane staged lib.rs as
  HEAD+lane blob via hash-object and re-applied its hunk to the dirty copy —
  notes §"Gate notes" documents it, and PRACTICE-GATE-001 later shipped
  (867654e) with the contract tests intact on main. Verified: the two test fns
  exist at HEAD today.
- **Single-vocabulary rule (K-62 spirit): satisfied.** One eligibility source:
  the registry's `Eligibility`/reason vocabulary is produced once in the crate,
  mapped once in the gate, consumed by the Rust wire struct and the frontend
  label; serve mode routes no pronunciation path (serve.rs has zero
  pronunciation routes), so there is no second transport to diverge.
- Note STD-1: the misleading provider-version comment (lib.rs:5741-5743) —
  a documentation defect folded into D1.
- Note STD-2: `load_records` silently skips unreadable/invalid calibration
  yaml (documented, fail-closed to guided — fine) but leaves no way to
  distinguish "no record" from "corrupt record" in `mode_reason`. Optional
  improvement for FIX-1/2 follow-up: `calibration-record-unreadable` reason.
- Note STD-3: `eligibility_for` calls `record.status()` twice (cosmetic).

## FIX material for the planner
- FIX-SPEECH-BIND-1 (from D1): honest provider binding — sidecar version/hash
  introspection into InstalledCombination and/or registry rejection of empty
  versions as bindings; fix the lib.rs comment; update the contract-test record
  shape. Before any SPEECH-007 qualification record is authored.
- FIX-SPEECH-BIND-2 (from D2): combined multi-file model digest as the bound
  sha256 on both gate and authoring sides; pin with a drift test on a
  non-max file.
- FIX-SPEECH-BIND-3 (from D3, campaign-scope): enforce target_ids scope +
  hardware_tiers envelope (or record their deferral in docs/17) before the
  first qualification.
