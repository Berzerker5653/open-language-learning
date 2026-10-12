# Language learning platform handoff review

Reviewed on October 2, 2026. This report concerns the supplied `language-learning-platform-handoff.zip` and a separate package of proposed corrections. The original ZIP has not been changed.

> **Historical document.** This is the 2026-10-02 review of the handoff package, not a review of the application as it exists now. Read it for the specification decisions; read `README.md`, `docs/adr/` and `state/STATUS.md` for what has been built and decided since.

## Recommendation

**Use the proposed corrected package for an implementation handoff after reviewing its changes. I would not hand off the original unchanged.** The product direction is coherent, but the original checker and roadmap allow several important requirements to be missed or interpreted inconsistently.

The proposed package is a stronger development specification. It is not a built application, a completed B2 Japanese course, a certified accessibility result, or validated pronunciation software. Those outcomes require implementation and measured evidence. This review cannot honestly certify “perfect” language instruction or runtime behavior from specification files alone.

The main corrections are:

- disable the seed's uncalibrated automatic pronunciation assessment;
- make technical speech failures neutral for linguistic mastery;
- connect every required desktop feature and audit to the final release task;
- define finite coverage, qualified human review, and calibration gates;
- strengthen the validator and give it a reproducible setup and regression tests.

## Review coverage

The review covered all **71 original files**, including the 20 numbered specifications, research registry, three architecture decisions, autonomous handoff instructions, 54-task roadmap, state files, six original schemas, Python checker, minimal example, and every Japanese seed file. Product/curriculum, Japanese/speech, and engineering checks were reviewed in parallel and then checked together.

The review included cross-document consistency, learner journeys, learning claims, modality and mastery validity, curriculum structure, pack contracts, seed Japanese, local speech feasibility, benchmark design, privacy, security, rights/provenance, accessibility, platform support, release gates, and autonomous execution boundaries. Primary sources were checked for niche or changeable factual claims.

There is no runnable app, complete curriculum, model binary, audio corpus, UI design, or actual review record in the archive. Runtime tests, visual app inspection, hardware measurements, and human linguistic certification were therefore unavailable. Their absence is expected at this scaffold stage; it must not be hidden behind a passing structural checker.

The files' instructions were treated as review material. They did not authorize starting the product build, publishing, contacting people, or spending money.

## Findings requiring handoff corrections

Priority here describes the significance of a **handoff defect**, not a claim that an already shipped product has harmed users. P1 means a requirement could be bypassed or implemented incorrectly; P2 means an important ambiguity or incomplete contract; P3 means a small consistency issue.

