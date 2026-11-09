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
    actions: [{ intent: "respond-greeting", label: "Greet them back" }],
    recovery: [
      {
        id: "ja.activity.demo.sc.repair-repeat",
        prompt: "You were not understood. Ask them to repeat.",
      },
    ],
  },
  ladder: [
    { support_level: 0, description: "No supports", delivered: false },
    { support_level: 3, description: "Word bank with hiragana and romaji", delivered: true },
  ],
  transfers: [
    {
      id: "ja.scenario.demo.first-meeting.formal",
      description: "Greet a senior colleague",
      done: false,
      has_payload: true,
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
  onTransferAnswer: () => {},
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
    expect(html).toContain(">Greet them back<");
    expect(html).toContain("Word bank with hiragana and romaji");
    expect(html).toContain("Greet a senior colleague");
    // Recovery moves only appear after a miss.
    expect(html).not.toContain("Ask them to repeat");
  });

  // U07: the respond button shows the pack's learner-facing label;
  // the internal intent token exists only for the runtime, never as
  // the wording a learner reads.
  it("labels respond buttons with pack wording, never the intent token", () => {
    const html = render({ active });
    expect(html).toContain(">Greet them back<");
    expect(html).toContain('data-intent="respond-greeting"');
    expect(html).not.toContain(">respond-greeting<");
  });

  // U07: pressing a ladder rung must deliver the pack's help payload,
  // announced by its kind.
  it("delivers the model help card after a support rung is used", () => {
    const html = render({
      active: {
        ...active,
        support_used: [3],
        delivered_help: {
          kind: "model",
          text: "こんにちは。 konnichiwa. — the daytime greeting.",
          options: [],
        },
      },
    });
    expect(html).toContain('data-testid="scenario-help"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Model you can read first");
    expect(html).toContain("こんにちは。 konnichiwa.");
  });

  it("renders choices help as a plain list of possible replies", () => {
    const html = render({
      active: {
        ...active,
        support_used: [5],
        delivered_help: {
          kind: "choices",
          text: "Any of these fits the moment:",
          options: ["こんにちは。", "はじめまして。"],
        },
      },
    });
    expect(html).toContain("Possible replies");
    expect(html).toContain("Any of these fits the moment:");
    expect(html).toContain("<li");
    expect(html).toContain("こんにちは。</li>");
    expect(html).toContain("はじめまして。</li>");
  });

  it("shows no help card until a rung delivers one", () => {
    const html = render({ active });
    expect(html).not.toContain('data-testid="scenario-help"');
  });

  // Runtime honesty: packs published before 2026-10-19 (0.4.0–0.4.2)
  // declare ladder rungs but carry no per-node support payloads. The
  // rung must not offer a button that silently does nothing: it is
  // disabled, the reason is stated in words, and no help card appears.
  it("refuses an undeliverable rung: disabled, annotated, and no help card", () => {
    const html = render({
      active: {
        ...active,
        ladder: [
          {
            support_level: 3,
            description: "Word bank with hiragana and romaji",
            delivered: false,
          },
        ],
      },
    });
    expect(html).toContain('disabled=""');
    expect(html).toContain("no help content at this level in this pack");
    expect(html).not.toContain('data-testid="scenario-help"');
  });

  // SCENARIO-VIEW-CONSISTENCY-001 (finding S-07): level 0 means "answer
  // unaided" — not a request, and no pack can ship a payload for it. It
  // states itself as an info line; the dead disabled button with an
  // apology is gone from every node.
  it("renders the level-0 No supports rung as an info line, never a dead button", () => {
    const html = render({ active });
    const ladder = html.slice(
      html.indexOf('<fieldset class="ladder"'),
      html.indexOf("</fieldset>"),
    );
    expect(ladder).toContain("No supports");
    expect(ladder).toContain("ladder-rung--info");
    expect(ladder).toContain("answer without help — nothing to press here");
    // No button at all for level 0: the only ladder button is the
    // delivered level-3 rung, and it is enabled.
    expect(ladder.match(/<button/g)).toHaveLength(1);
    expect(ladder).toContain(">Word bank with hiragana and romaji<");
    expect(ladder).not.toContain("disabled");
    // And the apology is never shown for level 0.
    expect(html).not.toContain("no help content at this level in this pack");
  });

  // SCENARIO-VIEW-CONSISTENCY-001 (finding S-05): the App replaces the
  // whole active view after every command. These are the exact post-
  // command view shapes for attempt, support, and recovery with an
  // earned transfer: the ✓ and the counter must ride every one of them.
  it("keeps the earned transfer checkmark and counter through attempt, support, and recovery views", () => {
    const earned: ScenarioView = {
      ...active,
      transfers: [
        {
          id: "ja.scenario.demo.first-meeting.formal",
          description: "Greet a senior colleague",
          done: true,
          has_payload: true,
        },
      ],
    };
    // View return after a wrong attempt (not-satisfied + recovery offered).
    const afterAttempt = render({
      active: earned,
      lastStep: {
        result: "not-satisfied",
        recovery: ["ja.activity.demo.sc.repair-repeat"],
        completed: false,
      },
    });
    expect(afterAttempt).toContain("✓ Greet a senior colleague");
    expect(afterAttempt).toContain("Transfer variants (1/1)");
    // View return after a support press (help card open, rung consumed).
    const afterSupport = render({
      active: {
        ...earned,
        support_used: [3],
        delivered_help: { kind: "hint", text: "A wave and a word fit.", options: [] },
      },
    });
    expect(afterSupport).toContain("✓ Greet a senior colleague");
    expect(afterSupport).toContain("Transfer variants (1/1)");
    // View return after taking a recovery branch (prompt swapped, state kept).
    const afterRecovery = render({
      active: {
        ...earned,
        node: {
          ...earned.node,
          prompt: "You were not understood. Ask them to repeat.",
        },
      },
    });
    expect(afterRecovery).toContain("✓ Greet a senior colleague");
    expect(afterRecovery).toContain("Transfer variants (1/1)");
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

  // SCENARIO-TRANSFER-001 (finding S-04): a transfer is practice, never
  // a checkbox completion. The markup contract: only variants with a
  // payload are pressable, an unpressable one says why, the ✓ only ever
  // renders when the engine reports `done`, and the practice card exists
  // only while a payload is being performed.
  it("never renders a pressable checkbox for a payload-less transfer", () => {
    const html = render({
      active: {
        ...active,
        transfers: [
          {
            id: "ja.scenario.demo.first-meeting.formal",
            description: "Greet a senior colleague",
            done: false,
            has_payload: false,
          },
        ],
      },
    });
    expect(html).toContain('disabled=""');
    expect(html).toContain("this pack carries no practice content for that transfer");
    expect(html).not.toContain("✓");
  });

  it("shows a done checkmark only when the engine says the payload was performed", () => {
    // Pressable but not done: no ✓ anywhere — a press only opens the
    // payload; the flag lives in the engine.
    const before = render({ active });
    expect(before).not.toContain("✓");
    expect(before).toContain("Transfer variants (0/1)");
    // Engine-stamped done: the ✓ and the counter follow the flag.
    const after = render({
      active: {
        ...active,
        transfers: [
          {
            id: "ja.scenario.demo.first-meeting.formal",
            description: "Greet a senior colleague",
            done: true,
            has_payload: true,
          },
        ],
      },
    });
    expect(after).toContain("✓ Greet a senior colleague");
    expect(after).toContain("Transfer variants (1/1)");
  });

  it("opens recall practice with a prompt and answer form instead of marking done", () => {
    const html = render({
      active: {
        ...active,
        active_transfer: {
          variant_id: "ja.scenario.demo.first-meeting.formal",
          mode: "recall",
          prompt: "Greet a senior colleague: say hello and ask their name.",
          actions: [],
        },
      },
    });
    expect(html).toContain('data-testid="transfer-practice"');
    expect(html).toContain("Greet a senior colleague: say hello and ask their name.");
    expect(html).toContain('aria-label="Your answer"');
    expect(html).toContain(">Answer<");
    // The open practice card is not a done: no ✓ until the engine says so.
    expect(html).not.toContain("✓");
  });

  it("renders walk practice as labelled respond buttons, never intent tokens", () => {
    const html = render({
      active: {
        ...active,
        active_transfer: {
          variant_id: "ja.scenario.demo.first-meeting.formal",
          mode: "walk",
          prompt: "Greet a senior colleague in the office.",
          actions: [
            { intent: "bow-greet", label: "Bow and greet formally" },
            { intent: "ask-time", label: "Ask the time" },
          ],
        },
      },
    });
    expect(html).toContain('aria-label="Ways to respond (transfer)"');
    expect(html).toContain(">Bow and greet formally<");
    expect(html).toContain('data-intent="bow-greet"');
    expect(html).not.toContain(">bow-greet<");
    expect(html).not.toContain("✓");
  });

  it("surfaces a failed transfer answer honestly, without fake progress", () => {
    const html = render({
      active: {
        ...active,
        active_transfer: {
          variant_id: "ja.scenario.demo.first-meeting.formal",
          mode: "recall",
          prompt: "Greet a senior colleague.",
          actions: [],
        },
      },
      transferResult: "not-satisfied",
    });
    expect(html).toContain("verdict verdict--retry");
    expect(html).toContain("Try again");
    // Nothing counted: no ✓, counter unmoved.
    expect(html).not.toContain("✓");
    expect(html).toContain("Transfer variants (0/1)");
  });

  // U08: an early end is saved practice, not a completed scenario. The
  // label follows the engine's `completed`, never the button press.
  it("labels an early end honestly, not as completion", () => {
    const html = render({
      outcome: {
        nodes_completed: 2,
        exchanges_total: 3,
        completed: false,
        transfers_completed: 0,
        transfers_required: 1,
        transfer_requirement_met: false,
      },
    });
    expect(html).toContain("Practice saved — 2 of 3 exchanges completed");
    expect(html).not.toContain("Scenario complete");
    // U08: the transfer line states the actual requirement, never "at least".
    expect(html).toContain("0 of 1 transfer exchanges");
    expect(html).not.toContain("at least");
    expect(html).toContain("Transfer variants show you can flex");
  });

  it("says Scenario complete only when the chain completed", () => {
    const html = render({
      outcome: {
        nodes_completed: 3,
        exchanges_total: 3,
        completed: true,
        transfers_completed: 1,
        transfers_required: 1,
        transfer_requirement_met: true,
      },
    });
    expect(html).toContain("Scenario complete");
    expect(html).toContain("3 of 3 exchanges completed");
    expect(html).toContain("1 of 1 transfer exchanges");
    expect(html).not.toContain("Practice saved");
  });

  it("keeps a single exchange singular and hides a zero transfer requirement", () => {
    const html = render({
      outcome: {
        nodes_completed: 1,
        exchanges_total: 1,
        completed: true,
        transfers_completed: 0,
        transfers_required: 0,
        transfer_requirement_met: true,
      },
    });
    expect(html).toContain("1 of 1 exchange completed");
    expect(html).not.toContain("transfer exchanges");
  });

  it("ends the session without the button promising completion", () => {
    const html = render({ active });
    expect(html).toContain(">End session<");
    expect(html).not.toContain("Finish scenario");
  });
});
