# 16 — Curriculum Content Authoring and Review Protocol

## Why this exists

The project expects large amounts of content and explicitly wants AI-assisted language-pack generation. Scale is useful only if quality controls are stronger than generation speed.
The runnable form of this protocol lives in one place: `docs/QUICKSTART_PACK_AUTHORING.md` (scaffold command, the seven gate commands, the audio rules, the review handoff), with the copy-paste brief for an AI author at `tools/AI_LANGUAGE_PACK_AUTHOR_PROMPT.md`.

## Authoring order

Do not generate thousands of lessons first. Use this order:

1. source/license matrix;
2. language identity/variants;
3. orthography model;
4. phonology/prosody model;
5. grammar/pragmatics concept graph;
6. functional goal graph;
7. assessment specifications;
8. lexical coverage/import;
9. scenario/activity templates;
10. bounded unit/content batches;
11. validation/review;
12. expand next batch.

This prevents bulk content from encoding a bad architecture.

## Content batch size

AI-generated content should be produced in reviewable batches keyed to one small cluster of goals. A batch must validate before the next batch is generated.

## Required fields for instructional content

At minimum:

- stable ID;
- target goal/concept IDs;
- learner band;
- modality;
- language form;
- intended meaning/function;
- register/context;
- prerequisites;
- accepted variants where relevant;
- source IDs;
- review state;
- generator provenance if AI-generated.

The supplied schemas are an initial SDK scaffold. Bootstrap must implement the content/provenance/review envelope needed for these fields before authoring shippable content; schema acceptance alone is not fulfillment of this protocol. Bind provenance and review evidence to stable content IDs and exact versions. An unresolved source, reading, target or assessment remains explicit draft work and blocks the relevant release-readiness gate.

## Example policy

Examples must be:

- grammatical;
- natural for the declared context/register;
- understandable using introduced prerequisites or explicitly marked new material;
- not misleading literal translations;
- free of accidental cultural stereotypes;
- licensed/original.

## Translation policy

Translations communicate meaning and context, not fake one-to-one structural equivalence. Add notes when a literal mapping would teach the wrong model.

## Distractor policy

Wrong answers should diagnose plausible confusion, not trick the learner with arbitrary ambiguity. Never make an answer wrong only because the author preferred one natural variant.

## AI generation prompt constraints

Each generation batch should receive:

- exact allowed target IDs;
- allowed/prerequisite vocabulary and grammar;
- source registry subset;
- register/context;
- new-item limit;
- output schema;
- prohibited assumptions;
- instruction to return unresolved questions separately.

AI must not invent citations. If a requested fact cannot be supported, output `REVIEW_REQUIRED` rather than fabricate.

## Review categories

### Structural review

Automated: schema, IDs, graph, allowed-content scope, license/source presence.

### AI screening

Automated (`executor: ai` in `languages/*/review/REVIEW_POLICY.yaml`): screening
that flags likely linguistic/pedagogical defects before human review time is
spent, and gates bulk generation — a batch must pass structural **and** AI
screening before the next batch is generated. `counts_toward_human_gates: false`,
so it is recorded but never closes a gate; the content-review issue template
excludes it and structural on purpose.

### Linguistic review

Naturalness, meaning, pronunciation/readings, grammar, variants, register.

### Pedagogical review

Difficulty, prerequisite load, task validity, scaffolding, distractor quality, transfer value.

### Technical review

Rendering, audio linkage, speech targets, determinism, platform behavior.

## Trust promotion

A batch cannot become `verified` merely because an AI reviewed another AI. Human/qualified linguistic review is required by the project's current reference-pack policy. Community packs may remain at lower trust levels with transparent labels.

Before the first batch is promoted, record a review protocol with:

- qualification categories appropriate to the content (Japanese linguistic competence plus relevant teaching, assessment or phonetics expertise as needed);
- reviewed content IDs/versions and source/license scope;
- coverage and sampling rationale, including full review of core explanations, answer keys, assessed targets and reference audio, and a justified method for lower-risk generated variations;
- checks for meaning, naturalness, readings/pronunciation, variants/register, prerequisite load, translation/distractor ambiguity and accessibility of the instructional form;
- review date, issue severity, resolutions, unresolved disagreements and an adjudication/escalation method;
- reviewer consent for any public attribution, keeping personal details private otherwise.

Native or near-native status is a useful qualification category but does not establish pedagogical or assessment expertise by itself. AI review can flag issues for a qualified reviewer and cannot serve as that human reviewer. Missing reviewer availability is a declared blocker to promotion, not permission to invent an approval.

Automated speech feedback requires its own human-labeled calibration and release gate under `docs/17_SPEECH_BENCHMARK_PLAN.md`; a natural Japanese example is not proof that a model can score learners reliably. Listen to the actual reference/TTS output used in assessed lessons. Generated error audio and accent/G2P predictions remain hypotheses until checked. Material changes to content, audio, accepted variants or assessment targets require review of the affected scope and revalidation of related speech calibration.

## Corrections

A content correction must:

- preserve stable IDs when semantic identity is unchanged;
- bump content/pack version;
- add a regression test when the error class can recur;
- re-evaluate affected learner evidence if the old item was materially invalid;
- record correction notes for significant errors.

## Invalid content and mastery

If a scored item is later found invalid/ambiguous, its evidence should be marked excluded or recomputed rather than leaving incorrect penalties/rewards in mastery history.
