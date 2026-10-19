/**
 * U05 — placement only asks questions that actually work.
 *
 * The review opened Russian placement and the first card died with
 * "unknown practice target": the plan led with a printed-Cyrillic rubric
 * whose recall runner has nothing servable. The engine now build-verifies
 * every planned pair through the same builder the submit path uses, and
 * reports each refused rubric through `placement_coverage` instead of
 * emitting a dead card. This journey executes the FIRST Russian placement
 * question end to end — real lexicon content, a real verdict — and reads
 * the abstention copy: the Cyrillic construct is named with the engine's
 * own machine-readable reason, not hidden and not faked.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, RU, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("placement asks only runnable questions and reports the rest (U05)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("runs the first Russian question and names every abstention", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "sam", display_name: "Sam", active: RU }],
      installed: [RU, JA],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Sam"));
    await app.settle();

    // Hub → Placement: the coverage pass runs when the surface opens, never
    // in the boot batch.
    await app.click(app.button(app.section("Routes"), "Practice"));
    await app.click(app.button(app.section("Practice modes"), "Placement"));
    expect(engine.appCalls().some((c) => c.cmd === "placement_coverage")).toBe(true);

    const place = app.section("Placement");

    // The abstention copy: statuses named, engine reasons verbatim.
    const coverage = place.querySelector('[data-testid="placement-coverage"]');
    if (!coverage) throw new Error("coverage note missing");
    expect(coverage.textContent).toContain("1 question ready");
    expect(coverage.textContent).toContain("2 rubrics the engine will not fake");
    expect(coverage.textContent).toContain("no runner can ask about that construct yet");
    expect(coverage.textContent).toContain("no low-stakes auto-runner exists");
    const reason = coverage.querySelector("code");
    expect(reason?.textContent).toContain("builder-refused:recall-meaning:ru.orth.cyrillic.");
    expect(reason?.textContent).toContain("unknown practice target");

    // The first question is a REAL question: a greetings lexicon card with
    // the family's own glosses as choices — no dead card, no invented item.
    const task = app.section("Practice");
    expect(task.textContent).toContain("здравствуйте");
    expect(task.textContent).toContain("hello (polite greeting)");
    expect(engine.lastArgsFor("practice_task")?.contentId).toBe("ru.lex.greetings.zdravstvuyte");

    const answer = [...task.querySelectorAll("button")].find(
      (b) => (b.textContent ?? "").trim() === "hello (polite greeting)",
    );
    if (!answer) throw new Error("the greetings gloss is not offered");
    await app.click(answer);
    expect(task.textContent).toContain("Correct");
    const submit = engine.lastArgsFor("placement_submit");
    expect(submit?.assessmentId).toBe("ru.assess.on-ramp.greetings-recognition");
    expect(submit?.modality).toBe("recall-meaning");

    // Two quick questions per goal (the pair repeats), then an honest close.
    await app.click(app.button(app.section("Placement"), "Back to plan"));
    const second = [...app.section("Practice").querySelectorAll("button")].find(
      (b) => (b.textContent ?? "").trim() === "hello (polite greeting)",
    );
    if (!second) throw new Error("the repeated pair never rendered");
    await app.click(second);
    await app.click(app.button(app.section("Placement"), "Back to plan"));
    expect(place.textContent).toContain("Placement complete: 2 of 2 correct");
  });
});
