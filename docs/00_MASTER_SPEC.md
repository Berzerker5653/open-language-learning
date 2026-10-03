# 00 — Master Product Specification

Status: AUTHORITATIVE

## 1. Vision

Create an open-source, local-first language-acquisition platform that teaches a learner to **understand, speak, read, write, and interact** in a selected language through meaningful activity, progressive immersion, explicit instruction where useful, retrieval practice, adaptive review, and game-like scenarios.

The first reference implementation is Japanese for an English-speaking beginner starting at effectively zero knowledge.

The platform must be extensible enough that a human or AI can build a new language pack using published schemas, source requirements, tests, and tooling without rewriting the application.

## 2. What this product is not

It is not:

- a streak-preservation app;
- a vocabulary flashcard app with a game skin;
- a translation quiz as the primary learning mode;
- an AI chatbot that improvises an unverified curriculum;
- a system that calls speech-to-text "pronunciation assessment";
- a web service that stops working without an account or cloud API;
- a Japanese-only application disguised as a generic platform.

## 3. Core outcomes

A successful learner should increasingly be able to:

- understand target-language speech in realistic contexts;
- produce intelligible, context-appropriate speech;
- recognize and produce relevant writing systems;
- read authentic or graded material with decreasing support;
- construct novel sentences rather than repeat memorized strings;
- accomplish practical tasks in the target language;
- repair misunderstandings and ask for clarification;
- choose appropriate register/politeness for a situation;
- retain abilities over time;
- transfer learned structures to unfamiliar examples and speakers.

## 4. Non-negotiables

### 4.1 No streaks

No streak counters, streak freezes, daily-loss penalties, or rewards that can be preserved by repeating trivial work. Short sessions are supported, but the session planner must choose meaningful review or practice.

### 4.2 Capability-based progression

Primary progress measures are Can-do style communicative abilities and modality-specific mastery, not XP, lesson count, vocabulary count, or days active.

### 4.3 Independent modalities

Listening, speaking, reading, writing, pronunciation/prosody, grammar production, and interaction are independently tracked. Evidence in one modality can inform another but must not automatically grant mastery.

### 4.4 Language-pack first

The engine exposes declarative language-pack capabilities for orthography, phonology, grammar, lexicon, pragmatics, curriculum, assessment, speech requirements, and assets. Packs are untrusted data and normally contain no executable code.

### 4.5 Local-first speech

Speech capture and processing remain local by default. Cloud providers may be added as explicit opt-in alternatives.

### 4.6 Uncertainty must be representable

ASR, pronunciation scoring, content validation, and AI-generated feedback must be able to abstain. The UI must distinguish "incorrect" from "could not confidently assess."

### 4.7 Provenance

Instructional content and distributed assets require source/license metadata. AI generation never erases provenance requirements.

### 4.8 Transfer assessment

Mastery cannot be earned exclusively by memorizing exact prompts. Assessment must include novel combinations, altered speakers/contexts, and production where appropriate.

## 5. Target audiences

Primary initial user:

- adult English speaker;
- little or no Japanese knowledge;
- inconsistent available study time;
- has not retained motivation in conventional streak/quiz apps;
- values practical comprehension and speaking;
- may use desktop first, with mobile support desired later.

Secondary:

- self-directed language learners;
- open-source contributors;
- educators/linguists reviewing or building packs;
- AI-assisted pack authors.

The architecture must not preclude younger learners, but the initial UX and privacy model do not assume a child account system.

## 6. Product experience

The default experience is a sequence of increasingly open **situations** rather than a list of worksheets. Early interactions provide generous scaffolding. Later interactions remove translations, vary wording and voices, require spontaneous retrieval, and introduce ambiguity or repair strategies.

Representative situations:

- greeting someone;
- introducing oneself;
- asking/answering basic questions;
- navigating a room/neighborhood;
- buying an item;
- ordering food;
- asking directions;
- planning a meeting;
- understanding announcements;
- describing events;
- expressing opinions;
- reading notices/messages;
- handling a misunderstanding.

Game progression unlocks environments, conversations, story/task opportunities, and autonomy. Rewards should correlate with real capabilities.

## 7. Learning loop

A typical concept/skill moves through:

1. contextual encounter;
2. comprehension check;
3. optional concise explanation;
4. guided recognition;
5. active retrieval;
6. guided production;
7. independent production;
8. varied-context reuse;
9. delayed review;
10. transfer assessment;
11. durable/retained state.

Not every item requires every step; the curriculum engine chooses based on competency type.

## 8. Progression model

Use JF Standard/CEFR-aligned Can-do objectives for Japanese as a primary functional framework. ACTFL proficiency concepts may be used as a secondary cross-check for spontaneous real-world capability. Do not reproduce restricted assessment materials or claim official certification.

Internally, proficiency is richer than a single CEFR label. Track evidence by skill, modality, context, complexity, independence, and retention.

## 9. Mastery model

Each assessable unit is identified by a stable concept/skill ID and one or more modality dimensions. Store evidence events rather than only a mutable percent.

Canonical derived states, evaluated separately for each target and applicable modality:

- unseen;
- introduced;
- supported;
- independent;
- flexible;
- retained.

Recognition and production are separate dimensions, not steps that automatically promote one another. `unassessed`, `deferred`, and `excluded` describe evidence/availability, not additional mastery states. The versioned mastery policy in `docs/03_CURRICULUM_AND_MASTERY.md` determines transitions and confidence.

