# 03 — Curriculum, Mastery, Assessment, and Session Planning

## 1. Curriculum is a graph

A course is a typed curriculum graph, not merely `lesson 1 -> lesson 2 -> lesson 3`. The hard-prerequisite subgraph is a directed acyclic graph (DAG); non-prerequisite relationships such as reinforcement or contrast may contain cycles and must be traversed by relation type with cycle-safe logic.

Node types:

- communicative goal;
- grammar construction;
- lexical concept/expression;
- listening contrast;
- pronunciation feature;
- orthographic unit;
- reading skill;
- writing skill;
- pragmatic/register skill;
- culture/context note;
- strategy (repair, clarification, turn-taking).

Edges include:

- prerequisite;
- helpful-before;
- contrasts-with;
- reinforces;
- transfers-to;
- assessed-by.

Circular `prerequisite` edges are invalid.

## 2. Stable IDs

Content IDs never depend on display text or filesystem order. Example:

- `ja.goal.a1.introduce-self`
- `ja.grammar.copula.polite-desu`
- `ja.lex.person.watashi`
- `ja.orth.hira.a`
- `ja.phon.long-vowel`

IDs survive wording edits and are used by mastery history.

## 3. Evidence event model

Every meaningful learner interaction emits an event containing at least:

- event ID/time;
- learner/profile ID;
- target IDs;
- modality;
- activity type;
- difficulty/support level;
- expected response shape;
- result;
- response latency where useful;
- hints/replays/translations used;
- ASR/acoustic confidence when applicable;
- content/version IDs;
- device/provider metadata needed for reproducibility (privacy-safe).

Scored evidence also records activity/prompt ID and prompt-family ID, attempt/assessment-group ID, prior exposure/held-out status, actual support actions, assessment/rubric/policy versions, and score eligibility. A result distinguishes `scored`, `technical-failure`, `abstained`, `skipped`, `deferred`, and `excluded`; only valid `scored` results can affect linguistic mastery or memory-retrieval ratings. Exclusion/correction events reference the affected original evidence without silently deleting history.

Derived mastery can be recomputed from events after algorithm changes.

## 4. Mastery dimensions

Recommended dimensions:

- comprehension-listening;
- comprehension-reading;
- recall-meaning;
- orthography-recognition;
- production-speaking;
- production-writing;
- pronunciation-segmental;
- pronunciation-prosody;
- phonological-discrimination;
- orthographic-encoding;
- grammar-controlled;
- grammar-spontaneous;
- pragmatic-use;
- interaction;
- retention.

Not every target uses every dimension.

`orthography-recognition` tracks symbol↔reading mapping for
script-instruction units (`orthography/*.jsonl`, K-04). When every
kana-script unit taught by the active pack reaches at least `supported`
on this dimension, the profile setting `kana-literacy-established` is
set (Unicode-script detection, never locale), which fades kana romaji
scaffolds per JA_ORTHOGRAPHY_POLICY. The roll-up is monotonic: later
per-item regressions fade scaffolds but do not re-establish literacy.

`phonological-discrimination` tracks perceptual contrast recognition
(K-10): the pack declares contrast sets (`phonology/contrasts.jsonl`,
each bound to a phonology feature id); the runner plays one member and
the learner identifies which was heard. It is deliberately separate
from the production pronunciation dimensions: hearing a contrast is
evidence about perception and never grants credit for producing it,
so prerequisite records scoped to `pronunciation-*` stay honest.
Audio is media-first (licensed pack recordings win); synthesized audio
is labeled model output and packs must not declare contrasts the
synthesizer cannot actually produce (e.g. pitch-accent pairs without
accent control).

`orthographic-encoding` tracks perceptual encoding of written form
(K-12 dictation): the learner hears a pack-declared sentence
(`sentences/entries.jsonl`) and types the transcription. It is
deliberately separate from `production-writing`: MASTERY_POLICY lists
dictation-of-target as disqualifying support for generative writing,
so transcription evidence must never satisfy production-writing
prerequisites. Cloze exercises the writing dimension honestly: a
pack-declared target is blanked in its sentence and typed from context,
with the target never visible during the attempt.

## 5. Mastery state machine

States are derived, not blindly incremented:

`unseen -> introduced -> supported -> independent -> flexible -> retained`

Regression is allowed.

Illustrative evidence rules (to be calibrated, not hard-coded as universal truth):

