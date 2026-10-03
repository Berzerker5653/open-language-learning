# 02 — Learning Science and Pedagogical Contract

This document translates research into product constraints. It is not a claim that one learning theory is universally settled.

## 1. Functional proficiency first

The Japanese reference curriculum should be organized around real communicative abilities. The Japan Foundation's JF Standard explicitly describes proficiency through Can-do statements and six CEFR-aligned levels, emphasizing tasks a learner can accomplish rather than counts of grammar, words, or kanji.

Product implication: vocabulary/grammar are dependencies of capabilities, not the primary level system.

## 2. Multiple modalities require multiple evidence streams

Listening, speaking, reading, and writing differ substantially. Recognition is not production. The learner model therefore records evidence by modality and context.

Product implication: never mark a lexical item globally mastered because a learner selected its English translation once.

## 3. Retrieval and spacing

Long-term retention benefits from distributed retrieval rather than massed exposure. The project may use an FSRS/DSR-style scheduler for retrievable knowledge components, while higher-order skills use task-specific evidence and revisit policies.

Product implication: schedule at the smallest meaningful unit, but avoid reducing communication to flashcards.

Research supports spacing in L2 learning, with effects varying by learning target, practice, and retention interval; it does not establish FSRS as the best model for every language competency. Treat the scheduler choice and numerical mastery rules as implementation hypotheses to evaluate. See [Kim & Webb (2022)](https://doi.org/10.1111/lang.12479).

## 4. Explicit instruction is allowed and useful

Adults can benefit from concise explicit instruction; the product should not imitate child acquisition by withholding explanations. Meta-analytic evidence has found meaningful benefits from explicit L2 instruction, though effects vary with treatment and outcomes.

Product implication: use contextual exposure plus concise explanation at teachable moments. Do not force every learner to derive every grammar rule implicitly.

## 5. Comprehensible/contextual exposure

Learners need repeated encounters with language they can mostly interpret from context, support, and prior knowledge.

Product implication: scenarios should recycle known material while introducing limited novelty, and scaffolds should fade as competence increases.

## 6. Variation and transfer

Repeated exposure should vary speaker, wording, context, and task. Exact-item memorization is weak evidence for flexible language ability.

Product implication: mastery checks include novel combinations and held-out prompts.

Separate practiced curriculum performance from sustained unrehearsed proficiency. A small variation of a familiar script is useful transfer evidence within its defined scope, but does not by itself establish a global proficiency band. [ACTFL Proficiency Guidelines 2024](https://www.actfl.org/uploads/files/general/Resources-Publications/ACTFL_Proficiency_Guidelines_2024.pdf) make this distinction explicit.

## 7. Interleaving

Sessions should mix old and new material and revisit related skills in different contexts when doing so does not overload a beginner.

Product implication: the planner balances continuity with distributed retrieval instead of presenting an endless block of one exercise type.

## 8. Corrective feedback

Feedback is most useful when it helps the learner notice and repair a specific mismatch. Automated systems have uncertainty and must avoid false precision.

Product implication: choose one or a few high-value corrections, distinguish linguistic error from ASR uncertainty, and provide an immediate retry.

## 9. Pronunciation instruction

Pronunciation deserves direct instruction rather than assuming exposure alone will optimize it. For Japanese, phoneme/mora timing, vowel length, gemination, rhythm, and pitch-related features may be instruction targets.

Product implication: speech recognition and acoustic assessment are separate systems.

## 10. Productive difficulty, not punitive difficulty

Effortful retrieval can strengthen learning, but frustration and arbitrary punishment are not learning mechanisms.

Product implication: no hearts/lives required for core progression. Difficulty increases through reduced scaffolding, more authentic input, and spontaneous production.

## 11. Metacognition

Learners are not always accurate judges of mastery. Self-rating is useful input but not sole evidence.

Product implication: show transparent reasons for practice recommendations and combine self-confidence with observed performance.

## 12. Mastery evidence hierarchy

For a typical communicative target, evidence strength increases roughly as follows:

- passive exposure;
- recognition with strong cue;
- recognition without translation;
- cued recall;
- guided production;
- independent production;
- use in a novel scenario;
- successful use after a retention interval.

This ordering is not universal; receptive-only targets may differ.

## 13. Avoiding translation dependence

Direct translation is useful for clarification but can become a crutch.

Product implication: reduce default English exposure as target-language comprehension improves; use imagery, situations, paraphrase, and target-language definitions at higher levels.

## 14. Error taxonomy

The engine should classify likely error source when feasible:

- knowledge gap;
- retrieval failure;
- distractor/guessing;
- orthographic confusion;
- auditory discrimination;
- speech-production error;
- pragmatic/register mismatch;
- technical recognition failure;
- ambiguous/invalid content.

The remediation strategy depends on the category.

## 15. No fake scientific precision

Do not claim that a mastery percentage is a direct measure of fluency. Internal scores are decision aids whose evidence quality and uncertainty must be explained. A heuristic confidence band is not a statistical confidence interval; show intervals only when the underlying estimation method has been validated. Memory retrievability is a scheduling estimate, not communicative mastery or proficiency.

## 16. Efficacy research plan

Before strong public claims, evaluate:

- delayed retention;
- transfer to unseen items;
- independent listening/speaking outcomes;
- support reduction over time;
- comparison of different lesson/activity formats;
- pronunciation feedback false-positive/false-negative rates.

Prefer preregistered or at least pre-specified evaluation protocols for major pedagogical claims.

Define claim-specific outcomes, assessment rubrics, prompt/speaker separation, delayed intervals, sample/attrition handling, comparison conditions where needed, and analysis/claim rules before collecting the study data. Numerical targets must come from a justified protocol, not an optimistic threshold selected after observing results. Uncompleted efficacy research blocks unsupported efficacy claims; it must not be reported as completed merely because the study plan exists.

## 17. Source basis

See `docs/SOURCES.md`. Key foundations include JF Standard/CEFR-aligned Can-do descriptors, ACTFL functional proficiency framing, research syntheses on explicit instruction, and open spaced-repetition work derived from DSR-style models.
