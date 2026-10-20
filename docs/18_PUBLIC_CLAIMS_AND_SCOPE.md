# 18 — Public Claims, Scope, and Honesty Rules

## Proficiency claims

Do not say "fluent" as a simple binary. Prefer demonstrated capabilities and clearly described framework alignment.

Do not claim official JF/CEFR/ACTFL certification unless the project actually has authorization/evidence for that claim. "Aligned with" or "informed by" must be supported by a documented mapping.

Distinguish curriculum coverage, performance on practiced course tasks, transfer under stated conditions, and independently demonstrated proficiency. A checkpoint or one novel variation cannot establish an entire learner proficiency band. Framework version/descriptor references, modality/support conditions and mapping rationale must be visible in the coverage evidence; no unsupported direct equivalence between different frameworks is implied.

## Speech claims

Do not market pronunciation scoring as accent elimination or perfect native-equivalence detection. State which features are evaluated and allow uncertainty.

State model/provider/feature versions, supported speech varieties and tested populations/devices, feature qualification limits and abstention behavior. Guided reference comparison is useful practice, but must not be labeled calibrated automatic scoring. Technical/quality failures and abstention produce no linguistic penalties.

Speech-runtime availability is stated per platform and per CPU, never as a blanket availability claim in either direction: shipped Linux x86-64 desktop builds carry the pinned whisper.cpp alignment sidecar and its `ggml-tiny` weights (ADR-0019), so pronunciation feedback and dictation run there only when the host CPU meets the payload's compiled instruction floor, while payload-free bare/dev builds and today's Windows and macOS builds carry no runtime and abstain with the reason that is true (`speech-model-off`, `aligner-cpu-unsupported`, or `aligner-unavailable`).

ADR-0039 (2026-10-20) makes that a support statement, not just a runtime one: desktop 1.0 is a Linux x86-64 release. Windows/macOS builds remain compile-checked trials labeled untested (ADR-0015 still forbids read-builds-as-parity); parity itself (`PLAT-001`) is off the 1.0 path.

The instruction floor and the speedup are measured facts, quoted with their sample: the payload is compiled for x86-64-v3 (SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no AVX-512) because at the pinned commit the same 2.2 s pack sample (`languages/ja-JP/media/ja.sent.drink-coffee.wav`, 2.2175 s of audio) took 3.6 s per utterance on a portable baseline build versus 370-397 ms on the x86-64-v3 build, roughly nine times faster (ADR-0019). Quote it as one sample on one machine class, not a performance guarantee, and state the 82,016,429-byte payload it buys (staging-machine figure) as part of the availability statement.

None of that is a capability claim: pronunciation feedback stays guided and no pronunciation-accuracy claim is permitted (ADR-0017); the alignment number stays a text-match ratio, not pronunciation evidence (ADR-0008); a staged linux-x64 payload licenses no claim that Windows or macOS work, and platform status comes only from human runtime reports, never from a build script (ADR-0015).

## Privacy claims

"Local/offline" means tested network-independent execution for that capability. If a cloud provider is enabled, the UI must make the changed privacy boundary clear.

## Open-source claims

Do not imply every downloaded model/voice/community pack has the same license as the application. Display component licenses.

## Course completeness

Do not label the Japanese pack A1/A2/B1/B2 complete until mapped coverage, assessments, curriculum audit, and required review gate are satisfied. If a band is partial, say partial.

Stable desktop 1.0 targets reliable A1–A2 coverage in both shipped languages (ja-JP and ru-RU). This is the owner's explicit 2026-10-19 decision ("reliable A1–A2 in both languages is the 1.0 bar"), replacing the earlier through-B2-like-Japanese-coverage target. The approved finite coverage artifact and review policy in `docs/09_TESTING_AND_ACCEPTANCE.md` define the denominator and evidence requirements for those bands. Under ADR-0017 the content posture is AI-created: qualified human review remains how content is promoted to `verified`/`validated` (O-02 community review) and no public text may imply review that did not happen, but no 1.0 release gate depends on that review being complete. Sampled lower-risk unscored practice must disclose its remaining risk and cannot carry decisive coverage/mastery claims. Further scope changes require another explicit owner decision, while partial previews can be labeled alpha/beta.

Do not claim learning efficacy, calibrated mastery confidence, accessibility conformance, or human verification merely because requirements and future tasks exist. Strong efficacy claims need the prespecified evaluation and actual results in `docs/12_OBSERVABILITY_AND_RESEARCH.md`. Accessibility claims must identify the tested version, criterion scope, platform/assistive-technology matrix, and limitations; support for a reading/writing route does not prove speaking/listening outcomes for a deferred modality.

A reviewable release candidate is a development deliverable. Public publication/distribution is a separate action within the owner's authorized release scope; bundled development instructions do not themselves grant publication permission.