The engine derives current mastery/confidence from evidence. A learner can regress when evidence ages or repeated failures occur.

## 10. Review/scheduling

Use a memory model for retrievable items (FSRS/DSR-style scheduling is a strong baseline candidate) but do not force every skill into a flashcard abstraction. The session planner combines:

- due retrieval;
- prerequisite repair;
- weak modalities;
- new curriculum progression;
- interleaving;
- learner-selected goals;
- session duration;
- fatigue/repetition limits;
- scenario continuity.

The scheduler must never require daily attendance.

## 11. Speech architecture

Speech is a pipeline, not one score:

microphone -> preprocessing/VAD -> ASR/utterance verification -> alignment -> acoustic/prosodic features -> language-pack interpretation -> confidence-aware feedback.

Provider interfaces must permit replacement/benchmarking of ASR, VAD, TTS, alignment, pitch/prosody, and optional AI explanation components.

For Japanese, support testing of mora timing, vowel length, gemination, phoneme production, rhythm, F0/pitch contour, and pitch-accent behavior where reliable data/models permit it.

## 12. AI policy

AI can assist with:

- pack generation;
- content drafting;
- exercise variation;
- code generation;
- scenario generation;
- explanation generation;
- optional conversation practice.

AI must not be the sole authority for:

- factual linguistic correctness;
- pronunciation target data;
- licenses/provenance;
- advancement/mastery decisions when deterministic evidence is available;
- safety-critical data handling.

Dynamic AI content must be constrained to known learner vocabulary/grammar where required and validated or clearly labeled when free-form.

## 13. Platforms

Recommended product architecture:

- web-technology UI shared across platforms;
- Tauri 2 native shell for desktop and potentially mobile;
- Linux/Windows/macOS desktop as the first production target;
- Android/iOS after the core and speech stack are stable;
- optional PWA/web build for reduced-capability use, not at the expense of local speech/privacy.

This is a recommendation, not a sacred dependency. If an implementation spike proves a superior architecture, record an ADR and preserve the requirements.

## 14. Data/storage

Core profile works without an account. Use local durable storage (SQLite is the preferred desktop baseline) with explicit schema migrations. Store mastery/evidence separately from disposable derived caches. Export/import must be supported before cloud sync.

## 15. Content lifecycle

Language-pack content transitions through trust states:

- experimental;
- community;
- validated;
- verified;
- reference.

Structural validation is necessary but not sufficient for verification.

## 16. Accessibility

The learning experience must not require hearing, speaking, color perception, precise pointer control, or animation to navigate the application. Some language competencies necessarily involve audio/speech, but the application must provide accessible alternatives and never trap navigation behind them. Modality deferral must preserve access to relevant other learning tracks without granting unearned mastery. The accessibility target is WCAG 2.2 AA for the web UI, interpreted with WCAG2ICT for native software, plus the product accommodations and tested platform matrix in `docs/11_ACCESSIBILITY_AND_LOCALIZATION.md`.

## 17. Privacy

Default telemetry is off unless an explicit local-only diagnostics mode is enabled. No microphone recording is uploaded without an opt-in provider action. Local recordings used for practice should be deletable and have configurable retention. Training on user recordings is never implied by use of the product.

## 18. Success metrics

Primary product metrics are learning-quality metrics such as:

- transfer-task success;
- retained mastery after delay;
- reduction in support needed;
- listening comprehension with unseen speakers;
- successful spontaneous production;
- pronunciation error improvement where reliable;
- percentage of session time spent in meaningful target-language activity.

Do not optimize product decisions around streak length or raw time-on-app.

## 19. Release 1.0 target

Release 1.0 requires:

- stable desktop application on primary supported OSes;
- local learner profile and persistence;
- curriculum/mastery/session engine;
- language-pack SDK + schema + validation CLI;
- installable Japanese reference pack with validated, qualified-human-reviewed on-ramp through B2-like communicative coverage, checked against a finite approved coverage manifest;
- listening and speech-recognition practice;
- pronunciation feedback with calibrated confidence and explicit limitations, including at least one high-value Japanese contrast qualified for automatic feedback within a declared useful coverage envelope; guided-only previews do not fulfill this stable-release gate;
- reading/writing support for Japanese scripts;
- game/scenario layer sufficient to make language use the primary interaction;
- export/import;
- offline core operation;
- accessibility gates;
- license/provenance audit;
- complete automated release test suite.

The stable 1.0 target is Japanese on-ramp through B2-like communicative coverage, consistent with the README and roadmap. This is a project coverage target, not official certification or a guarantee that every learner reaches B2. The pack may not be labeled B2 complete until mapped coverage, valid assessments, qualified human review, and the release gates support that claim. Partial/A1/A2 previews may ship as explicitly limited alpha/beta builds. Reducing the stable 1.0 target requires an explicit owner scope decision and synchronized changes to the specification, roadmap, and public claims; an implementation agent must not silently narrow it.

No policy or acceptance checklist in this handoff is evidence that its gate has already passed. Calibration, human review, learning efficacy, and supported-platform conformance require actual future results.

## 20. Ultimate end state

The engine and pack format support curricula through advanced proficiency, multiple languages, community packs, optional synced profiles, optional conversation models, and richer simulated worlds—without compromising the local-first, no-streak, evidence-driven foundation.
