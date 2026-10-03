# 19 — Target Repository File Architecture

This is the preferred end-state layout. OMP may refine it through ADRs while preserving boundaries.

```text
/
├── README.md
├── START_HERE_OMP.md
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json / pnpm-workspace.yaml
├── Cargo.toml
├── apps/
│   ├── desktop/
│   │   ├── src/                 # shared React/UI entry
│   │   └── src-tauri/           # Tauri native shell
│   └── web/                     # optional PWA later
├── packages/
│   ├── ui/
│   ├── learner-ui/
│   ├── scenario-ui/
│   ├── schemas/
│   └── shared/
├── crates/
│   ├── domain/
│   ├── learner-model/
│   ├── scheduler/
│   ├── langpack/
│   ├── langpack-cli/
│   ├── storage/
│   ├── speech-api/
│   ├── speech-runtime/
│   ├── audio/
│   └── security/
├── languages/
│   └── ja-JP/
├── schemas/
├── tools/
├── tests/
│   ├── e2e/
│   ├── fixtures/
│   ├── malicious-packs/
│   └── performance/
├── docs/
│   └── adr/
├── tasks/
│   └── ROADMAP.yaml
└── state/
    ├── STATUS.md
    ├── task-state.json
    ├── notes/
    └── evidence/
```

## File ownership boundaries

- `languages/`: content/data, never application business logic.
- `schemas/`: public pack contracts.
- `crates/domain`: target-language independent.
- `speech-runtime`: provider adapters only; pack determines linguistic interpretation.
- `packages/*ui`: presentation; no direct DB logic.
- `state/`: autonomous agent durable work state, not production learner data.

## Generated files

Generated schema bindings and pack indexes should be clearly marked and reproducible. Do not manually edit generated outputs.

## Evidence artifact locations

Before their dependent implementation tasks, create the policy artifacts required by the roadmap:

- `docs/assessment/MASTERY_POLICY.yaml` — versioned evidence and prerequisite policy;
- `docs/assessment/RELEASE_COVERAGE.yaml` — finite framework/capability mapping;
- `languages/ja-JP/review/REVIEW_POLICY.yaml` — qualified review coverage and records;
- `docs/performance/BUDGETS.yaml` — named hardware/configuration budgets;
- `benchmarks/speech/` — protocol, dataset manifests and aggregate run results;
- `languages/ja-JP/speech/calibration/` — package-relative feature eligibility records.

These are future task outputs, not existing measurement/review evidence in this scaffold. Keep raw recordings and participant/reviewer personal data outside distributed packages. `work/` is local scratch; `state/evidence/` records task acceptance without substituting for curriculum qualification.
