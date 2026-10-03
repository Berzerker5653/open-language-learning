# Japanese pack tests

Required generated suites will include:

- schema/conformance;
- reference/source/license integrity;
- prerequisite graph;
- curriculum reachability;
- unintroduced-content detection;
- script/transliteration consistency;
- speech-profile capability checks;
- draft/uncalibrated automatic-assessment rejection and null-threshold behavior;
- calibration/provider/model/target version and evidence-file integrity;
- accepted-variant and reliable/unvoiced F0 behavior;
- technical speech failure/abstention exclusion from linguistic mastery;
- exact unresolved-reference warning in handoff mode and failure in release-readiness;
- reviewed regression examples.

Speech audio fixtures must be permissioned and are intentionally absent from this handoff.

Do not re-host third-party corpus recordings merely because their copyright license is permissive; check release access/use conditions and keep private evaluation audio outside the distribution. Calibration tests need real human-reviewed labels and independently held-out speakers/contexts under `docs/17_SPEECH_BENCHMARK_PLAN.md`. The future test suite must exercise actual behavior, not only assert that these policy strings exist.
