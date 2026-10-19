# 09 — Testing Strategy and Release Acceptance

## Quality philosophy

The app teaches people. Silent correctness failures are more serious than ordinary UI defects. Treat curriculum, speech feedback, and learner-state integrity as high-risk domains.

## Test layers

### Unit tests

Cover deterministic domain logic:

- IDs/version parsing;
- curriculum graph validation;
- mastery derivation;
- scheduling;
- support/evidence weighting;
- valid versus unscored evidence, attempt/prompt-family grouping, held-out exposure, and modality-specific prerequisite/unlock rules;
- invalid-content evidence exclusion and deterministic mastery/scheduler recomputation;
- normalization;
- pack security checks;
- migration helpers.

### Schema/conformance tests

Every language pack build validates:

- manifest/schema;
- stable unique IDs;
- references;
- no prerequisite cycles;
- valid source/license links;
- engine compatibility;
- capability declarations;
- content review metadata.

### Curriculum tests

Automated audits should detect:

- unknown references;
- unintroduced hard prerequisites;
- goals with no assessments;
- assessments that require content outside allowed scope;
- unreachable nodes;
- dead units;
- duplicate semantic IDs;
- impossible support ladders;
- translation-only mastery paths;
- missing transfer assessments for major goals.

### Integration tests

Cover:

- pack install/upgrade/rollback;
- session generation from learner evidence;
- activity -> evidence -> mastery update;
- speech provider normalized results;
- offline model selection;
- export/import;
- DB migrations.

### End-to-end tests

Critical journeys:

- fresh install -> choose Japanese -> first lesson;
- skip microphone setup -> continue learning;
- install speech model -> record -> get feedback;
- finish a goal -> see capability progress;
- 5-minute useful practice;
- app restart mid-session -> safe recovery;
- offline study;
- language pack upgrade without mastery loss;
- export profile -> clean install -> import.
- microphone/hearing deferred profile -> later relevant reading/writing goals remain accessible with speaking/listening explicitly unassessed;
- transcript/romaji support -> no unsupported listening/script-decoding mastery;
- repeated coached retries -> no fabricated independent/transfer observations;
- technical/quality failure or abstention -> no linguistic penalty and no failed scheduler rating.

### Accessibility tests

Automated where possible plus manual review:

- keyboard navigation;
- focus order;
- semantic labels;
- contrast;
- zoom/text scale;
- reduced motion;
- captions/transcripts;
- no color-only state.

Use the criterion-level WCAG 2.2 AA/WCAG2ICT matrix and complete-journey platform tests defined in `docs/11_ACCESSIBILITY_AND_LOCALIZATION.md`. A passing automated scanner or an accessible home screen alone does not pass the release gate.

### Security tests

- archive traversal;
- malicious oversized pack;
- invalid MIME/asset;
- sanitized rich text;
- malformed YAML/JSON;
- signature/hash mismatch;
- migration corruption recovery;
- secret/log leakage.

### Speech regression tests

Use permissioned fixtures to test:

- correct utterance;
- wrong utterance;
- silence;
- noise;
- clipping;
- known pronunciation contrasts;
- low-confidence alignment;
- provider unavailable;
- model missing.

A false correction rate above calibrated limits blocks automatic scoring for that feature.

## Content review gates

Automated tests cannot prove naturalness. Japanese reference content must have a review protocol that records:

- reviewer qualification category;
- content range reviewed;
- date/version;
- issues found/resolved;
- sampling method;
- unresolved disagreements.

Do not expose personal reviewer details publicly unless they consent.

### Finite reference-band and review gates

`REVIEW-001` must establish future artifacts `languages/ja-JP/review/REVIEW_POLICY.yaml` and `docs/assessment/RELEASE_COVERAGE.yaml` before scored reference batches are promoted. Their existence in a plan is not evidence that review has occurred.

The release coverage artifact freezes an approved finite set of required original Can-do objectives for each claimed band; for stable 1.0 the claimed bands are on-ramp through A2 in both shipped languages (owner decision 2026-10-19, `docs/18_PUBLIC_CLAIMS_AND_SCOPE.md`). Each row identifies framework/descriptor version and permitted reference, relevant modalities, contexts/text types and support conditions, required dependencies, units/scenarios, assessment IDs and rubric versions, review evidence, and explicit exclusions. Framework alignment needs a documented rationale for breadth and level, approved by qualified human curriculum/assessment reviewers; an author cannot define a tiny subset and call the entire band complete. A significant change to the required set requires recorded review and renewed claim assessment.

Machine-verifiable gates require:

