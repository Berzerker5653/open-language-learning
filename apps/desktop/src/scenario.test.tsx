import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ScenarioPanel,
  type ScenarioPanelProps,
  type ScenarioSummaryView,
  type ScenarioView,
} from "./scenario";

const active: ScenarioView = {
  scenario_id: "ja.scenario.demo.first-meeting",
  title: "First meeting",
  situation: "Meeting someone for the first time",
  node: {
    id: "ja.activity.demo.sc.open",
    prompt: "Someone bows and greets you: こんにちは。Respond with a greeting.",
    actions: ["greeting"],
    recovery: [
      {
        id: "ja.activity.demo.sc.repair-repeat",
        prompt: "You were not understood. Ask them to repeat.",
      },
    ],
  },
  ladder: [
    { support_level: 0, description: "No supports" },
    { support_level: 3, description: "Word bank with hiragana and romaji" },
  ],
  transfers: [
    {
      id: "ja.scenario.demo.first-meeting.formal",
      description: "Greet a senior colleague",
      done: false,
    },
  ],
  transfers_required: 1,
  support_used: [],
};

const openScenario: ScenarioSummaryView = {
  scenario_id: "ja.scenario.demo.first-meeting",
  title: "First meeting",
  situation: "Meeting someone for the first time",
  goal_id: "ja.goal.demo.greet",
  goal_band: "on-ramp",
  readiness: "playable",
  unlocked: true,
  recommended: true,
};

// A later-stage scenario behind an unmet hard prerequisite: the native side
// names the gate kind, the reason, and what unlocks it (K-75).
const lockedScenario: ScenarioSummaryView = {
  scenario_id: "ja.scenario.demo.station",
  title: "Finding the station",
  goal_id: "ja.goal.demo.ask-location",
  goal_band: "A1",
  readiness: "later",
  unlocked: false,
  locked_reason:
    "not open yet — practice first: ja.lex.demo.konnichiwa (recall-meaning → supported)",
  lock_kind: "capability",
  unlocks: ["practice ja.lex.demo.konnichiwa to supported (recall-meaning)"],
};

const base: ScenarioPanelProps = {
  // The order the native side sends: playable, then near, then later.
  scenarios: [openScenario, lockedScenario],
  active: null,
  lastStep: null,
  outcome: null,
  error: null,
  onStart: () => {},
  onAttempt: () => {},
  onSupport: () => {},
  onRecovery: () => {},
  onTransfer: () => {},
  onFinish: () => {},
  onBack: () => {},
};

function render(overrides: Partial<ScenarioPanelProps>) {
  return renderToStaticMarkup(<ScenarioPanel {...base} {...overrides} />);
}

describe("scenario panel", () => {
  it("lists scenarios with honest lock reasons", () => {
    const html = render({});
    expect(html).toContain("First meeting");
    expect(html).toContain("Start");
    expect(html).toContain("not open yet — practice first");
    expect(html).not.toContain("Someone bows");
  });

  // K-75: the native side orders the list by readiness and marks the single
  // recommendation; the panel surfaces the pointer and labels the gate.
  it("points at one recommended scenario, and it is the open one", () => {
    const html = render({});
    expect(html).toContain("Recommended next: First meeting");
    expect(html.match(/data-recommended-pointer="true"/g)).toHaveLength(1);
    expect(html.match(/badge badge--active/g)).toHaveLength(1);
    expect(html.match(/>Start</g)).toHaveLength(1);
  });

  it("offers no pointer and no Start while every scenario is locked", () => {
    const html = render({ scenarios: [lockedScenario] });
    expect(html).not.toContain("data-recommended-pointer");
    expect(html).not.toContain(">Start<");
  });

  it("says what unlocks a capability gate", () => {
    const html = render({ scenarios: [lockedScenario] });
    expect(html).toContain("practice first");
    expect(html).toContain("stage A1");
    expect(html).toContain(
      "Unlocks when: practice ja.lex.demo.konnichiwa to supported (recall-meaning)",
    );
  });

  it("labels a curriculum-stage gate as a stage, not as practice", () => {
    const html = render({
      scenarios: [
        {
          ...lockedScenario,
          lock_kind: "stage",
          locked_reason:
            "not open yet — a later stage of the curriculum: goal ja.goal.demo.ask-location",
          unlocks: ["reach goal ja.goal.demo.ask-location first"],
        },
      ],
    });
    expect(html).toContain("later curriculum stage");
    expect(html).toContain("reach goal ja.goal.demo.ask-location first");
    expect(html).not.toContain("practice first");
  });

  it("renders the pack prompt, intents, ladder, and transfers in a session", () => {
    const html = render({ active });
    expect(html).toContain("Someone bows and greets you");
    expect(html).toContain('aria-label="Ways to respond"');
    expect(html).toContain(">greeting<");
    expect(html).toContain("Word bank with hiragana and romaji");
    expect(html).toContain("Greet a senior colleague");
    // Recovery moves only appear after a miss.
    expect(html).not.toContain("Ask them to repeat");
  });

  it("offers pack-declared recovery moves after a failed intent", () => {
    const html = render({
      active,
      lastStep: {
        result: "not-satisfied",
        recovery: ["ja.activity.demo.sc.repair-repeat"],
        completed: false,
      },
    });
    expect(html).toContain('aria-label="Recovery moves"');
    expect(html).toContain("Ask them to repeat");
  });

  it("summarizes the finished session honestly", () => {
    const html = render({
      active: null,
      outcome: { nodes_completed: 2, transfers_completed: 0, transfer_requirement_met: false },
    });
    expect(html).toContain("2 exchanges completed");
    expect(html).toContain("Transfer variants show you can flex");
  });
});
