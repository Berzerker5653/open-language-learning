# ADR 0041: performance budgets frozen — measured tiers, shipped provider/model combos, and the values that gate releases from now on

**Status:** **Accepted** (2026-10-21) — agent-authored, recording the owner's
two calibration decisions of 2026-10-21 ("lets move the line to ~100" and
"fix", the latter chosen after both tiers were measured with the probe) and
completing the `freeze_condition` of `docs/performance/BUDGETS.yaml`: the
SPEECH-001 baseline spikes are complete (`state/evidence/SPEECH-001/`,
2026-10-03; ledger `done`), and this ADR records the actual provider/model
combinations per tier.

**Date:** 2026-10-21

## Context

`docs/performance/BUDGETS.yaml` carried provisional targets since PERF-001.
PERF-002 has now measured the two supported desktop tiers (ADR-0039:
desktop 1.0 is Linux x86-64 only) with the harnesses under `scripts/`:

- **Gaming PC** (Ryzen 9 5950X, AVX2, RTX 5090 — the file's `ref-dev`
  identity machine, run as a desktop tier):
  `state/evidence/PERF-002/gamingpc-2026-10-21.md` (post-fix) and
  `gamingpc-2026-10-20.md` (pre-fix, the defect record).
- **Omarchy** (Ryzen AI Max+ 395 "Strix Halo", AVX-512, integrated
  graphics — `high`-class CPU, no CUDA device; machine identity recorded
  per run, no tier-membership claim):
  `state/evidence/PERF-002/omarchy-2026-10-21.md`, `omarchy-2026-10-20.md`.

Two defects were found by the measurements and fixed the same day, not
recalibrated away:

1. `derive_pairs` re-scanned evidence quadratically: plan-line 729/766 ms
   → bucketed → **90/93 ms** (`state/evidence/PERF-002/plan10k-*`).
2. `pronunciation_check` ran as a synchronous Tauri command, so a ~1 s
   whisper burst blocked the main thread and starved the webview
   (worst rAF gap 1057 ms, input→paint 1930 ms on the AVX2 tier, while
   the identical code passed on AVX-512 — duration, not contention).
   Owner decision: **fix**. Offloaded via the established
   `spawn_blocking` pattern plus a `nice +10` spawn hook for every
   sidecar child (`crates/speech-runtime`, tested). Post-fix both tiers
   measure **≤30 ms** on every responsiveness line during real inference.

## Decision

1. **The budgets file is frozen** (`status: frozen`, `frozen: true`) at its
   recorded values, including the owner's 2026-10-21 calibration of
   `app.session_plan_10k_evidence_ms` typical to `{ p50: 100, p95: 150 }`
   (measured 90/93 and 60/61 on the two tiers; the raise was recorded
   with measurements before this ADR, per the narrowing policy).
2. **Provider/model combos per tier (the freeze record):** there is one
   shipped combination, identical on every tier —
   whisper.cpp with the **ggml-tiny** model as a CPU subprocess sidecar
   (payload manifest + hash-verified staging, ADR-0019), children spawned
   at `nice +10` and always driven off the main thread via the blocking
   pool. Alignment uses the same whisper.cpp payload (constrained
   alignment); recognition for dictation uses the same call path.
   **TTS has no runtime provider**: shipped speech is pre-baked pack media
   synthesized at content-build time (ADR-0023). The sherpa-onnx adapter
   in `crates/speech-runtime` is exercised only by tests; it is not a
   shipped configuration and carries no budget.
3. **Responsiveness lines stay `all_tiers` 100/50 ms** (input→paint p95 /
   main-thread block p95). Post-fix measurements: Gaming PC 28/17 ms,
   Omarchy 30/18 ms, during real `pronunciation_check` inference windows
   (`perf:` markers in the tier evidence).
4. **`cancellation.asr_cancel_effect_ms` freezes with its value but is
   not yet measurable**: the shipped whisper-cli invocation has no cancel
   seam. The harness emits `perf:cancel-skipped:no-product-seam` rather
   than a fake number; the line becomes assertable when a real cancel
   path ships, and the requirements (no orphaned processes, memory back
   within 1000 ms, no evidence from cancelled attempts) are already
   enforced elsewhere.
5. **Honest gaps in the record:** the `low` tier budgets (4c/8t class)
   are frozen as targets but were not measured — no such machine exists
   in the lab. Release evidence must state this; measuring them is
   release-candidate work, not a silent pass.

## Consequences

- Threshold changes now require an ADR with evidence; CI and
  `REL-001`/`RELEASE-EVIDENCE-001` cite these frozen values.
- The harnesses `scripts/perf-app.sh` and `scripts/perf-plan10k.sh` are
  the instruments of record; their probes (`LTS_SMOKE_PERF`) are
  perf-gated and never active for learners.
- `PERF-002` closes its measurement + freeze obligations; the
  responsiveness finding is resolved as a defect fix, with the cross-tier
  probe evidence as regression protection.
- Any future GPU-accelerated or alternate-provider tier adds a new
  combination and therefore a new ADR amendment, per the freeze rule.

## Alternatives

- **Tier-qualified responsiveness lines** (accept ~1 s stalls on AVX2
  hardware): rejected by the owner once the root cause (main-thread
  blocking) was proven fixable at zero UX cost.
- **Leaving the budgets provisional**: rejected — release gates need
  fixed numbers, and "provisional" invites silent drift.
- **Raising the plan line back to 150** (p95 headroom only): unnecessary;
  p50 100 with p95 150 has measured headroom on both tiers.