- `introduced`: completed a valid encounter;
- `supported`: multiple successful responses with scaffolding;
- `independent`: successful retrieval/production with minimal help across more than one prompt;
- `flexible`: success across novel wording/context/speaker or composition;
- `retained`: flexible or independent success after a meaningful delay.

A single correct response cannot establish durable mastery.

### Versioned mastery policy — required before implementation/promotion

`LEARN-005` must produce `docs/assessment/MASTERY_POLICY.yaml` before `LEARN-002` implements transitions. The artifact is a future deliverable, not existing calibration evidence. It must contain:

- policy/schema version and canonical state names above, scoped by target and modality;
- eligible activity types, required response/score data, rubric references, and support/modality-validity rules;
- minimum amount and diversity of evidence, attempt grouping, prompt-family grouping, and what counts as independent evidence;
- minimum conditions for independent/flexible/retained states, declared retention intervals, recency/regression rules, and how incomplete/deferred modalities appear;
- criteria for held-out evidence, exposure contamination, repeat attempts, and generated-but-validated prompts;
- confidence semantics and calibration status, including explicit limitations of heuristic estimates;
- exclusions for technical failure, abstention, invalid content, accommodation conditions, and correction/recomputation behavior;
- deterministic fixtures covering each transition, no transition, regression, and exclusions.

Thresholds may initially be provisional engineering defaults with stated rationale. They must not be presented as universal learning-science constants or statistically calibrated confidence. Calibration datasets and subsequent results version the policy; unknown/uncalibrated evidence must never silently become high-confidence proficiency. A repeated immediate retry belongs to the same evidence group and cannot create multiple independent mastery observations.

### Support-level defaults

`support_level` is an ordinal summary from 0 (least additional help) to 5 (most). Default meanings are:

| Level | Default support condition |
| --- | --- |
| 0 | No additional answer-revealing scaffold beyond the declared task context and rubric-permitted assistance. |
| 1 | Extra environmental/context cue that does not supply the response form or full meaning. |
| 2 | Additional replay, slowed input, or a limited meaning hint. |
| 3 | Text/reading/form cue or guided slot/choice that materially narrows the response. |
| 4 | Partial translation, response template, or model supplying most of the answer. |
| 5 | Full translation or full modeled response available to copy/repeat. |

An activity rubric may classify assistance differently when justified by the assessed construct; record that mapping/version and the actual support actions. Levels are not interchangeable across modalities and must not be used as a universal numeric mastery weight. A transcript invalidates pure listening evidence; romaji or supplied readings cannot establish unsupported script decoding. Repetition or visual context may be permitted by a particular Can-do descriptor: the assessment condition must state this rather than equate all assistance with failure. Support revealed earlier in the same attempt remains part of that attempt's evidence, even if hidden before submission.

## 6. Confidence

Each derived state includes confidence based on amount, diversity, recency, and reliability of valid evidence. A technical speech failure, quality-gate rejection, missing provider/model, scorer abstention, skipped task, or deferred modality creates no positive or negative linguistic evidence and no failed memory-retrieval rating. Ordinary elapsed-time decay may still apply independently of that event. A confident, valid mismatch can be negative evidence according to the versioned rubric/policy; a heuristic confidence label is not a statistical interval.

## 7. Scheduler layers

### Layer A — memory scheduling

Use a DSR/FSRS-style model for discrete retrievable units where appropriate. Track separate schedules by modality when performance differs materially.

Assessment validity is decided before scheduling. FSRS retrievability/stability estimates must not grant communicative mastery or determine a Can-do band. Only appropriate scored retrieval outcomes map into scheduler ratings; an unscored attempt is not a failed card review.

### Layer B — prerequisite health

If repeated failures imply a prerequisite weakness, surface repair work even when the target itself is "due."

### Layer C — curriculum advancement

Unlock a goal when hard prerequisites and minimum readiness thresholds are met.

Prerequisites must specify target ID, relevant modality/dimension, required state, and hard/helpful relationship in the versioned pack contract. A bare goal ID must not imply that every modality is mastered. The engine must distinguish permission to enter an accessible track/scenario from evidence that a linguistic competency is mastered. Deferring hearing/speaking preserves relevant reading/writing and navigation access without fabricated credit; only tasks whose assessed construct actually requires the deferred modality are postponed. Tests must cover later goal unlocks for no-microphone and hearing-deferred profiles, not just a skippable onboarding screen.

