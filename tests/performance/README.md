# Performance harness contract (PERF-001)

Budgets and protocol: `docs/performance/BUDGETS.yaml` (provisional until frozen by the
SPEECH-001 baseline-spike ADR).

## Layout

- `tests/performance/harness/` — measurement drivers (added with the components they measure:
  app startup/session plan in LEARN-004 era; speech pipeline in SPEECH-001/002 era).
- `tests/performance/results/<run-id>/summary.json` — machine-readable results, gitignored;
  release evidence copies go to `state/evidence/PERF-002/`.

## summary.json contract

```json
{
  "schema_version": "1.0",
  "run_id": "ISO8601+host",
  "app_commit": "git sha",
  "pack_versions": { "org.openlanguage.ja-jp.reference": "x.y.z" },
  "provider_models": [{ "id": "...", "version": "...", "sha256": "..." }],
  "tier": "low|typical|high|ref-dev",
  "os": "...", "cpu_governor": "...", "power_profile": "...",
  "scenario": "asr-warm|asr-cold|tts-warm|startup|session-plan|cancel|ui-responsiveness",
  "utterance_bucket_s": 2.0,
  "trials": 20,
  "samples_ms": [ ... ],
  "p50_ms": 0, "p95_ms": 0,
  "rss_peak_mb": 0, "vram_peak_mb": 0,
  "network_disabled": true,
  "notes": ""
}
```

## Rules

1. Every measured number names the exact app commit, pack/model versions and hashes, tier, and
   environment (docs/07, roadmap REL-001 evidence rules).
2. Cold and warm scenarios are separate runs; cold runs start a fresh process.
3. UI responsiveness is sampled while inference runs, never instead of it.
4. A run that violates the protocol (network enabled, background load, unpinned threads) is
   recorded and excluded from gate evidence, not silently dropped.
5. Gate evaluation compares `summary.json` against the frozen `BUDGETS.yaml`; the evaluator
   script lands with PERF-002.
