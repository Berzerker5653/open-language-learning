// R11 UI contract: the app shows the journey the pack authored — encounter
// first, drill second, and the explanation reachable again from the drill.
// Presentation only; what is allowed next stays the engine's decision.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LessonEncounter, stageForDrill, type LessonPlan } from "./lesson";

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

describe("stageForDrill", () => {
  it("attributes the drill to the authored production stage for its modality", () => {
    expect(stageForDrill(lesson, "comprehension-reading")).toBe("ja.activity.demo.recall-greet");
    expect(stageForDrill(lesson, "production-writing")).toBe("ja.activity.demo.cloze-greet");
  });

  it("never attributes a drill to an encounter or conversation stage", () => {
    const onlyEncounter: LessonPlan = { ...lesson, stages: lesson.stages.slice(0, 1) };
    expect(stageForDrill(onlyEncounter, "comprehension-reading")).toBeNull();
  });

  it("says there is no stage rather than inventing one", () => {
    expect(stageForDrill(null, "comprehension-reading")).toBeNull();
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
