# Russian pack tests

Required generated suites will include:

- schema/conformance;
- reference/source/license integrity;
- prerequisite graph;
- curriculum reachability;
- unintroduced-content detection;
- script/Cyrillic-stress consistency (combining acute U+0301 and ё handling);
- speech-profile capability checks;
- draft/uncalibrated automatic-assessment rejection and null-threshold behavior;
- calibration/provider/model/target version and evidence-file integrity;
- accepted-variant behavior (e.g. southern akanye, fricative /ɣ/) and abstention exclusion from linguistic mastery;
- exact unresolved-reference warning in handoff mode and failure in release-readiness;
- reviewed regression examples.

Speech audio fixtures must be permissioned and are intentionally absent from this handoff. Baked pack audio (ADR-0016/0023/0024) is model-output and review-pending, not a licensed human recording.

Do not re-host third-party corpus recordings merely because their copyright license is permissive; check release access/use conditions and keep private evaluation audio outside the distribution. Calibration tests need real human-reviewed labels and independently held-out speakers/contexts under `docs/17_SPEECH_BENCHMARK_PLAN.md`. The future test suite must exercise actual behavior, not only assert that these policy strings exist.