| Priority | Finding in the original | Proposed correction |
| --- | --- | --- |
| P1 | Japanese speech profile selects `assess-automatic` for segmental intelligibility using a placeholder 0.80 threshold; the manifest advertises pronunciation and prosody assessment without calibration. | All seed speech features remain guided/reference, active confidence threshold is unset, automatic assessment flags are false, and an automatic feature must identify calibration evidence and its provider/model/version scope. |
| P1 | The mastery document allows technical speech failure to lower mastery “not as strongly,” while the speech contract forbids negative linguistic evidence. | Technical/quality failures, skipped or deferred tasks, abstention, and unavailable providers do not create positive or negative linguistic evidence or failed retrieval ratings. Elapsed-time memory decay remains separate. |
| P1 | The checker passes some broken or malformed content because it inspects only selected records. | Parse all existing structured data, reject duplicate keys, validate lexical entries, check IDs/references/graphs/state and explicit draft exceptions, and expose machine-readable diagnostics. |
| P1 | The greeting goal points to an assessment that does not exist, with no visible validation warning. | Declare that exact unresolved reference in the manifest. Handoff validation warns about it; pack readiness rejects it. No assessment or human approval was fabricated. |
| P1 | The final release task does not require all reading/writing, local TTS, complete pack CLI, or AI authoring kit work to be complete. | Every required desktop task is explicitly marked and included in the release dependency closure. Optional AI runtime, mobile, web, and advanced work have a separate scope. |
| P1 | Human review and “complete A1/A2/B1/B2” gates have no finite denominator or clear pass criteria. | A new review-policy task must define the finite objective map, qualification categories, review records, issue resolution, and full review of scored/reused core targets before reference promotion. |
| P1 | Mastery thresholds, support handling, retention delay, independence, confidence, and assessment eligibility are mostly illustrative. | A versioned mastery-policy task precedes implementation of derived mastery. It must include deterministic examples, validity/exclusion rules, repeat-attempt grouping, and modality-specific prerequisites. |
| P1 | Speech calibration can tune and report on the same data or appear accurate by abstaining on almost everything. | Require predeclared feature protocols, independent speakers/prompts, human label agreement, error denominators, uncertainty, minimum coverage, and version-bound eligibility. The proposed stable gate requires at least one useful calibrated automatic contrast; if none qualifies, guided-only previews remain possible but stable release stays blocked. |
| P1 | Deferred speaking/hearing can conflict with bare-ID hard prerequisites and capability unlocks. | Define track access separately from earned modality mastery. Missing modalities stay unassessed; later reading/writing paths must remain accessible without false credit. |
| P2 | Validator dependencies and clean setup instructions are missing. | Add pinned tool dependencies, virtual-environment instructions, useful missing-dependency diagnostics, and a portable regression-test command. |
| P2 | Some strict schemas cannot represent the provenance/review contracts described in the documents. | Add lexical validation and draft provenance/review/calibration fields where appropriate; explicitly require completing all public content schemas and modality-prerequisite migration in `PACK-001`. The starter schemas remain provisional. |
| P2 | Register and reference-variety IDs disagree between Japanese seed files. | Use declared register/variant IDs consistently across identity, lexicon, phonology, and speech; goal contexts reference declared situation IDs. |
| P2 | A valid version with both prerelease and build metadata is rejected, while arbitrary locale/engine strings are accepted. | Validate supported schema versions, BCP-47 syntax, full SemVer syntax and engine-range ordering. Locale syntax checks do not certify registry-valid language subtags. |
| P2 | Important documents 12 and 16–19 are absent from relevant task `read_first` lists. | Add content-review, benchmark, claims, observability, and file-boundary documents to the tasks that depend on them. |
| P2 | Final security audits can run before later content/providers/UI work and keep stale passing evidence. | Audit dependencies now include the final required features; evidence names the exact app, pack, provider/model and platform versions. Relevant changes invalidate affected results. |
| P2 | The authoritative master does not state the B2 stable-release target as clearly as README and roadmap. | Preserve the existing ambitious target: stable desktop 1.0 requires reviewed on-ramp through B2-like coverage. Partial previews may be alpha/beta. Narrowing stable scope requires a deliberate owner decision. |
| P2 | Accessibility says “WCAG-aligned” without a version, level, or complete-journey matrix. | Specify WCAG 2.2 AA with WCAG2ICT interpretation for native software, platform/assistive-technology checks, accessible modality deferral, language/ruby handling, contrast, zoom, focus, and manual verification. |
| P2 | Latency and fast-answer heuristics can confuse disability, input methods, or prior knowledge with language ability. | Latency is diagnostic by default and cannot alone grant or remove mastery. Timing-based rubrics need a declared construct and accessible alternate/defer route. |
| P2 | Source copyright licenses are not clearly separated from download/access/use conditions. | Pin the Common Voice release page and its access restrictions; track these separately from CC0 or other copyright labels. Keep restricted raw research audio outside the repository/distribution. |
| P2 | Recording deletion, transcript retention, profile import, native privilege, and update authentication have incomplete acceptance contracts. | Add explicit consent boundaries, temporary-file/error recovery, app-owned deletion scope, transactional imports, stricter archive rules, least-privilege native commands, authenticated catalogs/updates, and production exclusion of test hooks. |
| P2 | The autonomous mission has an indefinite completion boundary and incomplete state/evidence rules. | Stop the default implementation goal at the reviewable desktop release candidate, define effective state and evidence requirements, and keep optional work/publication under separate owner scope. |
| P3 | The curriculum is called a DAG although non-prerequisite relations can cycle; a Japanese glyph appears in an ID example rejected by the schemas. | Only the hard-prerequisite subgraph must be acyclic. Use an ASCII stable ID and keep the glyph in display data. |

## Evidence locations in the original

The most consequential locations are:

