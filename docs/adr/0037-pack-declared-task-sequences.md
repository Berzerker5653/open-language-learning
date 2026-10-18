# ADR 0037: A task sequence is pack-declared data, and the content audit checks it

Status: Accepted
Date: 2026-10-18

## Context

`UPPERBAND-TASK-JOURNEYS-001` requires that, for one named representative goal per
upper band (A2, B1, B2) in each shipped pack, the pack declares a sequence that
exercises that goal: meaningful input, a scaffolded response, an independent
response, the same language in a changed context, and delayed reuse. Both packs
already contained families with that shape — `ru.unit.a2.jpast-01/-02/-03`
(units 810/811/812), `jprob-01/-02/-03` (813/814/815), `jstyle-01/-02/-03`
(816/817/818), and the ja `work-notice` / `film` / `admin-bill-payment` journeys —
and those families are split across units on purpose: the changed context is a
second unit, and the delayed reuse is a third unit phase-gated with
`requires_unit` (ADR-0022). Nothing in the tree could say so.

The audit's existing progression check (`no-stage-progression`, ADR-0025) looks at
one unit at a time and only counts distinct stage kinds. Measured at this
snapshot it fires once across both packs (`ja.unit.sound-contrasts`, band a1), so
it says nothing about these families in either direction — a three-unit journey
and a single unit with two activity types are equally invisible to it. And it
cannot answer the question the card asks: which activity is the independent
response, and which of the pack's 818 Russian units is the reuse stage for which
introducing unit, is a claim about the lesson, not a property derivable from a
`type` string. The same `recall`/`writing` pair appears as an independent stage
in one unit and as a mid-lesson stage in another. Guessing it would have made the
report a fiction.