### Layer D — session composition

Respect learner time budget and avoid monotonous activity runs.

### Layer E — scenario continuity

Keep enough narrative/context continuity that learning feels purposeful.

## 8. Session planner objective

Maximize expected learning value subject to:

- available minutes;
- due-memory risk;
- current goals;
- prerequisite needs;
- modality balance;
- novelty budget;
- fatigue/repetition constraints;
- device capabilities (mic/headphones/offline models);
- accessibility preferences.

It is acceptable to explain: "You have five minutes; here's one listening review and a short speaking retry that are worth doing."

## 9. Guessing resistance

To prevent choice-pattern gaming:

- do not overuse 4-choice translation questions;
- randomize distractors carefully;
- include typed/spoken recall;
- require semantic choice in context;
- detect implausibly fast repeated guesses;
- rotate activity form;
- do not award high mastery for low-information evidence.

Speed alone is not evidence of guessing, and slow input is not a linguistic failure. Latency is diagnostic by default; avoid penalties for disability, assistive technology, IME composition, or device delay. If timing is itself a target, its rubric must define the construct and provide an appropriate accommodation or deferral route without awarding unassessed mastery.

## 10. Assessment types

### Diagnostic

Placement or targeted diagnosis; low stakes; can unlock known foundations.

### Formative

Continuous evidence during learning; can use support.

### Checkpoint

Can-do performance with constrained support; multiple modalities.

### Transfer

Novel context/items; strongest evidence of flexible ability.

### Retention

Delayed re-check after time has passed.

## 11. Checkpoint design

A checkpoint should sample the capability rather than every content atom. It should include at least one held-out or generated-but-validated variation so the learner cannot pass only by memorizing the lesson script.

Each scored checkpoint/transfer/retention assessment needs an explicit rubric, valid modality/support conditions, accepted variants, prerequisite scope, evidence grouping, and sufficient coverage for the claim made. Track prompt-family exposure and keep assessment variants separate from practice exposure; a once-held-out prompt is no longer held out after use. One variation is a minimum safeguard, not proof of an entire proficiency band. Generated variations require validation/review appropriate to the scoring risk before they can advance mastery. Repeated coached retries remain formative evidence and cannot substitute for fresh independent/transfer observations.

When a scored item or rubric is later found invalid, issue an exclusion/correction event and recompute affected mastery and scheduler inputs. Preserve the audit trail and explain changed recommendations to the learner. Invalid content must not leave lasting penalties or rewards in learner history.

## 12. Dynamic content constraints

When AI or procedural generation creates an activity, the generation contract specifies:

- allowed vocabulary;
- allowed grammar;
- new-item budget;
- register;
- expected interpretations;
- prohibited ambiguity;
- target proficiency;
- answer validation method.

Generated content that cannot be deterministically or confidently evaluated should be used for exploration/practice, not high-stakes advancement.

## 13. Capability map

The learner sees a human-friendly map of communicative goals. Internal grammar/vocabulary nodes can be visible in detail views but should not dominate the top-level journey.

## 14. Japanese progression bands

Use JF/CEFR Can-do framing to organize broad bands. Do not claim official certification.

- zero/on-ramp: sounds, interaction conventions, first survival expressions, script orientation;
- A1-like: highly familiar, predictable personal/everyday exchanges;
- A2-like: routine daily transactions and descriptions;
- B1-like: independent handling of common situations and connected discourse;
- B2-like: wider interaction, explanation, argument, media/reading demands;
- C1/C2-capable architecture: nuanced, specialized, idiomatic and high-density input/output.

The actual pack must enumerate validated Can-do objectives rather than rely on these labels alone.

## 15. Reading/writing track

Reading/writing advance in parallel with speech/listening. Romanization is temporary scaffolding. The system must permit someone to become conversationally stronger than literate or vice versa while recommending balance.

## 16. Forgetting and regression

A skill can become "needs refresh" without shame. The UI should frame this as normal memory behavior, not loss of a streak or level.

## 17. Learner control

Users may:

- request more/less speaking;
- temporarily defer microphone tasks;
- focus on travel/reading/etc. while retaining core prerequisites;
- mark content as already known;
- challenge/report incorrect content;
- request an explanation;
- choose shorter sessions.

The engine should adapt without allowing preferences to silently fabricate mastery.
