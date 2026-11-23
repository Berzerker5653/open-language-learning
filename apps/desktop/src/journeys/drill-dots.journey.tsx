/**
 * FEEL-DRILL-001 — per-stage step dots in the kanji drill runner.
 *
 * placementIdx and the kanji stage were tracked in App state but never
 * rendered: the learner in a multi-question embedded runner had no sense
 * of where they were. The kanji drill is the reachable mounted proof
 * (meaning stage -> reading stage): two dots, current marked, then the
 * done marker lands on the first stage after advancing. (The RU placement
 * fixture plans a single question, where honest dots hide — the wiring
 * for both runners is pinned statically in drill-feel.test.ts.)
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("kanji drill shows per-stage step dots (FEEL-DRILL-001)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("renders stage dots and advances them meaning -> reading", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "kim", display_name: "Kim", active: JA }],
      installed: [JA],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Kim"));
    await app.settle();
    await app.click(app.button(app.section("Routes"), "Kanji"));
    await app.settle();

    const kanji = app.section("Kanji");
    await app.click(app.button(kanji, "祖母"));
    await app.settle();

    const dots = kanji.querySelector("[data-step-dots]");
    if (!dots) throw new Error("the kanji drill never rendered step dots");
    expect(dots.querySelectorAll(".step-dot").length).toBe(2);
    expect(dots.querySelectorAll(".step-dot--current").length).toBe(1);
    expect(dots.getAttribute("aria-label")).toContain("1 of 2");

    // Answer the meaning stage, then advance to the reading stage.
    const task = app.section("Practice");
    const answer = [...task.querySelectorAll("button")].find(
      (b) => (b.textContent ?? "").trim() === "grandmother",
    );
    if (!answer) throw new Error("the meaning gloss is not offered as a choice");
    await app.click(answer);
    await app.settle();
    expect(task.textContent).toContain("Correct");
    await app.click(app.button(kanji, "Back to plan"));
    await app.settle();

    const after = kanji.querySelector("[data-step-dots]");
    if (!after) throw new Error("the step dots vanished after the stage change");
    expect(after.getAttribute("aria-label")).toContain("2 of 2");
    expect(after.querySelectorAll(".step-dot--done").length).toBe(1);
    expect(after.querySelectorAll(".step-dot--current").length).toBe(1);
  });
});
