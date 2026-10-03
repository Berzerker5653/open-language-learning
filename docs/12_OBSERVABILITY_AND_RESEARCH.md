# 12 — Observability, Learning Analytics, and Efficacy Research

## Local diagnostics first

Provide a developer diagnostics screen/log that can show:

- pack/version;
- scheduler version;
- provider/model versions;
- inference timings;
- content IDs;
- confidence/abstention reason;
- database migration version;
- last task/session failures.

Do not log raw microphone audio by default.

## Product learning metrics

Prefer metrics tied to learning:

- independent success rate;
- support reduction;
- retention at delayed intervals;
- transfer performance;
- modality gaps;
- false feedback reports;
- time to recover from a misconception;
- speech abstention vs confident scoring rates.

Avoid using streak length as an engagement KPI because the product intentionally rejects streak optimization.

Version metric definitions with eligibility rules, denominators, assessment/rubric versions, and aggregation scope. At minimum distinguish independent versus supported success, practiced versus fresh prompt-family performance, observed delayed retention versus model-predicted retrievability, and transfer to unseen contexts/speakers. Define retention intervals before evaluation and keep modality results separate. Report unscored technical failure, abstention, deferral, missing data, and attrition alongside scored outcomes so selective exclusion cannot hide problems. A course-task success rate is not a global proficiency estimate.

## Research mode

A voluntary research/export mode may generate de-identified structured data for personal analysis or opt-in studies. Default is local-only.

De-identification does not guarantee anonymity: voice, free speech transcripts, precise timestamps, and small demographic/device combinations can identify people. Separate local personal-analysis export from any external study submission. A study protocol must specify fields, minimization, consent/withdrawal and retention/deletion handling, destination/access, and redaction; identifiable recordings/transcripts require explicit consent and must not be added to ordinary diagnostic exports. Do not describe data as anonymous without evidence supporting that claim.

## Experimentation ethics

Do not run hidden experiments that degrade pedagogy merely to maximize time-on-app. Experiments affecting learning should have an educational hypothesis and guardrails.

Before collecting data for a major efficacy claim, save a versioned protocol under `docs/research/` specifying the intended claim, population/sample rationale, comparison condition where needed, blinded/independent assessment where feasible, rubric and prompt/speaker separation, delayed intervals, exclusions/attrition, analysis and uncertainty, and decision rule for the claim. Prespecify changes and report deviations. Pilot results may justify a later confirmatory protocol; they must not be retroactively treated as preregistered evidence. A finished plan is not a finished study.

## Calibration

Speech thresholds and mastery thresholds require calibration datasets. Keep algorithm version with evidence so changes are auditable.

Use the future `docs/assessment/MASTERY_POLICY.yaml` for mastery definitions and version-bound speech qualification evidence for automatic feedback. Separate training/tuning from held-out speaker/item evaluation, declare subgroup/device limitations, and record sample size/uncertainty and feature-specific limits before the release evaluation. A heuristic confidence label must remain labeled heuristic until calibration supports the stronger claim. Failure to qualify one feature disables its automatic scoring and leaves guided practice available; it must not cause fabricated evidence or a silent pass.

## User reports

Allow "this content is wrong/unnatural" and "speech feedback seems wrong." Reports include content/provider/version context and optionally the user's recording only with explicit consent.