- `languages/ja-JP/speech/profile.yaml:5` and `manifest.yaml:18` — uncalibrated automatic assessment and advertised assessment capabilities.
- `docs/03_CURRICULUM_AND_MASTERY.md:103`, `docs/05_SPEECH_SYSTEM.md:71`, and original `SPEECH-002` acceptance — conflicting treatment of technical failures.
- `tools/validate_handoff.py` — selective validation; no semantic graph/state or lexical checks.
- `languages/ja-JP/curriculum/goals.yaml` — missing `ja.assess.onramp.greeting-transfer`.
- Original `REL-001` dependencies and its transitive predecessors — missing required feature paths.
- `docs/09_TESTING_AND_ACCEPTANCE.md:118`, `docs/16_CONTENT_AUTHORING_AND_REVIEW.md`, and Japanese review-task acceptances — incomplete operational human-review gates.
- `docs/17_SPEECH_BENCHMARK_PLAN.md:63` — calibration measurement without a defined independent eligibility protocol.
- `docs/11_ACCESSIBILITY_AND_LOCALIZATION.md:13` and `docs/03_CURRICULUM_AND_MASTERY.md:117` — vague accessibility target and hard prerequisites without modality semantics.
- `docs/SOURCES.md:79` and `docs/10_LICENSING_AND_PROVENANCE.md` — generic dataset link and separate access-term gap.

These references describe the original package. Line numbers in the proposed package have changed.

## Assessment of each major area

| Area | What is sound | What remains to prove |
| --- | --- | --- |
| Product purpose | Practical Can-do abilities, independent modalities, useful short sessions, local operation, and no streak pressure form a consistent direction. | A working product must show that capability unlocks and scenarios feel useful and enjoyable. The specification cannot prove motivation or learning outcomes. |
| Onboarding and navigation | Account-free start, prior-experience choice, skippable microphone, help, progress detail, and recovery are described. | Test an actual zero-knowledge learner through later goals, including no microphone, hearing deferral, missing models, retries, offline use and restart. |
| Game experience | Language use drives choices and access to situations; a lightweight world avoids requiring a large RPG first. | Validate the scenario runtime, varied interactions, coherent support removal, and transfer beyond memorized scripts. |
| Learning science | The original treats explicit instruction, retrieval/spacing and varied practice cautiously. It does not claim this app has been proven effective. | Version metric definitions and prespecify any efficacy study. A memory scheduler's predictions do not certify communicative proficiency. |
| Curriculum and assessment | Goals, prerequisites, independent production, transfer and delayed checks are appropriate foundations. | Produce the finite band map, reviewed rubrics and actual content; implement exposure tracking, modality prerequisites and correction-driven evidence recomputation. |
| Japanese seed | The few seed expressions are plausible beginner material. No definite mistranslation was found in this small AI review. Kana, IME, register, variant and prosody requirements are recognized. | The seed is tiny and unreviewed. Framework references alone do not establish lexical or grammatical accuracy. Qualified Japanese review, readings, natural variants, audio targets and complete coverage are still required. |
| Language packs | Declarative data, stable IDs, versioning, isolated install, provenance and replaceable engine capabilities are good boundaries. | Complete the SDK for every shipped format. The manifest-only minimal example and seven revised starter schemas are not a full authorable pack system. Prove generality with another language and RTL/multi-script fixtures. |
| Speech | ASR is separated from alignment, acoustics, prosody and feedback; confidence and abstention are central. | Real consented learner data, reference labels, benchmarks, actionable-feedback calibration, held-out results and supported-provider envelopes are essential. |
| Pitch and audio | Guided comparison can teach useful contrasts without claiming perfect native-equivalence detection. | Phrase context, vocal range, unvoiced/devoiced segments, tracking errors, accepted variants and pitch-preserving playback need tested handling. Dictionary word accent cannot automatically grade a whole utterance. |
| Architecture and platforms | Shared web UI, native services, independent domain/storage/speech/pack boundaries and desktop-first delivery are reasonable candidates. | Prove packaged microphone/model behavior and actual native tests on Linux, Windows and macOS. Mobile is a separate feasibility scope. |
| Persistence and privacy | Account-free local profiles, append-oriented evidence, export/import before sync and opt-in cloud are sound. | Test crash/disk-full recovery, migrations, duplicate events, deletion/temp files, transcript minimization, consent revocation, and actual network silence in local mode. |
| Security and updates | Untrusted packs, traversal/size/hash checks, sanitized rendering and optional models have an appropriate threat model. | Implement malicious archives, parser/media limits, native command boundaries, model safety, authenticated update metadata and rollback. A signed pack proves origin, not teaching quality. |
| Licensing and provenance | Code, content, dictionary derivatives, media, runtimes, weights and voice rights are already separated conceptually. | Choose the project's code/content licenses, audit exact selected artifacts and terms, preserve attribution, and resolve uncertain combinations before redistribution. |
| Accessibility and localization | Separate UI/target languages, RTL support, keyboard semantics, reduced motion and honest unassessed modalities are appropriate. | Test real assistive technologies on every supported desktop platform and complete journeys. Alternate modalities cannot be presented as equivalent evidence of a skipped competency. |
| Research and claims | Capability claims and uncertainty are preferable to promises of “fluency in X days.” | Claims must be limited to actual reviewed coverage and measured outcomes. No official certification or efficacy claim is established. |
| Autonomous handoff | Modular specifications, task-specific reading, durable state, bounded repair strategies and acceptance evidence reduce context loss. | The receiving agent still needs a real development environment, reviewer capacity and source/model access. It must honor the human's current request and cannot manufacture evidence or authorizations. |

