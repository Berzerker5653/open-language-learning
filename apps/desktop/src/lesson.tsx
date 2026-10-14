import { PackText } from "@openlang/ui";

/**
 * R11: the pack authors the journey, the app follows it.
 *
 * `lesson_plan` returns the unit's declared activities in declared order,
 * each labelled by the engine's stage kind, with the content the stage
 * teaches resolved from the pack. Nothing here re-ranks or re-labels the
 * journey, and nothing here decides what the learner is allowed to do
 * next — that is the progression engine's job (ADR-0022).
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
  modality: string;
  support_level: number;
  scenario_id?: string | null;
  content: LessonContent[];
}

export interface LessonPlan {
  unit_id: string;
  goal_id: string;
  title: string;
  summary: string;
  stages: LessonStage[];
}

export const STAGE_LABEL: Record<string, string> = {
  encounter: "First look",
  interaction: "Use it in conversation",
  scaffolded: "With support",
  independent: "On your own",
  practice: "Practice",
};

/**
 * Which authored stage the drill on screen is actually running.
 *
 * Evidence attributes the attempt to this id (R04/R11), so it must be a
 * stage that asks the learner to produce something at this modality —
 * never an encounter stage, and never made up: no match means no
 * attribution, not a guess.
 */
export function stageForDrill(lesson: LessonPlan | null, modality: string): string | null {
  if (!lesson) return null;
  for (const stage of lesson.stages) {
    if (!["scaffolded", "independent", "practice"].includes(stage.stage_kind)) continue;
    if (stage.modality !== modality) continue;
    return stage.activity_id;
  }
  return null;
}

/** Stages that teach rather than test: the encounter and any explained item. */
export function teachingStages(lesson: LessonPlan): LessonStage[] {
  return lesson.stages.filter(
    (stage) => stage.stage_kind === "encounter" || stage.content.some((c) => c.explanation),
  );
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
  const teaching = teachingStages(lesson);
  const conversation = lesson.stages.find((stage) => stage.scenario_id);
  return (
    <section aria-label="Lesson" className="lesson" data-testid="lesson-encounter">
      <h1>{lesson.title || "Lesson"}</h1>
      {lesson.summary ? <p className="lesson__summary">{lesson.summary}</p> : null}
      {teaching.map((stage) => (
        <section className="lesson__stage" data-stage={stage.activity_id} key={stage.activity_id}>
          <h2>{STAGE_LABEL[stage.stage_kind] ?? "First look"}</h2>
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
