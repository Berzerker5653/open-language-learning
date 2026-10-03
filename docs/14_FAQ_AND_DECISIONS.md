# 14 — Product/Engineering FAQ and Pre-Answered Decisions

## Is this a website, desktop app, or mobile app?

Build the core as a cross-platform local-first application using a shared web UI and native shell. Desktop is first. Mobile follows. A PWA may exist as a capability subset. Do not make a cloud website the only product.

## Does the app require an account?

No. Local profile first. Sync/account is optional future work.

## Does it require internet?

Not for installed curriculum and installed local speech/model capabilities. Internet is needed for downloads/updates and optional cloud providers.

## Are there streaks?

No. This is a hard product rule.

## What motivates return use instead?

Capability unlocks, scenarios, story/world progression, skill goals, useful short practice, and visible evidence of what the learner can now do.

## Can users skip days?

Yes. The scheduler adapts to elapsed time. No punishment.

## Does a five-minute session count?

It is useful if it includes real retrieval/practice. There is no artificial "count" to preserve.

## Do we teach grammar?

Yes, explicitly when useful and always tied back to comprehension/production in context.

## Do we teach vocabulary lists?

Vocabulary is taught and reviewed, but vocabulary count is not the product's definition of proficiency.

## Do we teach reading before speaking?

They progress in parallel and can diverge. Japanese kana begins early without blocking spoken language.

## Do we use romaji?

As temporary scaffolding. It fades and is not a permanent crutch.

## Do we teach pitch accent?

Yes as a Japanese pronunciation/prosody dimension where data/models permit reliable teaching. Automated scoring must be confidence-calibrated and variant-aware. Never imply that one accent pattern is the only natural Japanese across all regions.

## Is speech-to-text enough for pronunciation?

No. Recognition and pronunciation analysis are separate.

## What if the app cannot judge a recording?

It says so and asks for a retry or offers guided comparison. It does not invent a correction.

## Which ASR do we use?

Provider interface first. Benchmark sherpa-onnx and whisper.cpp-class options. Choose a default based on Japanese accuracy, latency, size, platform support, timestamps, and licensing. Keep the adapter replaceable.

## Which TTS do we use?

Provider interface. Prefer licensed human recordings for core targets and validated local TTS for scalable variants. Audit voice/model licenses separately.

## Should we bundle a local LLM?

Not for the core MVP. An LLM is optional for conversation/explanations/content authoring. Core lessons, mastery, and offline use must not require one.

## Can an AI generate a new language pack?

Yes, this is a major goal. It generates a candidate pack using schemas and sources, then automated validation and human/qualified linguistic review determine trust level.

## Can language packs run code?

No, not by default. They are untrusted declarative data. Missing language capabilities should improve the engine/spec rather than introduce arbitrary scripts.

## How do we handle a language with no spaces?

The language identity/normalization/tokenization model cannot assume whitespace tokenization. Pack/schema supports language-specific segmentation metadata and engine capability flags.

## How do we handle RTL?

UI and pack text direction are explicit, not inferred from English assumptions.

## How do we handle dialects?

Packs can declare reference and accepted variants. Mastery feedback should distinguish variant from error when data supports it.

## How do we handle slang?

As register/time/region-tagged content introduced at appropriate levels, not as replacements for foundational forms.

## How do we prevent AI hallucinations in curriculum?

Source registry, bounded generation, schema/graph audits, deterministic checks, review states, sampled human review, and no self-promotion to verified/reference status.

## How do we know a learner has mastered something?

Multiple independent evidence events across relevant modalities, decreasing support, varied contexts, transfer, and delayed retention. Not one correct answer.

The versioned policy produced by `LEARN-005` defines the actual transitions, eligible scoring, independent attempt/prompt-family grouping, support conditions, retention intervals, and provisional/calibrated confidence. Repeated coached retries do not create independent observations, and FSRS memory estimates do not grant Can-do mastery. Technical failures, scorer abstention, skips, and deferred modalities are unscored.

## What if a learner guesses?

Low-information multiple choice creates weak evidence. The engine uses recall/production/variation and can discount implausibly fast repeated guessing patterns.

Response speed alone is not evidence of guessing, and slow response alone is not a language failure. IME, device, disability, and assistive-technology delays must not lower ordinary mastery evidence. Timed objectives require an explicit valid rubric and accommodation/deferral behavior.

## Can users focus on speaking only?

They can prioritize it, but the system reports unassessed reading/writing rather than claiming balanced proficiency.

## Can users disable speaking?

Yes for accessibility/privacy/device reasons. Speaking mastery remains unknown/unassessed.

Relevant reading/writing tracks and later scenario access must remain usable. The engine distinguishes an accessible track unlock from a mastered linguistic prerequisite; it may grant the former without fabricating the latter. Transcript-supported work cannot earn pure listening mastery, and typed answers cannot earn speaking mastery.

## Do we make users handwrite Japanese?

Optional track. IME/reading/composition and handwriting are separate skills. Handwriting does not gate conversational progress.

## Are JLPT levels the main framework?

No. JLPT can be an optional reference/crosswalk later, but the product centers functional Can-do abilities and modality-specific evidence. Do not claim official JLPT preparation/certification without appropriate work.

## Do we claim fluency?

Avoid vague "fluent in X days" claims. Report demonstrated abilities and framework-aligned coverage with clear limitations.

Stable desktop 1.0 targets approved, mapped and qualified-reviewed Japanese on-ramp through B2-like coverage. Partial previews can ship as alpha/beta with clear limitations. Reducing the stable target requires an explicit owner decision. `REVIEW-001` must define a finite coverage/review policy before reference promotion: all scored/reused core targets require actual qualified human review; limited sampling is only for labeled lower-risk unscored practice. No AI, structural validator, or unexecuted checklist can stand in for that evidence.

Course coverage is not a guarantee of learner proficiency or proof of this product's efficacy. Future calibration and effectiveness studies remain uncompleted until their actual evidence is recorded. Producing a reviewable release candidate does not itself authorize publication.

## Can the product make money later?

The architecture does not require a business model. Licensing decisions must preserve the owner's intended open-source release. Do not include data with terms that silently forbid plausible future distribution models.

## What happens if a source license is unclear?

Mark it reference-only/blocked and find an alternative. Do not ship first and investigate later.

## How do we prevent context loss for OMP?

Small master contract + modular docs + machine-readable tasks + durable task notes/evidence. Never require every task to load all documentation.