## Proposed execution contract

The corrected roadmap contains **60 tasks**, of which **56 are required for the desktop 1.0 release candidate**. All other 55 required tasks are predecessors of `REL-001`. No dependency cycles or missing task `read_first` files were found in the integrated roadmap.

Six added tasks make previously implicit work explicit:

- `LEARN-005` defines the versioned mastery and assessment policy before derived mastery implementation.
- `REVIEW-001` defines the finite coverage map and qualified review policy before content promotion.
- `SPEECH-007` calibrates and gates automated speech features.
- `PERF-001` specifies hardware/budgets and `PERF-002` measures the release against them.
- `LIC-001` resolves distribution rights and records the owner's final license choices.

Reading/writing and scenario work now precede course completion. Speech capture requires the model manager. The proposed clarification of the stable pronunciation gate requires at least one calibrated automatic contrast; this makes the original feedback intent explicit rather than allowing an empty feature list to pass. Final audits include the final content/provider/UI dependencies. Each completed task must record acceptance evidence; the release task requires all *other* mandatory tasks done, avoiding a self-precondition.

B2-like Japanese remains the stable desktop goal. Partial previews can be useful with honest labels. Optional AI conversation, mobile, web and advanced continuation are deferred until added to scope. A completed release candidate is a concrete result the owner can inspect; public publication and external actions are separate decisions.

The next implementation task remains `BOOT-001`. This review did not complete implementation tasks or start the application build.

## Validation results

The unchanged original checker failed to start in the system environment because its dependencies were undocumented. After installing dependencies in an isolated environment, the original baseline passed. Nine deliberately invalid or unsupported copies also passed: a task cycle, corrupt lexical JSONL, missing license file, unknown concept, invalid task state, false reference promotion, invalid locale, invalid engine version, and duplicate YAML key. A valid prerelease-plus-build version was wrongly rejected.

The final corrected package produced these results:

| Check | Result | Interpretation |
| --- | --- | --- |
| Handoff structural/semantic validation | PASS; 31 data files; no errors | The included scaffold is internally valid within the documented checker scope. |
| Validator mutation/regression suite | PASS; 44 tests | Reproduced integrity failures are rejected; valid supported cases pass. |
| Roadmap graph and scope | PASS; 60 tasks; 56 required; all other 55 required tasks gate release | Required desktop work cannot be skipped merely by selecting the release task. |
| Strict pack data preflight | EXPECTED FAIL; 11 blockers | Missing assessment, unreviewed content, unresolved license and incomplete SDK correctly prevent a release claim. |
| Original archive/extracted originals | Every file byte-compared | The original package was preserved. |

Four handoff warnings remain deliberate and visible: unresolved draft distribution rights; one explicitly declared missing greeting transfer assessment; a manifest-only minimal example; and the limits of structural checking.

The revised checker does not fetch source URLs, verify rights or reviewer honesty, assess Japanese naturalness, run model inference, exercise the installer, or test an app. Seven provisional schemas now cover the included seed contracts; broader SDK types remain explicit future tasks. Calibration metadata is necessary but cannot by itself prove that its measurements are valid.

The package contains reproducible check commands and the results in `audit/`. The failure of the strict preflight is a correct result for an unfinished seed, not an instruction to lower its criteria.

## Remaining decisions and evidence

The corrected package is ready to guide implementation, but these are real future dependencies:

