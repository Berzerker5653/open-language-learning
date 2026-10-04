import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ScenarioPanel, type ScenarioPanelProps, type ScenarioView } from "./scenario";

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

const base: ScenarioPanelProps = {
  scenarios: [
    {
      scenario_id: "ja.scenario.demo.first-meeting",
      title: "First meeting",
      situation: "Meeting someone for the first time",
      goal_id: "ja.goal.demo.greet",
      unlocked: true,
    },
    {
      scenario_id: "ja.scenario.demo.other",
      title: "Locked scene",
      goal_id: "ja.goal.demo.other",
      unlocked: false,
      locked_reason: "not yet ready — practice first: ja.lex.demo.konnichiwa",
    },
  ],
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
    expect(html).toContain("not yet ready — practice first");
    expect(html).not.toContain("Someone bows");
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
