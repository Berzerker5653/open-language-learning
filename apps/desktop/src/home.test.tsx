import { describe, expect, it, vi } from "vitest";
import { isValidElement as isElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CanDoSummary,
  GoalMap,
  Home,
  ProgressView,
  type PlannedItem,
  type SessionPlan,
} from "./home";

const plan: SessionPlan = {
  items: [
    {
      item_id: "ja.lex.demo.hajimemashite#recall-meaning",
      content_id: "ja.lex.demo.hajimemashite",
      modality: "recall-meaning",
      reason: "due-review",
      kind: "review",
      est_seconds: 20,
    },
    {
      item_id: "ja.lex.demo.watashi#comprehension-reading",
      content_id: "ja.lex.demo.watashi",
      modality: "comprehension-reading",
      reason: "weak-skill",
      kind: "review",
      est_seconds: 40,
    },
    {
      item_id: "ja.grammar.demo.greetings#comprehension-reading",
      content_id: "ja.grammar.demo.greetings",
      modality: "comprehension-reading",
      reason: "progression",
      kind: "introduction",
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
    // K-66 (ADR-0020 §1): items carry the engine's own kind, and Home
    // groups under it; the per-item reason stays as the why.
    expect(html).toContain("First look");
    expect(html).toContain("Keep it sticking");
    expect(html).toContain("Nothing is recorded until you do one of these.");
    expect(html).toContain("Due for review");
    expect(html).toContain("Strengthen a weak spot");
    expect(html).toContain("New material");
    expect(html).toContain("5 min");
    expect(html).toContain("30 min");
    expect(html).toContain("about 2 minutes");
  });

  it("names the active pack once with its posture statement", () => {
    const html = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={5}
        onBudget={() => {}}
        activePack={{
          name: "Japanese Reference Pack (Draft)",
          posture: "AI-generated content · not human-reviewed",
        }}
      />,
    );
    expect(html).toContain("Japanese Reference Pack (Draft)");
    expect(html).toContain("AI-generated content · not human-reviewed");
    // Without loaded pack data the header is absent: nothing is claimed.
    const bare = renderToStaticMarkup(
      <Home displayName="Hunter" plan={plan} activeBudget={5} onBudget={() => {}} />,
    );
    expect(bare).not.toContain("AI-generated content");
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

  // Owner 2026-10-12: a profile whose language step was skipped must not sit
  // under a heading promising work that cannot exist. The state names itself
  // and offers the one control that resolves it.
  it("states the missing language and offers the way out, withholding the plan promise", () => {
    const html = renderToStaticMarkup(
      <Home
        displayName="Skipper"
        plan={{ ...plan, items: [], total_seconds: 0 }}
        activeBudget={5}
        onBudget={() => {}}
        noPack
        onChooseLanguage={() => {}}
      />,
    );
    expect(html).toContain("No language is set for this profile yet");
    expect(html).toContain("Choose a language");
    expect(html).not.toContain("what to practice now");
    // No posture statement, no goal, no first steps: with no pack nothing is
    // claimed about a language this profile is not studying.
    expect(html).not.toContain("pack-posture");
    expect(html).not.toContain("Where to begin");
    // A time budget and a zero-count plan summary are noise when there is
    // no pack: the budget tunes a plan that cannot exist, and "0 activities
    // · about 0 minutes" is a number with no meaning. The one control that
    // resolves the state is already in the notice.
    expect(html).not.toContain('aria-label="Time budget"');
    expect(html).not.toContain("plan-summary");
    expect(html).not.toContain("activities · about");
    // The with-a-pack empty state stays reachable (pinned above) but is not
    // stacked under the missing-language notice: that view offers exactly
    // one next action.
    expect(html).not.toContain("Nothing is due right now");
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
              kind: "introduction",
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

  it("makes every runner-backed modality startable and labels what it does (D2)", () => {
    const row = (modality: string) => ({
      item_id: `ja.lex.demo.watashi#${modality}`,
      content_id: "ja.lex.demo.watashi",
      modality,
      reason: "due-review" as const,
      kind: "review" as const,
      est_seconds: 20,
      surface: "私",
      gloss: "me",
    });
    const render = (modality: string, withHandler = true) =>
      renderToStaticMarkup(
        <Home
          displayName="Hunter"
          plan={{ ...plan, items: [row(modality)] }}
          activeBudget={5}
          onBudget={() => {}}
          {...(withHandler ? { onStart: () => {} } : {})}
        />,
      );
    // Mirrors the `matches!` guard in practice_build: each of these has a typed
    // runner, so a plan row for it must be actionable, not decorative.
    for (const modality of [
      "recall-meaning",
      "comprehension-listening",
      "phonological-discrimination",
      "orthography-recognition",
      "production-writing",
      "orthographic-encoding",
    ]) {
      const html = render(modality);
      expect(html).toContain('class="plan-item"');
      expect(html).not.toContain("no practice runner");
    }
    // A modality with no runner says so instead of offering a dead button.
    const inert = render("comprehension-reading");
    expect(inert).not.toContain('class="plan-item"');
    expect(inert).toContain("no practice runner");
    // And no handler means no button at all.
    expect(render("recall-meaning", false)).not.toContain('class="plan-item"');
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

  it("groups the plan by the engine's kind regardless of item order", () => {
    const shuffled: SessionPlan = {
      ...plan,
      items: [0, 2, 1].map((i) => plan.items[i] as PlannedItem),
    };
    const html = renderToStaticMarkup(
      <Home displayName="Hunter" plan={shuffled} activeBudget={5} onBudget={() => {}} />,
    );
    // Introduction (the unseen half) always leads the page, even when
    // the scheduler interleaves kinds in its own ordering.
    expect(html.indexOf('aria-label="First look"')).toBeLessThan(
      html.indexOf('aria-label="Keep it sticking"'),
    );
  });

  it("shows the pack's next declared goal, and abstains honestly without one", () => {
    const withGoal = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={5}
        onBudget={() => {}}
        nextGoal={{
          pack_id: "org.openlanguage.ja-jp.reference",
          goal_id: "ja.goal.onramp.kana-hiragana",
          description: "Recognize hiragana chart symbols on sight.",
          band: "on-ramp",
        }}
      />,
    );
    expect(withGoal).toContain("Next up:");
    expect(withGoal).toContain("Recognize hiragana chart symbols");
    expect(withGoal).toContain('data-goal="ja.goal.onramp.kana-hiragana"');
    // K-47 band gloss reused: the pack's token stays behind human copy.
    expect(withGoal).toContain("Getting started");
    // null is the engine saying "this pack declares no goal map".
    const noGoal = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={5}
        onBudget={() => {}}
        nextGoal={null}
      />,
    );
    expect(noGoal).toContain("This pack declares no learning path yet.");
    // undefined is home_state not having answered yet: claim nothing.
    const unknown = renderToStaticMarkup(
      <Home displayName="Hunter" plan={plan} activeBudget={5} onBudget={() => {}} />,
    );
    expect(unknown).not.toContain("Next up:");
    expect(unknown).not.toContain("declares no learning path");
  });

  it("renders at most three first-run steps, and nothing when the pack offers none", () => {
    const steps = [1, 2, 3, 4, 5].map((n) => ({
      kind: "introduction" as const,
      label: `step ${n}`,
      content_id: `ja.orth.hira.${n}`,
      goal_id: null,
    }));
    const html = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={5}
        onBudget={() => {}}
        firstRunSteps={steps}
      />,
    );
    expect(html).toContain("Where to begin");
    for (const n of [1, 2, 3]) expect(html).toContain(`step ${n}`);
    // ADR-0020 §4 caps first-run guidance at three steps.
    expect(html).not.toContain("step 4");
    expect(html).not.toContain("step 5");
    const none = renderToStaticMarkup(
      <Home displayName="Hunter" plan={plan} activeBudget={5} onBudget={() => {}} />,
    );
    expect(none).not.toContain("Where to begin");
  });

  // No DOM in this suite (see the header note in onboarding.test.tsx): a
  // "click" is the onClick prop on the element tree the component returned.
  // Home is presentational and hook-free, so calling it gives that tree.
  function childNodes(el: ReactElement): ReactNode[] {
    const props: unknown = el.props;
    if (props && typeof props === "object" && "children" in props) {
      const kids: unknown = props.children;
      return Array.isArray(kids) ? (kids as ReactNode[]) : [kids as ReactNode];
    }
    return [];
  }

  function collectButtons(node: ReactNode, out: ReactElement[] = []): ReactElement[] {
    if (Array.isArray(node)) {
      for (const child of node) collectButtons(child, out);
      return out;
    }
    if (!isElement(node)) return out;
    if (node.type === "button") out.push(node);
    collectButtons(childNodes(node), out);
    return out;
  }

  function buttonLabeled(
    root: ReactElement,
    label: string,
  ): ReactElement<{ onClick?: () => void }> {
    const found = collectButtons(root).find((el) =>
      childNodes(el).some((k) => typeof k === "string" && k.includes(label)),
    );
    if (!found) throw new Error(`no button labeled "${label}"`);
    return found as ReactElement<{ onClick?: () => void }>;
  }

  it("names both versions when the catalogue lists a different one, and routes review to language & packs", () => {
    const update = {
      pack_id: "org.openlanguage.ja-demo",
      display_name: "Japanese",
      installed_version: "0.4.0",
      available_version: "0.4.1",
    };
    const onChooseLanguage = vi.fn();
    const html = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={5}
        onBudget={() => {}}
        updates={[update]}
        onChooseLanguage={onChooseLanguage}
      />,
    );
    expect(html).toContain("Japanese");
    expect(html).toContain("version 0.4.0 is on this device.");
    expect(html).toContain("The pack catalogue lists version 0.4.1.");
    expect(html).toContain("Review pack updates");
    // The app may be packaged against a newer pack than the catalogue
    // lists, so the copy names both versions and claims no ordering.
    expect(html).not.toMatch(/newer|latest|out of date|up to date/i);
    const home = Home({
      displayName: "Hunter",
      plan,
      activeBudget: 5,
      onBudget: () => {},
      updates: [update],
      onChooseLanguage,
    });
    buttonLabeled(home, "Review pack updates").props.onClick?.();
    expect(onChooseLanguage).toHaveBeenCalledTimes(1);
    // Nothing to review: the version prose is absent entirely.
    expect(
      renderToStaticMarkup(
        <Home displayName="Hunter" plan={plan} activeBudget={5} onBudget={() => {}} />,
      ),
    ).not.toContain("pack catalogue lists");
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
            dimensions: [
              {
                modality: "reading",
                state: "supported",
                concepts_total: 1,
                concepts_seen: 1,
                exemplar: "ja.orth.hira.a",
                best_state: "supported",
              },
            ],
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
              {
                modality: "listening",
                state: "unseen",
                concepts_total: 3,
                concepts_seen: 0,
                exemplar: null,
                best_state: "unseen",
              },
              {
                modality: "interaction",
                state: "unseen",
                concepts_total: 3,
                concepts_seen: 0,
                exemplar: null,
                best_state: "unseen",
              },
            ],
          },
        ]}
      />,
    );
    expect(html).toContain("Recognize hiragana chart symbols");
    // K-47: the pack's band token stays on the DOM as data, while the
    // heading and gloss are human copy.
    expect(html).toContain('data-band="on-ramp"');
    expect(html).toContain("Getting started");
    expect(html).toContain('data-band="a1"');
    expect(html).toContain("familiar everyday expressions");
    expect(html).toContain("Band names are reference levels, not certificates");
    expect(html).toContain("supported");
    expect(html).toContain("not started");
    expect(html).toContain("locked");
    expect(html).toContain("ja.orth.hira.a (comprehension-reading → independent)");
    // Owner 2026-10-07: per-item draft badges are retired; posture is
    // stated once at pack level, never per goal.
    expect(html).not.toContain("draft content");
  });

  it("never drops a goal over an unrecognised band", () => {
    const goal = (band: string | null) => ({
      pack_id: "org.openlanguage.ja-jp.reference",
      id: `ja.goal.demo.${band ?? "none"}`,
      description: `Goal for band ${band ?? "none"}.`,
      band,
      review_status: "draft",
      modalities: ["reading"],
      assessed: true,
      locked: false,
      prerequisites: [],
      dimensions: [
        {
          modality: "reading",
          state: "unseen",
          concepts_total: 1,
          concepts_seen: 0,
          exemplar: null,
          best_state: "unseen",
        },
      ],
    });
    const html = renderToStaticMarkup(<GoalMap goals={[goal("novice"), goal(null), goal("A2")]} />);
    // Unknown tokens are the pack's vocabulary: shown verbatim, not hidden.
    expect(html).toContain('data-band="novice"');
    expect(html).toContain("banded novice by the pack");
    expect(html).toContain("Goal for band novice.");
    // Case-insensitive ladder lookup, and bandless goals still render.
    expect(html).toContain('data-band="A2"');
    expect(html).toContain("familiar routines");
    expect(html).toContain('data-band="other"');
    expect(html).toContain("Unlabelled");
  });

  it("R09: one strong concept never shows a multi-concept goal as achieved", () => {
    const html = renderToStaticMarkup(
      <GoalMap
        goals={[
          {
            pack_id: "org.openlanguage.ja-jp.reference",
            id: "ja.goal.a2.describe-photo",
            description: "Describe a photo in a few sentences.",
            band: "a2",
            review_status: "draft",
            modalities: ["reading"],
            assessed: true,
            locked: false,
            prerequisites: [],
            dimensions: [
              {
                modality: "reading",
                // The engine's aggregate: every declared concept must hold,
                // so three untouched concepts keep the goal unseen.
                state: "unseen",
                concepts_total: 4,
                concepts_seen: 1,
                exemplar: "ja.grammar.demo.adjectives",
                best_state: "independent",
              },
            ],
          },
        ]}
      />,
    );
    expect(html).toContain('data-state="unseen"');
    expect(html).toContain('data-coverage="1/4"');
    expect(html).toContain("1 of 4 concepts have evidence");
    expect(html).toContain("ja.grammar.demo.adjectives");
    // The strong concept is named as the exemplar, not as the goal's state.
    expect(html).toContain("strongest (ja.grammar.demo.adjectives) is independent");
  });

  it("is honest when no pack goals exist", () => {
    const html = renderToStaticMarkup(<GoalMap goals={[]} />);
    expect(html).toContain("No goals are available yet");
  });
});

