/**
 * Journey (f) — progress answers in the learner's order.
 *
 * CANDO-PROGRESS-001: the Progress page has to say what the learner can now
 * do, what changed, and what to do next BEFORE it shows numbers, and keep the
 * internal ids, confidence, and mastery labels as detail afterwards. Every
 * click is a learner's click; the only thing replaced is the engine under the
 * IPC boundary, and the answers are read off the screen in document order.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("progress reads in the learner's order (journey f)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("answers can-do, changed, and next before the recorded detail", async () => {
    app = await mountApp(
      new LearnerEngine({
        profiles: [{ id: "dana", display_name: "Dana", active: JA, events: 7 }],
        installed: [JA],
      }),
    );
    await app.click(app.button(app.section("Profiles"), "Dana"));
    await app.click(app.button(app.section("Routes"), "Progress"));

    const answers = app.section("What you can do now");
    // What the learner can do now, in the pack's own words, with the modality
    // named as the thing they would actually do.
    expect(answers.querySelector("h1")?.textContent).toBe("What you can do now");
    expect(answers.textContent).toContain("Talk about family");
    expect(answers.textContent).toContain("used in practice: Recall");
    // What changed comes from the scheduler's own refresh flag, not a diary.
    expect(answers.textContent).toContain("What changed");
    expect(answers.textContent).toContain("1 skill is getting old");
    // What to do next is the pack's next declared goal.
    expect(answers.textContent).toContain("What to do next");
    expect(answers.textContent).toContain("Next up: Greet someone and say who you are");

    // The numbers stay, but only afterwards: ids, confidence, and mastery
    // labels are detail under the answers.
    const detail = app.section("Progress");
    expect(detail.textContent).toContain("Recorded detail");
    expect(detail.textContent).toContain("ja.lex.demo.obaasan");
    expect(answers.compareDocumentPosition(detail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The goal map is no longer the page's headline either.
    expect(
      answers.compareDocumentPosition(app.section("Goal map")) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
