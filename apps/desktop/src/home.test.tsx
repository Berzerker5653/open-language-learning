import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GoalMap, Home, ProgressView, type SessionPlan } from "./home";

const plan: SessionPlan = {
  items: [
    {
      item_id: "ja.lex.demo.hajimemashite#recall-meaning",
      content_id: "ja.lex.demo.hajimemashite",
      modality: "recall-meaning",
      reason: "due-review",
      est_seconds: 20,
    },
    {
      item_id: "ja.lex.demo.watashi#comprehension-reading",
      content_id: "ja.lex.demo.watashi",
      modality: "comprehension-reading",
      reason: "weak-skill",
      est_seconds: 40,
    },
    {
      item_id: "ja.grammar.demo.greetings#comprehension-reading",
      content_id: "ja.grammar.demo.greetings",
      modality: "comprehension-reading",
      reason: "progression",
      est_seconds: 60,
    },
  ],
  total_seconds: 120,
  budget_minutes: 5,
  seed: 0,
  planner_version: "session-planner-0.1.0",
};

describe("home", () => {
  it("shows next actions with learning reasons and budget presets", () => {
    const html = renderToStaticMarkup(
      <Home displayName="Hunter" plan={plan} activeBudget={5} onBudget={() => {}} />,
    );
    expect(html).toContain("Hi Hunter");
    expect(html).toContain("Due for review");
    expect(html).toContain("Strengthen a weak spot");
    expect(html).toContain("New material");
    expect(html).toContain("5 min");
    expect(html).toContain("30 min");
    expect(html).toContain("about 2 minutes");
  });

  it("contains no streak or attendance mechanics", () => {
    const html = renderToStaticMarkup(
      <Home displayName="Hunter" plan={plan} activeBudget={5} onBudget={() => {}} />,
    );
    for (const banned of ["streak", "day", "attendance", "points", "heart"]) {
      expect(html.toLowerCase()).not.toContain(banned);
    }
  });

  it("handles empty plans honestly", () => {
    const empty: SessionPlan = { ...plan, items: [], total_seconds: 0 };
    const html = renderToStaticMarkup(
      <Home displayName="Hunter" plan={empty} activeBudget={5} onBudget={() => {}} />,
    );
    expect(html).toContain("Nothing is due right now");
  });

  it("makes recall-meaning plan items runnable with the actual word", () => {
    const html = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={{
          ...plan,
          items: [
            {
              item_id: "ja.lex.demo.konnichiwa:recallmeaning",
              content_id: "ja.lex.demo.konnichiwa",
              modality: "recall-meaning",
              reason: "progression",
              est_seconds: 60,
              surface: "こんにちは",
              gloss: "hello",
            },
          ],
        }}
        activeBudget={5}
        onBudget={() => {}}
        onStart={() => {}}
      />,
    );
    expect(html).toContain('class="plan-item"');
    expect(html).toContain("こんにちは");
    expect(html).toContain("hello");
  });

  it("shows capability-gated environments with unlock state", () => {
    const html = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={5}
        onBudget={() => {}}
        environments={[
          { id: "greeting-desk", display_name: "Greeting desk", unlocked: true, missing: [] },
          {
            id: "cafe",
            display_name: "Quiet cafe",
            unlocked: false,
            missing: ["comprehension-reading of ja.lex.demo.konnichiwa"],
          },
        ]}
      />,
    );
    expect(html).toContain("Greeting desk");
    expect(html).toContain("Quiet cafe");
    expect(html).toContain('data-unlocked="yes"');
    expect(html).toContain('data-unlocked="no"');
    expect(html).toContain("not from activity counts");
  });
});

describe("progress", () => {
  it("shows per-dimension capability differences", () => {
    const html = renderToStaticMarkup(
      <ProgressView
        rows={[
          {
            content_id: "ja.lex.demo.watashi",
            dimension: "comprehension-reading",
            state: "independent",
            confidence: 0.62,
            needs_refresh: false,
          },
          {
            content_id: "ja.lex.demo.watashi",
            dimension: "production-writing",
            state: "introduced",
            confidence: 0.1,
            needs_refresh: true,
          },
        ]}
      />,
    );
    expect(html).toContain("comprehension-reading");
    expect(html).toContain("production-writing");
    expect(html).toContain("independent");
    expect(html).toContain("62%");
    expect(html).toContain("10%");
    expect(html).toContain("needs refresh");
    expect(html).toContain("reading does not imply speaking");
  });
});

describe("goal map", () => {
  it("renders pack-data goals with bands, prereqs, and per-modality states", () => {
    const html = renderToStaticMarkup(
      <GoalMap
        goals={[
          {
            pack_id: "org.openlanguage.ja-jp.reference",
            id: "ja.goal.onramp.kana-hiragana",
            description: "Recognize hiragana chart symbols on sight.",
            band: "on-ramp",
            review_status: "draft",
            modalities: ["reading"],
            assessed: true,
            locked: false,
            prerequisites: [],
            dimensions: [{ modality: "reading", state: "supported", exemplar: "ja.orth.hira.a" }],
          },
          {
            pack_id: "org.openlanguage.ja-jp.reference",
            id: "ja.goal.a1.ask-directions",
            description: "Ask for and follow simple directions.",
            band: "a1",
            review_status: "draft",
            modalities: ["listening", "interaction"],
            assessed: true,
            locked: true,
            prerequisites: [
              {
                target: "ja.orth.hira.a",
                dimension: "comprehension-reading",
                required_state: "independent",
                strength: "hard",
                satisfied: false,
              },
            ],
            dimensions: [
              { modality: "listening", state: "unseen", exemplar: null },
              { modality: "interaction", state: "unseen", exemplar: null },
            ],
          },
        ]}
      />,
    );
    expect(html).toContain("Recognize hiragana chart symbols");
    expect(html).toContain("on-ramp");
    expect(html).toContain("a1");
    expect(html).toContain("supported");
    expect(html).toContain("not started");
    expect(html).toContain("locked");
    expect(html).toContain("ja.orth.hira.a (comprehension-reading → independent)");
    expect(html).toContain("draft content");
  });

  it("is honest when no pack goals exist", () => {
    const html = renderToStaticMarkup(<GoalMap goals={[]} />);
    expect(html).toContain("No goals are available yet");
  });
});
