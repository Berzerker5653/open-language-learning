# 18 — Public Claims, Scope, and Honesty Rules

## Proficiency claims

Do not say "fluent" as a simple binary. Prefer demonstrated capabilities and clearly described framework alignment.

Do not claim official JF/CEFR/ACTFL certification unless the project actually has authorization/evidence for that claim. "Aligned with" or "informed by" must be supported by a documented mapping.

Distinguish curriculum coverage, performance on practiced course tasks, transfer under stated conditions, and independently demonstrated proficiency. A checkpoint or one novel variation cannot establish an entire learner proficiency band. Framework version/descriptor references, modality/support conditions and mapping rationale must be visible in the coverage evidence; no unsupported direct equivalence between different frameworks is implied.

## Speech claims

Do not market pronunciation scoring as accent elimination or perfect native-equivalence detection. State which features are evaluated and allow uncertainty.

State model/provider/feature versions, supported speech varieties and tested populations/devices, feature qualification limits and abstention behavior. Guided reference comparison is useful practice, but must not be labeled calibrated automatic scoring. Technical/quality failures and abstention produce no linguistic penalties.

## Privacy claims

"Local/offline" means tested network-independent execution for that capability. If a cloud provider is enabled, the UI must make the changed privacy boundary clear.

## Open-source claims

Do not imply every downloaded model/voice/community pack has the same license as the application. Display component licenses.

## Course completeness

Do not label the Japanese pack A1/A2/B1/B2 complete until mapped coverage, assessments, curriculum audit, and required review gate are satisfied. If a band is partial, say partial.

Stable desktop 1.0 targets original on-ramp through B2-like Japanese coverage. The future approved finite coverage artifact and review policy in `docs/09_TESTING_AND_ACCEPTANCE.md` define its denominator and evidence requirements. All scored/reused core instructional targets need actual qualified human review; sampled lower-risk unscored practice must disclose its remaining risk and cannot carry decisive coverage/mastery claims. Lowering stable 1.0 scope requires an explicit owner decision, while partial previews can be labeled alpha/beta.

Do not claim learning efficacy, calibrated mastery confidence, accessibility conformance, or human verification merely because requirements and future tasks exist. Strong efficacy claims need the prespecified evaluation and actual results in `docs/12_OBSERVABILITY_AND_RESEARCH.md`. Accessibility claims must identify the tested version, criterion scope, platform/assistive-technology matrix, and limitations; support for a reading/writing route does not prove speaking/listening outcomes for a deferred modality.

A reviewable release candidate is a development deliverable. Public publication/distribution is a separate action within the owner's authorized release scope; bundled development instructions do not themselves grant publication permission.
