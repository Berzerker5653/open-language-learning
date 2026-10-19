// R11 UI contract: the app shows the journey the pack authored — encounter
// first, drill second, and the explanation reachable again from the drill.
// Presentation only; what is allowed next stays the engine's decision.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LessonEncounter,
  drillStageId,
  stagePositionLabel,
  type LessonPlan,
  type LessonStage,
} from "./lesson";

const lesson: LessonPlan = {
  unit_id: "ja.unit.demo.greetings",
  goal_id: "ja.goal.demo.greet",
  title: "Greetings",
  summary: "Meet someone for the first time.",
  stages: [
    {
      activity_id: "ja.activity.demo.encounter-greet",
      activity_type: "encounter-read",
      stage_kind: "encounter",
      runner: "encounter",
      modality: "comprehension-reading",
      support_level: 3,
      content: [
        {
          content_id: "ja.lex.demo.konnichiwa",
          kind: "lexicon",
          display: "こんにちは",
          reading: "konnichiwa",
          gloss: "hello",
        },
      ],
    },
    {
      activity_id: "ja.activity.demo.grammar-greet",
      activity_type: "grammar-study",
      stage_kind: "encounter",
      modality: "comprehension-reading",
      support_level: 3,
      content: [
        {
          content_id: "ja.grammar.demo.wa-topic",
          kind: "grammar",
          display: "は",
          explanation: "は marks the topic of the sentence.",
        },
      ],
    },
    {
      activity_id: "ja.activity.demo.recall-greet",
      activity_type: "recall",
      stage_kind: "independent",
      runner: "recall-meaning",
      modality: "comprehension-reading",
      support_level: 0,
      content: [
        {
          content_id: "ja.lex.demo.konnichiwa",
          kind: "lexicon",
          display: "こんにちは",
          gloss: "hello",
        },
      ],
    },
    {
      activity_id: "ja.activity.demo.cloze-greet",
      activity_type: "cloze",
      stage_kind: "scaffolded",
      runner: "cloze",
      modality: "production-writing",
      support_level: 2,
      content: [],
    },
    {
      activity_id: "ja.activity.demo.scenario-greet",
      activity_type: "scenario",
      stage_kind: "interaction",
      modality: "interaction-oral",
      support_level: 1,
      scenario_id: "ja.scenario.demo.first-meeting",
      content: [],
    },
  ],
};

// U06: the practice runner answers the stage the engine's cursor names.
// The fixture mirrors unit 818 of the shipped RU pack —
// `ru.unit.b2.jstyle-03` — every stage id, type, kind, runner key,
// modality and support level verbatim from the pack YAML (the same
// mirror `journeys/harness.tsx` keeps), with the cursor fields
// `lesson_plan_at` in lib.rs computes over them.
const u818Stages: LessonStage[] = [
  {
    activity_id: "ru.activity.b2.u818-grammar",
    activity_type: "encounter-read",
    stage_kind: "encounter",
    runner: "encounter",
    modality: "reading",
    support_level: 1,
    content: [],
  },
  {
    activity_id: "ru.activity.b2.u818-cloze",
    activity_type: "cloze",
    stage_kind: "scaffolded",
    runner: "cloze",
    modality: "writing",
    support_level: 1,
    content: [],
  },
  {
    activity_id: "ru.activity.b2.u818-write",
    activity_type: "recall",
    stage_kind: "independent",
    runner: "typed",
    modality: "writing",
    support_level: 0,
    content: [],
  },
  {
    activity_id: "ru.activity.b2.u818-listen",
    activity_type: "listen-and-choose",
    stage_kind: "scaffolded",
    runner: "comprehension-listening",
    modality: "listening",
    support_level: 1,
    content: [],
  },
  {
    activity_id: "ru.activity.b2.u818-speak",
    activity_type: "retrieval",
    stage_kind: "independent",
    runner: "guided-speaking",
    modality: "speaking",
    support_level: 0,
    content: [],
  },
];

const freshU818: LessonPlan = {
  unit_id: "ru.unit.b2.jstyle-03",
  goal_id: "ru.goal.b2.style-register",
  title: "Повтор: правка и отправка",
  summary:
    "посмотрите, сверьте, уточните — отсроченное повторное использование регистровой правки.",
  stages: u818Stages.map((s) => ({ ...s, done: false })),
  next_stage_id: "ru.activity.b2.u818-cloze",
  stage_position: 2,
  stage_total: 5,
};

// The same unit after the encounter was passed and the supported cloze
// answered: exactly one stage further in declared order, with the real
// counts moved.
const clozeMetU818: LessonPlan = {
  ...freshU818,
  stages: freshU818.stages.map((s) =>
    s.activity_id === "ru.activity.b2.u818-grammar" || s.activity_id === "ru.activity.b2.u818-cloze"
      ? { ...s, done: true }
      : s,
  ),
  next_stage_id: "ru.activity.b2.u818-write",
  stage_position: 3,
};

