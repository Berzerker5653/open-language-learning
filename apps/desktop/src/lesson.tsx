import { PackText } from "@openlang/ui";

/**
 * R11: the pack authors the journey, the app follows it.
 *
 * `lesson_plan` returns the unit's declared activities in declared order,
 * each labelled by the engine's stage kind, with the content the stage
 * teaches resolved from the pack. Nothing here re-ranks or re-labels the
 * journey, and nothing here decides what the learner is allowed to do
 * next — that is the progression engine's job (ADR-0022).
 *
 * RU-MODALITY-PRACTICE-001: each stage also names the runner the engine
 * actually has for it (`runner`), and the encounter surfaces that name —
 * a stage with no runner key is one the pack declared but nothing
 * executes, and it must read exactly that way, never as practice.
 *
 * U06: the engine also places the practice cursor on that journey. Each
 * stage carries `done` (the learner state already accounts for it —
 * evidence for a scored stage, a passed position for a presentation),
 * and the plan carries `next_stage_id` plus the real position/total so
 * the runner attributes attempts to the authored stage the engine
 * picked, never to a modality guess.
 */

export interface LessonContent {
  content_id: string;
  kind: string;
  display: string;
  reading?: string | null;
  gloss?: string | null;
  explanation?: string | null;
}

export interface LessonStage {
  activity_id: string;
  activity_type: string;
  stage_kind: string;
  /// RU-MODALITY-PRACTICE-001: the runner that serves this declared
  /// (type, modality) pair. The key is absent — not null — when the pack
  /// declared the stage but no runner can serve it: declared, not
  /// practice. Mirrors `activity_runner` in lib.rs.
  runner?: string;
  modality: string;
  support_level: number;
  scenario_id?: string | null;
  /// U06: whether the learner state already accounts for this stage —
  /// the engine's `done` in lib.rs. Absent means the view carries no
  /// cursor at all, and every stage reads as unmet.
  done?: boolean;
  content: LessonContent[];
}

export interface LessonPlan {
  unit_id: string;
  goal_id: string;
  title: string;
  summary: string;
  stages: LessonStage[];
  /// U06: the authored stage the practice runner should answer next:
  /// the first stage in the unit's declared order that a scored runner
  /// serves and the learner has not met. Absent when the authored
  /// journey is exhausted (or the view carries no cursor).
  next_stage_id?: string;
  /// 1-based position of `next_stage_id` among the runnable stages.
  stage_position?: number;
  /// The unit's runnable-stage count — the real total for
  /// "stage 2 of 5", never an invented one.
  stage_total?: number;
}

export const STAGE_LABEL: Record<string, string> = {
  encounter: "First look",
  interaction: "Use it in conversation",
  scaffolded: "With support",
  independent: "On your own",
  practice: "Practice",
};

/**
 * Which authored stage the drill on screen is actually answering (U06).
 *
 * The engine's cursor decides it: `lesson_plan` names the next stage in
 * the unit's declared order that a scored runner serves and the learner
 * has not met. Evidence attributes the attempt to this id (R04/R11), so
 * it is never an encounter stage, never a first-match guess over
 * modalities, and never made up: no cursor means no attribution, not a
 * guess — the engine then falls back to the item's own identity.
 */
export function drillStageId(lesson: LessonPlan | null): string | null {
  return lesson?.next_stage_id ?? null;
}

/** The learner's position on the authored journey, "stage 2 of 5"
 * style, from the engine's real counts. `null` when the view carries no
 * cursor at all; the exhausted reading says so plainly. */
export function stagePositionLabel(lesson: LessonPlan): string | null {
  if (lesson.stage_total === undefined) return null;
  if (lesson.stage_total === 0) return "Nothing in this unit is runnable yet.";
  if (lesson.stage_position === undefined) return "All authored stages complete.";
  return `Stage ${lesson.stage_position} of ${lesson.stage_total}`;
}

function LessonContentItem({ item }: { item: LessonContent }) {
  return (
    <li className="lesson__item" data-content={item.content_id} data-kind={item.kind}>
      <PackText tag="span" className="lesson__surface">
        {item.display}
      </PackText>
      {item.reading ? (
        <span className="lesson__reading" dir="ltr">
          {item.reading}
        </span>
      ) : null}
      {item.gloss ? <span className="lesson__gloss">{item.gloss}</span> : null}
      {item.explanation ? <p className="lesson__explanation">{item.explanation}</p> : null}
    </li>
  );
}

export function LessonEncounter({
  lesson,
  onStart,
  onScenario,
}: {
  lesson: LessonPlan;
  onStart: () => void;
  onScenario: (scenarioId: string) => void;
}) {
  const conversation = lesson.stages.find((stage) => stage.scenario_id);
  // U06: the panel shows the stages the learner has not met. The engine's
  // `done` marks the ones the learner state already accounts for, so
  // returning to review a word never replays the unit's encounter list.
  const declared = lesson.stages.filter((stage) => stage !== conversation && !stage.done);
  const position = stagePositionLabel(lesson);
  return (
    <section aria-label="Lesson" className="lesson" data-testid="lesson-encounter">
      <h1>{lesson.title || "Lesson"}</h1>
      {lesson.summary ? <p className="lesson__summary">{lesson.summary}</p> : null}
      {position ? (
        <p className="meta lesson__position" data-testid="lesson-position">
          {position}
        </p>
      ) : null}
      {declared.map((stage) => (
        <section
          className="lesson__stage"
          data-stage={stage.activity_id}
          data-runner={stage.runner ?? "none"}
          key={stage.activity_id}
        >
          <h2>{STAGE_LABEL[stage.stage_kind] ?? "First look"}</h2>
          <p className="meta lesson__runner">
            {stage.runner
              ? `Served by the ${stage.runner} runner.`
              : "Declared, but not runnable: no runner serves this stage yet."}
          </p>
          <ul className="lesson__items">
            {stage.content.map((item) => (
              <LessonContentItem item={item} key={item.content_id} />
            ))}
          </ul>
        </section>
      ))}
      {conversation?.scenario_id ? (
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            data-testid="lesson-scenario"
            onClick={() => onScenario(conversation.scenario_id as string)}
          >
            Use it in conversation
          </button>
        </div>
      ) : null}
      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary"
          data-testid="lesson-start"
          onClick={onStart}
        >
          Start practising
        </button>
      </div>
    </section>
  );
}
