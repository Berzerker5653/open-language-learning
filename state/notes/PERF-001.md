# PERF-001 — Supported hardware and performance test contract

## Delivered

- `docs/performance/BUDGETS.yaml`: named tiers (`ref-dev` pinned to the actual reference machine:
  Ryzen 9 5950X / 128GB / RTX 5090 / NVMe / CachyOS; `low`/`typical`/`high` support tiers with OS
  matrix), utterance length buckets (0.3/1/2/5 s), warm (20) vs cold (3) scenarios, p50/p95
  latency percentiles, memory/disk ceilings, cancellation semantics (≤250 ms effect, no orphans,
  no evidence events), and UI responsiveness measurement (input→paint p95 ≤100 ms and main-thread
  block ≤50 ms sampled *during* inference).
- `tests/performance/README.md`: harness layout + `summary.json` result contract binding every
  number to app commit, pack/model hashes, tier, and environment.
- All budgets explicitly labeled `status: provisional` product targets with a
  `freeze_condition`: frozen by the SPEECH-001 baseline-spike ADR (which names the actual
  provider/model combinations per tier) before provider optimization or PERF-002 release
  measurement.

## Interpretation note

"Actual hardware/model combinations are identified" is realized in two stages because
SPEECH-001 (provider benchmarking) is a later milestone: hardware tiers are named concretely now;
model combinations are named by the freeze ADR when SPEECH-001 completes. The contract forbids
measuring against unfrozen numbers and forbids silent threshold raises (narrowing_policy section,
roadmap acceptance 3).

## Evidence

- `state/evidence/PERF-001/ci-2026-10-02.txt`: full CI green after adding the contract
  (YAML parses; tiers/budget groups verified).

## Next

PACK-001 (M1) — pack schemas + structural validator. read_first: docs/04, schemas/README.md.