describe("one bounded session on Home", () => {
  const base = {
    displayName: "Hunter",
    plan,
    activeBudget: 5,
    onBudget: () => {},
    onStart: () => {},
  };

  it("offers one begin action that names the scope and the exit", () => {
    const html = renderToStaticMarkup(<Home {...base} onStartSession={() => {}} />);
    expect(html).toContain("data-session-begin");
    expect(html).toContain("3 activities, about 2 minutes");
    expect(html).toContain("You can stop at any point");
    expect(html).toContain("what you finish is saved");
    // The queue stays reachable, but as the alternative to the session.
    expect(html).toContain("Or do one activity on its own:");
    expect(html).toContain('class="plan-item"');
  });

  it("offers no begin action when there is nothing to begin", () => {
    const empty: SessionPlan = { ...plan, items: [], total_seconds: 0 };
    const html = renderToStaticMarkup(<Home {...base} plan={empty} onStartSession={() => {}} />);
    expect(html).not.toContain("data-session-begin");
    expect(html).toContain("Nothing is due right now");
  });

  it("says what a paused session has left, and offers the way back in", () => {
    const html = renderToStaticMarkup(
      <Home
        {...base}
        session={{ status: "paused", total: 3, done: 2, notRunnable: 0 }}
        onResumeSession={() => {}}
        onStopSession={() => {}}
      />,
    );
    expect(html).toContain("Session paused — 1 left to do.");
    expect(html).toContain("Resume session");
    expect(html).toContain("Stop session");
    expect(html).not.toContain("data-session-begin");
  });

  it("keeps a running session visible when the learner navigates away", () => {
    const html = renderToStaticMarkup(
      <Home
        {...base}
        session={{ status: "running", total: 3, done: 1, notRunnable: 0 }}
        onResumeSession={() => {}}
        onStopSession={() => {}}
      />,
    );
    expect(html).toContain("Session in progress — 1 of 3 done.");
    expect(html).toContain("Go back to it");
  });

  it("finishes with counts, not rewards, and names what this build could not run", () => {
    const html = renderToStaticMarkup(
      <Home
        {...base}
        sessionOutcome={{ done: 2, total: 3, reason: "finished", notRunnable: 1 }}
        onDismissSessionSummary={() => {}}
      />,
    );
    expect(html).toContain("Session finished — 2 of 3 activities.");
    expect(html).toContain("1 planned activity has no practice screen in this build yet.");
    expect(html).toMatch(/class="session-summary"/);
    // No streak/points/badge surface is introduced by the session (ADR-0002).
    expect(html).not.toMatch(/streak|points|badge|🔥/i);
  });

  it("says plainly that a stopped session left work on the plan", () => {
    const html = renderToStaticMarkup(
      <Home
        {...base}
        sessionOutcome={{ done: 1, total: 3, reason: "stopped", notRunnable: 0 }}
        onDismissSessionSummary={() => {}}
      />,
    );
    expect(html).toContain("Session stopped after 1 of 3 activities.");
    expect(html).toContain("What you finished is saved. The rest is still on your plan.");
    expect(html).not.toContain("no practice screen in this build");
  });
});