describe("drillStageId", () => {
  it("answers for the engine's next authored stage, not a modality guess", () => {
    // The unit authors two writing stages — the scaffolded cloze first,
    // the independent recall second. A first-match loop over modalities
    // cannot tell which prompt the learner is on; the cursor can.
    expect(drillStageId(freshU818)).toBe("ru.activity.b2.u818-cloze");
    expect(drillStageId(clozeMetU818)).toBe("ru.activity.b2.u818-write");
  });

  it("never answers an encounter or conversation stage", () => {
    const cursorOnJa: LessonPlan = {
      ...lesson,
      next_stage_id: "ja.activity.demo.recall-greet",
      stage_position: 2,
      stage_total: 3,
    };
    expect(drillStageId(cursorOnJa)).toBe("ja.activity.demo.recall-greet");
  });

  it("says there is no stage rather than inventing one", () => {
    const exhausted: LessonPlan = {
      ...freshU818,
      next_stage_id: undefined,
      stage_position: undefined,
    };
    expect(drillStageId(exhausted)).toBeNull();
    expect(drillStageId(lesson)).toBeNull();
    expect(drillStageId(null)).toBeNull();
  });
});

describe("stagePositionLabel", () => {
  it("uses the unit's real counts, and says plainly when the journey ends", () => {
    expect(stagePositionLabel(freshU818)).toBe("Stage 2 of 5");
    expect(stagePositionLabel(clozeMetU818)).toBe("Stage 3 of 5");
    expect(
      stagePositionLabel({ ...freshU818, next_stage_id: undefined, stage_position: undefined }),
    ).toBe("All authored stages complete.");
    expect(stagePositionLabel(lesson)).toBeNull();
  });
});

describe("LessonEncounter", () => {
  const html = renderToStaticMarkup(
    <LessonEncounter lesson={lesson} onStart={() => undefined} onScenario={() => undefined} />,
  );

  it("presents the unit and its encounter content before any drill", () => {
    expect(html).toContain("Greetings");
    expect(html).toContain("Meet someone for the first time.");
    expect(html).toContain("こんにちは");
    expect(html).toContain("konnichiwa");
    expect(html).toContain("hello");
    expect(html).toContain("First look");
  });

  it("shows the pack's grammar explanation instead of the app inventing one", () => {
    expect(html).toContain("は marks the topic of the sentence.");
  });

  it("names the runner that serves each stage and says plainly when none does", () => {
    expect(html).toContain("Served by the encounter runner.");
    expect(html).toContain("Served by the recall-meaning runner.");
    expect(html).toContain("Served by the cloze runner.");
    // `grammar-study` is a pair the pack declares that nothing executes —
    // lib.rs `activity_runner` answers it `None` — and the screen says so
    // rather than presenting it as practice. (`encounter-read` is NOT such
    // a stage: the engine names the encounter runner for it, and the
    // fixture above carries that runner.)
    expect(html).toContain("Declared, but not runnable: no runner serves this stage yet.");
  });

  it("offers the conversation stage only when the pack declares one", () => {
    expect(html).toContain("Use it in conversation");
    const noScenario = renderToStaticMarkup(
      <LessonEncounter
        lesson={{ ...lesson, stages: lesson.stages.filter((s) => !s.scenario_id) }}
        onStart={() => undefined}
        onScenario={() => undefined}
      />,
    );
    expect(noScenario).not.toContain("Use it in conversation");
  });

  it("gives the learner a way into the drill without hiding it", () => {
    expect(html).toContain("lesson-start");
    expect(html).toContain("Start practising");
  });
});

describe("LessonEncounter with the engine's cursor", () => {
  it("shows the learner their position on the authored journey", () => {
    const html = renderToStaticMarkup(
      <LessonEncounter lesson={freshU818} onStart={() => undefined} onScenario={() => undefined} />,
    );
    expect(html).toContain("Stage 2 of 5");
  });

  it("does not replay stages the learner state already accounts for", () => {
    const html = renderToStaticMarkup(
      <LessonEncounter
        lesson={clozeMetU818}
        onStart={() => undefined}
        onScenario={() => undefined}
      />,
    );
    // Returning to review this word must not replay the unit's encounter
    // list: the passed presentation and the answered cloze are gone.
    expect(html).not.toContain('data-stage="ru.activity.b2.u818-grammar"');
    expect(html).not.toContain('data-stage="ru.activity.b2.u818-cloze"');
    expect(html).toContain('data-stage="ru.activity.b2.u818-write"');
    expect(html).toContain("Stage 3 of 5");
  });

  it("shows every stage when the view carries no cursor at all", () => {
    const html = renderToStaticMarkup(
      <LessonEncounter lesson={lesson} onStart={() => undefined} onScenario={() => undefined} />,
    );
    expect(html).toContain('data-stage="ja.activity.demo.encounter-greet"');
    expect(html).not.toContain("lesson-position");
  });
});