A second measured obstacle: several journey activities declared pairs the engine
has no runner for — `scenario`/`interaction`, `match`/`reading`,
`recall-choice`/*, `retrieval`/`reading`. A sequence whose transfer stage is one
of those is not runnable by definition, so a check that only looks at ids would
certify a sequence that stops halfway.

## Decision

1. **A unit may declare `task_sequence`** (v0.2 unit schema): five required keys —
   `input`, `scaffolded`, `independent`, `transfer`, `reuse` — each naming one
   activity id in the same pack. The first three must be activities of the
   declaring unit; `transfer` and `reuse` may name activities of a later unit in
   the same goal, which is how a family split across three units declares one
   sequence. v0.1 stays frozen: a v0.1 pack cannot make this claim.
2. **The engine does not read it.** No field was added to `PackUnit`,
   `PackUnitActivity` or the planner; nothing about execution changes. The claim
   is consumed by tooling and by humans, exactly as `capabilities` (ADR-0021) and
   `requires_unit` (ADR-0022) are consumed — those taught the engine *selection
   order*, this one teaches nothing but is checkable in the same way.
3. **`tools/audit_content_templates.py` checks the claim**, importing the engine's
   runner table rather than restating it (ADR-0036): every named activity must
   have a runner (`task-sequence-unrunnable`), the first three roles must belong
   to the declaring unit and `input` must be an encounter stage
   (`task-sequence-incomplete`), `scaffolded` must carry support while
   `independent` carries none (`task-sequence-no-scaffold`), `transfer` must show
   a real context change — a `scenario_id`, or a different unit of the same goal
   that reuses this unit's content (`task-sequence-no-context-change`), and
   `reuse` must live in a unit that `requires_unit`-gates on the declaring unit
   and reuses its refs (`task-sequence-no-reuse`). Absence is reported once per
   band (`task-sequence-missing-band`, `--require-band`, default a2/b1/b2), never
   once per unit, so the report stays readable.
4. **The finding stays advisory.** These findings join `finding_count` and the
   review worklist, and CI still exits 0 with findings present: the same posture
   ADR-0025 fixed when it refused to let a coverage denominator fail a build. If
   the runner table cannot be parsed the rule degrades to
   `task-sequence-unverifiable` instead of turning a tooling problem into a red
   build.
5. **A speaking stage stays guided.** A `transfer` or `independent` speaking
   stage is required only to have the engine's `guided-speaking` runner — no
   verdict, no score, no mastery write (ADR-0017). Making a changed-context
   stage runnable meant retargeting `scenario`/`interaction` activities to
   `retrieval`/`speaking`; it did not mean grading anyone's pronunciation.
6. **Delayed reuse is the ADR-0022 gate, not an invented interval.** No
   `after_days`-style field exists or was added: nothing in the scheduler honours
   a day count authored in a unit file, so such a field would be a promise the
   engine cannot keep. The reuse unit is a later unit that reuses the
   introducing unit's content refs and cannot be selected as new material until
   that unit's items reach `supported`.

## Consequences

- The claim is now machine-checkable and per-band absence is visible: the audit
  reports `declared 3, complete 3` per shipped pack, one representative per upper
  band — `ru.goal.a2.past-events` / `ru.goal.b1.practical-problems` /
  `ru.goal.b2.style-register` and `ja.goal.a2.daily-admin` /
  `ja.goal.b1.work-professional` / `ja.goal.b2.film-analysis`.
- Measured, same tool, `--require-band a2 --require-band b1 --require-band b2`:
  against the packs as they stood at `f4b9336` the rule adds exactly three
  findings per pack (`task-sequence-missing-band`, one per upper band) — ru-RU
  38, ja-JP 95. With the declarations above those six rows close and every
  other finding is unchanged: ru-RU 35 (3 leading-token, 23 skeleton,
  9 identical-grammar-sets), ja-JP 92 (1 leading-token, 58 skeleton,
  32 identical-grammar-sets, 1 `no-stage-progression`).
- Three existing journey activities had to change to make the claim true rather
  than decorative: `ja.activity.b1-work-notice-call-scenario`,
  `ja.activity.b2-film-friends-scenario` and
  `ja.activity.admin-bill-payment-scenario` moved from `scenario`/`interaction`
  to `retrieval`/`speaking`, and `ja.unit.admin-bill-payment` gained an
  independent `recall`/`writing` stage it never had. Those are the only pack
  semantics this ADR forces; the RU families needed no change, which is the
  evidence that the shape was already there and only the declaration was missing.
- `ja.unit.admin-bill-payment-revision` is new pack content (unit 826) with the
  pack's honest `ai-assisted draft … qualified review pending` provenance, and
  the three retargeted activities are still review-pending content: this card
  makes sequences checkable, it does not certify any of the wording, and no
  claim of a graded speaking stage exists anywhere in the result.
- The five counts stay separate (ADR-0036): declared activities, runnable
  practice, servable practice, valid evidence and review posture. A complete
  sequence is a different kind of statement again — a coverage claim about a
  *goal* — and it is reported next to them, never merged into them.

## Alternatives considered

- **Infer the sequence from activity types and support levels.** Rejected: it
  invents the very mapping the card asks a human to make. The audit's per-unit
  stage-kind count already does something adjacent: measured today it fires once
  across the two packs (`ja.unit.sound-contrasts`), and it is silent about a
  family whose five stages live in three different unit files.
- **Require every activity in the declaring unit to be part of the sequence.**
  Rejected: packs legitimately carry extra practice (the RU journey units declare
  a `listen-and-choose` stage that is not one of the five roles), and forcing the
  sets equal would have meant deleting content to satisfy a checker.
- **Put the sequence in the goal file.** Rejected: activities belong to units, and
  the reuse edge is a unit-level phase gate; a goal-level list would have created
  a second place where the same activity id is named, which is how drift starts.
- **Gate CI on the new findings.** Rejected per ADR-0025: the denominator is a
  measurement, and the upper bands of both packs contain hundreds of units that
  legitimately declare no sequence.
- **Reuse the scenario system as the sequence mechanism.** Rejected: scenarios
  model one situation with nodes and a support ladder (ADR-0030), while a task
  sequence spans units and time. The scenario is the *evidence* for the
  `transfer` stage, not the container for the sequence.