- 100% of the approved required objective set linked to implemented lessons/tasks, valid checkpoint/transfer plans and relevant retention checks, with no missing dependencies or unresolved references;
- 100% of scored or reused core instructional targets reviewed by appropriately qualified humans for language correctness/naturalness/register, accepted variants, prerequisite/pedagogical suitability, and assessment/answer validity; target readings and reference audio/prosody need review when used for teaching or scoring;
- qualification categories and evidence defined before review: native/near-native language ability alone does not substitute for curriculum/assessment expertise; record the expertise appropriate to each review category and responsible human approval;
- version-bound review records, reviewed IDs/ranges, outcomes, resolutions, and no unresolved P0/P1 errors or scoring disagreements;
- source/license, structural audit, and declared automatic speech-feature qualification gates also passing before `verified`/`reference` promotion.

Sampling is permitted only for explicitly lower-risk unscored practice outside the fully reviewed core. Record population, sample selection/size, findings and expansion rule, remaining unreviewed IDs, and residual risk. Label that practice and exclude it from decisive mastery/coverage claims. Structural validation or one AI reviewing another AI cannot satisfy any required human gate. No trusted review record or approval may be fabricated.

The checks are finite and automatable through coverage and evidence references; linguistic judgments still require actual qualified human review. If the reviewer or evidence is unavailable, the reference-band promotion/release task stays blocked while independent work may continue.

## Learning-efficacy acceptance

Before making strong marketing claims, run pilot evaluation that includes delayed/transfer tasks. Product release can precede research publication, but claims must match evidence.

Save a versioned evaluation protocol in the repository before data collection, using the metric definitions and claim rules in `docs/12_OBSERVABILITY_AND_RESEARCH.md`. A study plan, curriculum audit, or scheduler calibration is not proof that this product improves real-world proficiency. Honest partial previews may proceed without strong efficacy claims; stable 1.0 still requires its A1–A2 content/review and engineering gates in both shipped languages.

## Definition of Done — task

A task is done only if:

- acceptance criteria pass;
- relevant automated tests pass;
- docs/schema updated if behavior changed;
- no known critical regression introduced;
- state/evidence recorded;
- code self-review completed.

## Definition of Done — milestone

A milestone is done for a declared scope when all tasks included in that scope are complete and milestone-specific end-to-end/regression tests pass from a clean checkout/build. Report the scope and deferred optional work explicitly. `required_for_desktop_1_0` in the roadmap identifies stable desktop obligations; optional AI/mobile/web/advanced tasks do not block that desktop gate unless the owner adds them to scope. Completing the desktop release candidate does not authorize publication or imply completion of those optional tracks.

## Release 1.0 gates

All must pass:

1. **Build:** reproducible supported desktop builds.
2. **Offline:** core learning and installed local speech capability work with network disabled.
3. **Persistence:** restart/recovery/migrations/export/import pass.
4. **Pack:** Japanese and Russian reference packs and minimal example pass conformance.
5. **Security:** malicious-pack suite passes.
6. **Curriculum:** approved finite on-ramp through A2 coverage in both shipped languages and qualified human review gates above pass; no critical/high graph/content/assessment error remains.
7. **Speech:** each supported automatic feature has version-bound permissioned calibration evidence, speaker-separated held-out evaluation, preregistered/pre-specified feature-specific false-correction/false-negative/abstention limits and sample/uncertainty rationale, and measured abstention behavior; unqualified features stay guided/unscored. Missing qualification evidence fails the automatic-scoring gate. At least one high-value Japanese pronunciation contrast must qualify for automatic feedback within a useful declared coverage envelope; if none qualifies, stable desktop 1.0 remains blocked and guided-only builds stay previews unless the owner explicitly changes scope.
8. **UX:** zero-to-first-use flow and short-session flow pass.
9. **Accessibility:** criterion-level WCAG 2.2 AA/WCAG2ICT matrix and manual critical-journey assistive-technology/platform checks pass, including deferred-modality paths and honest evidence labels.
10. **Licensing:** no unknown/forbidden redistributed asset or model license.
11. **Privacy:** no unexpected microphone/transcript network transmission in local mode.
12. **Performance:** measured representative hardware budgets, device/OS/model configurations, p50/p95 timings and resource limits are documented and met; aspirational prose does not pass this gate.
13. **Crash/recovery:** no data loss in tested interruption paths.
14. **Documentation:** user, contributor, pack-author, and developer bootstrap docs work from clean environments.

Every gate has a version-bound evidence record naming the tested application/pack/model/policy versions, environment, method, result, and remaining limitations. No gate may be marked passed using placeholders, a written checklist alone, or an unexecuted test. A reviewable release candidate is distinct from publishing a release; publication follows the owner's authorized release scope.

## Severity

- P0 Critical: data loss, privacy breach, arbitrary code execution, materially wrong instruction in core path, false high-confidence speech feedback at unacceptable rate, unusable install/build.
- P1 High: major learning path broken, widespread pack corruption, inaccessible critical flow, offline promise broken.
- P2 Normal: localized feature defect with workaround.
- P3 Low: cosmetic/minor polish.

No known P0/P1 defects at stable release.