1. **Project licenses.** Choose and approve the application source-code license and original-content license after compatibility checks. The handoff has no final application license and the seed is intentionally `UNLICENSED-DRAFT`; this must remain a public-distribution blocker.
2. **Qualified Japanese review.** Establish reviewer qualifications, capacity and actual review records. Native fluency alone does not replace pedagogical or assessment expertise, and AI review cannot be relabeled as human review. External reviewer contact needs owner authorization.
3. **Speech datasets and calibration.** Obtain purpose-specific participant consent or compatible dataset rights, predeclare protocols/limits, and measure real learner attempts. Microphone permission does not imply research or redistribution consent.
4. **Coverage and policy artifacts.** Complete the finite objective map, modality prerequisites, mastery policy, assessment schemas and reviewed content. The newly named files are future task outputs, not evidence created during this audit.
5. **Runtime release gates.** Implement and test the application on the actual supported desktop/hardware/model configurations, including offline privacy, security, recovery, performance and accessibility.
6. **Publication.** Prepare signing/distribution credentials, naming checks and release approval when a real candidate exists. No store enrollment, purchase, message or publication was performed during this review.

These items do not require abandoning the product direction. They require honest dependency tracking and evidence before completion claims.

## Primary source verification

The Japanese functional framework was checked against the [Japan Foundation overview](https://www.jfstandard.jpf.go.jp/summaryen/ja/render.do) and [JF Standard guidebook](https://www.jfstandard.jpf.go.jp/pdf/web_whole_en.pdf). The six-band framework and JF activity-descriptor scope are consistent with the original; framework alignment still needs a documented curriculum map.

The cautious explicit-instruction claim is supported by the publisher's [Li and Sun meta-analysis](https://onlinelibrary.wiley.com/doi/10.1111/flan.12726). A [spacing meta-analysis by Kim and Webb](https://doi.org/10.1111/lang.12479) supports distributed practice while showing that conditions and measurement matter. These do not establish this platform's efficacy or an optimal scheduler for every language skill.

The distinction between course performance and spontaneous proficiency is supported by the [ACTFL 2024 guidelines](https://www.actfl.org/uploads/files/general/Resources-Publications/ACTFL_Proficiency_Guidelines_2024.pdf). Accessibility requirements were checked against [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [WCAG2ICT](https://www.w3.org/TR/wcag2ict-22/).

Component rights were checked against the [EDRDG license page](https://www.edrdg.org/edrdg/licence.html), [OJAD terms](https://gavo.t.u-tokyo.ac.jp/ojad/eng/pages/notes), and [pyopenjtalk repository](https://github.com/r9y9/pyopenjtalk). Their notices require component-specific treatment; source isolation makes auditing easier but does not settle legal adaptation boundaries.

The exact [Common Voice Japanese 27.0 release page](https://mozilladatacollective.com/datasets/cmu5xbhnf00fmnq07z9p3aa70) confirms the CC0 label and also states restrictions on speaker identification and re-hosting/re-sharing. The proposed package tracks those access conditions separately from copyright metadata.

Provider/platform claims were checked against the official [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) and [whisper.cpp](https://github.com/ggml-org/whisper.cpp) repositories and [Tauri security](https://v2.tauri.app/security/), [WebDriver](https://v2.tauri.app/develop/tests/webdriver/) and [updater](https://v2.tauri.app/plugin/updater/) documentation. Broad platform support is a candidate capability, not proof of this app's device behavior. Current Tauri documentation describes an embedded WebDriver route for macOS; direct `tauri-driver` has different platform limits.

## Package changes and file coverage

All original files are retained. Revisions are proposed in a separate copy. The added functional files are `schemas/lexical-entry.schema.json`, `tools/requirements.txt`, and `tools/test_validate_handoff.py`; review/report/integrity evidence is also included. No models, private recordings, secrets, generated caches, or application build artifacts are packaged.

| Original file | Review disposition |
| --- | --- |
| `.gitignore` | Reviewed and retained |
| `AGENTS.md` | Proposed correction |
| `CONTRIBUTING.md` | Proposed correction |
| `HANDOFF_PROMPT.txt` | Proposed correction |
| `PACKAGE_MANIFEST.md` | Refreshed package inventory |
| `README.md` | Proposed correction |
| `START_HERE_OMP.md` | Proposed correction |
| `VALIDATION_REPORT.md` | Replaced with measured review results |
| `docs/00_MASTER_SPEC.md` | Proposed correction |
| `docs/01_PRODUCT_AND_UX.md` | Proposed correction |
| `docs/02_LEARNING_SCIENCE.md` | Proposed correction |
| `docs/03_CURRICULUM_AND_MASTERY.md` | Proposed correction |
| `docs/04_LANGUAGE_PACK_SPEC.md` | Proposed correction |
| `docs/05_SPEECH_SYSTEM.md` | Proposed correction |
| `docs/06_JAPANESE_REFERENCE.md` | Proposed correction |
| `docs/07_TECHNICAL_ARCHITECTURE.md` | Proposed correction |
| `docs/08_DATA_AND_PRIVACY.md` | Proposed correction |
| `docs/09_TESTING_AND_ACCEPTANCE.md` | Proposed correction |
| `docs/10_LICENSING_AND_PROVENANCE.md` | Proposed correction |
| `docs/11_ACCESSIBILITY_AND_LOCALIZATION.md` | Proposed correction |
| `docs/12_OBSERVABILITY_AND_RESEARCH.md` | Proposed correction |
| `docs/13_RELEASE_AND_DISTRIBUTION.md` | Proposed correction |
| `docs/14_FAQ_AND_DECISIONS.md` | Proposed correction |
| `docs/15_AUTONOMOUS_DEVELOPMENT.md` | Proposed correction |
| `docs/16_CONTENT_AUTHORING_AND_REVIEW.md` | Proposed correction |
| `docs/17_SPEECH_BENCHMARK_PLAN.md` | Proposed correction |
| `docs/18_PUBLIC_CLAIMS_AND_SCOPE.md` | Proposed correction |
| `docs/19_PROJECT_FILE_ARCHITECTURE.md` | Proposed correction |
| `docs/SOURCES.md` | Proposed correction |
| `docs/adr/0001-language-packs-declarative.md` | Proposed correction |
| `docs/adr/0002-no-streaks.md` | Proposed correction |
| `docs/adr/0003-speech-provider-abstraction.md` | Proposed correction |
| `examples/minimal-language-pack/README.md` | Proposed correction |
| `examples/minimal-language-pack/manifest.yaml` | Proposed correction |
| `languages/ja-JP/LICENSES.yaml` | Proposed correction |
| `languages/ja-JP/README.md` | Proposed correction |
| `languages/ja-JP/SOURCES.yaml` | Proposed correction |
| `languages/ja-JP/activities/scenarios/first-meeting.yaml` | Reviewed and retained |
| `languages/ja-JP/curriculum/goals.yaml` | Proposed correction |
| `languages/ja-JP/curriculum/units/000-onramp-greeting.yaml` | Proposed correction |
| `languages/ja-JP/grammar/concepts.yaml` | Reviewed and retained |
| `languages/ja-JP/grammar/dependencies.yaml` | Reviewed and retained |
| `languages/ja-JP/language/identity.yaml` | Proposed correction |
| `languages/ja-JP/language/normalization.yaml` | Reviewed and retained |
| `languages/ja-JP/lexicon/expressions.jsonl` | Proposed correction |
| `languages/ja-JP/lexicon/vocabulary.jsonl` | Proposed correction |
| `languages/ja-JP/manifest.yaml` | Proposed correction |
| `languages/ja-JP/orthography/scripts.yaml` | Reviewed and retained |
| `languages/ja-JP/orthography/transliteration.yaml` | Reviewed and retained |
| `languages/ja-JP/phonology/inventory.yaml` | Reviewed and retained |
| `languages/ja-JP/phonology/prosody.yaml` | Proposed correction |
| `languages/ja-JP/pragmatics/registers.yaml` | Proposed correction |
| `languages/ja-JP/pragmatics/situations.yaml` | Reviewed and retained |
| `languages/ja-JP/speech/accepted-variants.yaml` | Proposed correction |
| `languages/ja-JP/speech/profile.yaml` | Proposed correction |
| `languages/ja-JP/speech/rubrics.yaml` | Reviewed and retained |
| `languages/ja-JP/tests/README.md` | Proposed correction |
| `schemas/README.md` | Proposed correction |
| `schemas/concept.schema.json` | Reviewed and retained |
| `schemas/goal.schema.json` | Proposed correction |
| `schemas/language-pack-manifest.schema.json` | Proposed correction |
| `schemas/source-entry.schema.json` | Reviewed and retained |
| `schemas/speech-profile.schema.json` | Proposed correction |
| `schemas/unit.schema.json` | Proposed correction |
| `state/STATUS.md` | Proposed correction |
| `state/evidence/README.md` | Reviewed and retained |
| `state/notes/README.md` | Reviewed and retained |
| `state/task-state.json` | Proposed correction |
| `tasks/ROADMAP.yaml` | Proposed correction |
| `tools/AI_LANGUAGE_PACK_AUTHOR_PROMPT.md` | Proposed correction |
| `tools/validate_handoff.py` | Proposed correction |
