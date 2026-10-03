# 01 — Product and UX Specification

## Experience principle

The learner should feel that they are **doing things in another language**, not completing a checklist about another language.

## Home screen

The home screen should answer three questions:

1. What can I do now?
2. What is worth practicing next?
3. What new capability am I working toward?

Do not show a threatening missed-day state. Do not make a calendar streak the dominant visual.

Suggested cards:

- `Continue adventure` — resumes the current scenario chain.
- `5-minute useful practice` — high-value review selected by the scheduler.
- `Practice speaking` — current speech weaknesses/targets.
- `Read for a few minutes` — graded content near the learner level.
- `Explore` — revisit unlocked environments without penalty.
- `Progress` — capability map and evidence, not a raw XP ladder.

## Time-aware session planning

Offer learner-selected time budgets such as 5, 10, 20, 30+ minutes. The planner fills the budget with meaningful work and may stop early at a coherent boundary.

A 5-minute session must not be a fake lesson. It can include a small number of due retrievals, one pronunciation contrast, one micro-dialogue, or a short comprehension scenario.

## Game/world model

Use a lightweight world/scenario framework rather than committing to a massive RPG before learning efficacy is proven.

World objects can expose language affordances:

- characters to talk with;
- signs/menus/messages to read;
- objects to identify/use;
- destinations to navigate to;
- tasks that require requesting information;
- choices that depend on comprehension.

The same scenario can scale in difficulty by changing support, speed, vocabulary variation, distractors, and spontaneity.

### Example progression: convenience store

- Level 0: identify a requested object from audio + strong visual cues.
- Level 1: understand a fixed greeting and simple item names.
- Level 2: ask where an item is with a guided phrase.
- Level 3: understand price/quantity questions.
- Level 4: respond by voice without visible answer choices.
- Level 5: handle alternative phrasing and a different speaker.
- Level 6: complete the interaction with optional hints only.
- Transfer: similar interaction in a café/pharmacy without identical script.

## Scaffolding

Support is progressive and reversible. The learner may request help without being punished.

Possible support layers:

- environmental/visual cue;
- replay;
- slowed audio that preserves pitch reasonably;
- target-language text;
- furigana/readings;
- partial meaning hint;
- full translation;
- grammar note;
- pronunciation demonstration.

Track support use as evidence. A correct answer after a full translation is not equal to independent comprehension.

Use the support-level defaults and explicit support-action records in `docs/03_CURRICULUM_AND_MASTERY.md`; a number alone does not prove the assessed modality is valid. Showing a transcript changes a pure listening task into text-supported comprehension, and romaji/furigana changes unsupported script-reading evidence. The UI must identify the resulting evidence honestly and let the learner choose support without penalty.

## Translation policy

English is a scaffold, not the permanent interface to Japanese meaning. Prefer direct concept/context association when practical. Reduce automatic translations as competence rises, while keeping user-requested help available.

Do not hide critical instructions behind target-language text before the learner can understand them.

## Feedback

Feedback should be:

- immediate when helpful;
- specific;
- limited to high-value corrections;
- non-punitive;
- clear about uncertainty;
- actionable.

Avoid "72% pronunciation" without explanation. Prefer "I understood the phrase; the long vowel was shortened. Listen and try that part again."

## Error handling as learning

A wrong response is an evidence event, not a life/heart loss. The system should diagnose likely causes and choose remediation:

- vocabulary unknown;
- grammar misunderstood;
- listening failed;
- reading failed;
- speech not recognized;
- pronunciation distinction weak;
- user guessed;
- prompt ambiguous;
- technical audio problem.

## Motivation without streaks

Allowed motivational mechanics:

- environments unlocked by capability;
- characters/quests unlocked by communication skills;
- collections earned through meaningful tasks;
- visible skill map;
- narrative progression;
- learner-created goals;
- personal bests in comprehension/pronunciation that do not punish absence;
- optional achievements for accomplishments, not daily attendance.

Avoid variable-reward dark patterns, loss aversion around daily check-ins, and energy systems designed to sell refills.

## Failure-safe onboarding

First run:

1. choose interface language;
2. choose target language;
3. declare prior experience or choose "start from zero";
4. privacy/local-processing explanation and optional modality/accessibility preferences;
5. microphone/headphone check (skippable, permission requested only when selected);
6. short interactive introduction that demonstrates listening, speaking, reading support, and the help system;
7. optional placement check for non-beginners.

No account required.

When a learner skips speaking, declines microphone permission, or defers listening, onboarding continues with suitable other activities. Later track/scenario access must follow the modality-aware unlock policy, rather than eventually blocking all progress on an unassessed speaking/listening prerequisite. Show those modalities as `not assessed`; do not fill them in from text answers. Missing devices/models, technical capture failures, and scorer abstention are recoverable unscored outcomes.

## Placement

Placement must sample multiple modalities and should be optional. It may rapidly unlock known material but must preserve a way to revisit foundations. Avoid claiming precise proficiency from a five-minute quiz.

## Progress UI

Show:

- Can-do capabilities;
- current support level;
- modality split;
- retained vs recently learned skills;
- current goals;
- areas recommended for practice.

Example:

`Order a simple meal`
- understand common questions: strong
- read a basic menu: strong
- speak the order: developing
- handle an unexpected follow-up: new

## Difficulty and frustration management

Detect repeated failure loops. After repeated errors, vary the explanation/activity rather than present the identical question indefinitely. Allow "I don't understand" and "this feedback seems wrong" actions.

Response time is diagnostic by default. Slow input, IME composition, assistive technology, or a disability must not cause a mastery penalty. Fast response alone does not prove guessing. A timed language objective needs a declared timing rubric and a way to defer that assessment or take an appropriate accommodated route.

## Accessibility UX

- keyboard navigable;
- screen-reader semantics;
- caption/transcript controls;
- scalable text;
- reduced-motion option;
- never encode correctness solely by color;
- visual alternatives for audio controls;
- microphone activities can be postponed/skipped without trapping overall navigation;
- UI localization supports RTL and complex scripts.
