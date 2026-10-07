# Calibration runbook — SPEECH-007 (end-to-end, binds to the registry)

How to go from "recordings sourced" to an automatic pronunciation feature that
is actually enabled, using the fail-closed registry in
`crates/speech-api/src/calibration.rs`. Planning is done; this runs once the
owner supplies data + labelers (see `datasets/SOURCING.md`).

## 0. Preconditions (all required before touching held-out data)

- [ ] Protocol `protocols/ja-JP/vowel-length-0.2.0.yaml` **ratified** by a named
      qualified reviewer (`ratification.recorded` set). Unratified ⇒ stop.
- [ ] Consent instrument approved; study storage provisioned
      (`consent/`).
- [ ] 2 qualified labelers + 1 adjudicator engaged; qualifications recorded
      (`labeling/rubric-ja-vowel-length.md`).
- [ ] Dataset manifest created from
      `datasets/_learner-consented-template/manifest.yaml` with **no** unfilled
      consent/license fields.

## 1. Acquire + freeze the dataset

- Follow `datasets/SOURCING.md` (recommended: consented recording study).
- Write the dataset manifest; compute its `content_sha256`. Raw audio stays in
  study storage, never the repo (docs/17 §125).

## 2. Blinded double-labeling → agreement

- Two labelers annotate independently, labels frozen **before** any model
  output is revealed (rubric §Blinding).
- Adjudicate disagreements; mark unresolvable as `excluded` (reported, not
  scored).
- Compute **Cohen's κ** on the binary acceptable-vs-needs-correction decision.
  If κ < `min_label_agreement` (0.70) ⇒ label reliability insufficient ⇒
  feature cannot qualify; stop and report (docs/17 §27).

## 3. Run the feature on the held-out set → metrics

- Run the installed automatic interpreter (the SPEECH-005 duration/length
  feature) on the held-out split; record its decisions.
- Compute, with a **speaker-cluster bootstrap** (≥2000 replicates, fixed seed):
  `false_correction_rate`, `scoring_coverage`, plus the reported secondary
  metrics (docs/17 §85–95).
- **Precision rule:** take the **95% upper CI bound** of `false_correction_rate`
  as the value written into `measured` (conservative), so the registry's
  point-estimate comparison enforces the CI rule. Record the seed + CI in the
  results summary.
- Write `benchmarks/speech/results/<run-id>/summary.json`; compute its sha256.

## 4. Assemble the CalibrationRecord

Place at `languages/ja-JP/speech/calibration/vowel-length-<revision>.yaml`.
Field map to `CalibrationRecord`:

```yaml
feature_id: ja.phon.long-vowel
revision: "<n>"
provider: { id: <asr/runtime id>, version: <v>, sha256: <model hash> }
model: { id: <model id>, version: <v>, sha256: <model hash> }
interpreter: { id: <pronunciation-interpreter id>, version: <v> }
pack: { id: ja-JP, version: <pack version> }
target_ids: [<long-vowel minimal-pair content ids>]
reference_variety: standard-tokyo
protocol: { path: benchmarks/speech/protocols/ja-JP/vowel-length-0.2.0.yaml, sha256: <hash> }
dataset: { path: benchmarks/speech/datasets/<id>/manifest.yaml, sha256: <hash> }
results: { path: benchmarks/speech/results/<run-id>/summary.json, sha256: <hash> }
thresholds: # copy the FROZEN protocol limits
  max_false_correction_rate: 0.05
  min_scoring_coverage: 0.60
  min_label_agreement: 0.70
measured: # from step 3 (false_correction_rate = upper CI bound)
  false_correction_rate: <upper CI bound>
  scoring_coverage: <value>
  label_agreement: <kappa>
  n_speakers: <n>
  n_attempts: <n>
envelope:
  varieties: [standard-tokyo]
  contexts: [taught-long-vowel-minimal-pairs]
  hardware_tiers: [low-cpu-desktop, typical-desktop]
```

## 5. Verify gating (fail-closed)

- `CalibrationRecord::status()` must return `Qualified`: thresholds filled,
  metrics present, artifact hashes non-empty, every measured value inside its
  limit. Any breach ⇒ `NotQualified(reason)` ⇒ feature stays Guided.
- `eligibility_for(record, installed)` returns `Automatic` only when the
  installed provider/model/interpreter/pack versions + model sha256 exactly
  match the record **and** the request sits inside the envelope; otherwise
  `Guided` (docs/17 §97). The desktop `pronunciation_check_at` already consults
  this and labels the mode honestly.

## 6. Regression / invalidation

- Any provider/model/interpreter/pack version or model-hash drift, or a
  variety/context outside the envelope, invalidates eligibility until
  re-calibration. Never carry trust forward on a capability-name match.
- Re-run steps 3–5 on any such change; rerun affected gates.

## 7. If it does not qualify

- Feature stays **guided/reference**; no automatic pronunciation mastery from
  unvalidated acoustics (docs/17 §95).
- If no high-value contrast can meet the frozen gates, record the feasibility
  evidence and escalate for an **explicit owner scope decision** — do NOT pass
  an empty automatic-feature gate (docs/17 §129, ROADMAP SPEECH-007 acceptance).
  Stable 1.0 stays blocked; guided alpha/beta practice may continue.

## Stable-1.0 minimum

At least one high-value Japanese pronunciation contrast (here
`ja.phon.vowel-length`) must reach `Qualified` within a useful declared
coverage envelope before stable desktop 1.0. Infrastructure and planning alone
do not satisfy this — only permissioned data + qualified labels + passing
held-out metrics do.