describe("what you can do now", () => {
  const goal = {
    pack_id: "org.openlanguage.ja-jp.reference",
    id: "org.openlanguage.ja-jp.reference.goal.family",
    description: "Talk about family",
    band: "on-ramp",
    review_status: "draft",
    modalities: ["recall-meaning"],
    assessed: true,
    locked: false,
    prerequisites: [],
    dimensions: [
      {
        modality: "recall-meaning",
        state: "independent",
        concepts_total: 1,
        concepts_seen: 1,
        exemplar: "ja.lex.demo.obaasan",
        best_state: "independent",
      },
    ],
  };

  it("names the can-do claim and the fading skills, and the next step", () => {
    const html = renderToStaticMarkup(
      <CanDoSummary
        goals={[goal]}
        rows={[
          {
            content_id: "ja.lex.demo.obaasan",
            dimension: "recall-meaning",
            state: "independent",
            confidence: 0.8,
            needs_refresh: true,
          },
        ]}
        nextGoal={{
          pack_id: goal.pack_id,
          goal_id: goal.id,
          description: "Greet someone and say who you are",
          band: "on-ramp",
        }}
      />,
    );
    expect(html).toContain("Talk about family");
    // The modality is named as the action, not as the internal vocabulary.
    expect(html).toContain("used in practice: Recall");
    expect(html).toContain("1 skill is getting old");
    expect(html).toContain("Next up: ");
    expect(html).toContain("<strong>Greet someone and say who you are</strong>");
    expect(html).toContain("capability state, not an activity diary");
    // The headline answer is the pack's text; ids stay in the detail table.
    expect(html).not.toContain("<h1>org.openlanguage");
  });

  it("makes no can-do claim the evidence does not support", () => {
    const html = renderToStaticMarkup(<CanDoSummary goals={[]} rows={[]} nextGoal={null} />);
    expect(html).toContain("Nothing has been used well enough yet");
    expect(html).toContain("Nothing you have learned is close to being forgotten.");
    expect(html).toContain("This pack declares no learning path yet");
  });

  it("does not claim a goal is usable while its evidence is only unseen", () => {
    const unseen = {
      ...goal,
      dimensions: [
        { ...goal.dimensions[0]!, state: "unseen", concepts_seen: 0, best_state: "unseen" },
      ],
    };
    const html = renderToStaticMarkup(<CanDoSummary goals={[unseen]} rows={[]} nextGoal={null} />);
    expect(html).toContain("Nothing has been used well enough yet");
    expect(html).not.toContain("Talk about family");
  });
});
