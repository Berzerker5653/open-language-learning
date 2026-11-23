/**
 * Journey (e) — one bounded session: begin, pause, resume, finish.
 *
 * The learner is offered ONE action that starts the plan, and that action says
 * what the session covers ("2 activities, about 3 minutes") and how it can end
 * ("You can stop at any point"). The per-activity buttons stay, marked as the
 * alternative. Once the session is running, each graded answer is followed by an
 * action that names what comes next; pausing leaves the runner and states what
 * is left; resuming returns to the same activity; and the end says what was
 * done in plain counts — no reward for attending, and no claim that an activity
 * the learner never did was finished.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

/** Answer the activity currently on screen, lesson encounter included. */
async function doActivity(app: Mounted, gloss: string): Promise<void> {
  const lesson = document.querySelector('[aria-label="Lesson"]');
  if (lesson) await app.click(app.button(lesson as HTMLElement, "Start practicing"));
  await app.click(app.button(app.section("Choices"), gloss));
  expect(app.text('[aria-label="Practice"] [aria-live="polite"]')).toBe("Correct");
}

/** The session's own exit controls live outside the runner section. */
function sessionExit(): { pause: Element; stop: Element } {
  const pause = document.querySelector("[data-session-pause]");
  const stop = document.querySelector("[data-session-stop]");
  if (!pause || !stop) throw new Error("a running session rendered no pause/stop control");
  return { pause, stop };
}

async function mountLearner(): Promise<Mounted> {
  const app = await mountApp(
    new LearnerEngine({
      profiles: [{ id: "dana", display_name: "Dana", active: JA }],
      installed: [JA],
    }),
  );
  await app.click(app.button(app.section("Profiles"), "Dana"));
  return app;
}

describe("one bounded session (journey e)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("begins, walks the plan, pauses, resumes, and finishes honestly", async () => {
    app = await mountLearner();

    // One begin action, and it names both the scope and the exit.
    const begin = app.button(app.section("Practice"), "Start ·");
    expect(begin.textContent).toContain("2 activities");
    // PATH-CONNECT-PILL-001 (R2): the scope stays in the one-line capsule,
    // now in the "~N min" short form.
    expect(begin.textContent).toContain("~3 min");
    expect(app.section("Practice").textContent).toContain("You can stop at any point");
    expect(app.section("Practice").textContent).toContain("what you finish is saved");

    // The queue is demoted, not removed: single activities remain available.
    expect(app.section("Practice").textContent).toContain("Or do one activity on its own:");
    expect(document.querySelectorAll(".plan-item")).toHaveLength(2);

    await app.click(begin);
    await app.settle();

    // The session opened the first planned activity, not a task launcher.
    expect(app.text('[aria-label="Lesson"] h1')).toBe("First meeting");
    // And the session can be left from inside it.
    sessionExit();

    await doActivity(app, "how do you do (first meeting)");
    // The next action says what happens next instead of dropping the learner.
    expect(app.button(app.section("Practice"), "Continue to next activity")).toBeTruthy();
    await app.click(app.button(app.section("Practice"), "Continue to next activity"));
    await app.settle();

    // SESSION-FLOW-COPY-001: the session advances itself. A bridge names
    // what comes next — no second "Start practicing" card in between.
    const bridge = document.querySelector('[data-testid="session-bridge"]');
    if (!bridge) throw new Error("the session advanced without showing a bridge");
    expect(bridge.textContent).toContain("Next:");
    // ...and after the bridge the runner opens on its own, Start click or
    // not: the lesson card was never re-rendered.
    await new Promise((r) => setTimeout(r, 1500));
    await app.settle();
    expect(document.querySelector('[data-testid="session-bridge"]')).toBeNull();
    expect(document.querySelector('[aria-label="Lesson"]')).toBeNull();
    expect(app.section("Practice")).toBeTruthy();

    // Pausing mid-session leaves the runner and says what is left.
    await app.click(sessionExit().pause);
    await app.settle();
    const panel = app.section("Today's session");
    expect(panel.textContent).toContain("Session paused — 1 left to do.");
    expect(document.querySelector('[aria-label="Practice"] .plan-item')).toBeTruthy();

    // Resuming returns to the activity that was interrupted, not a new one.
    await app.click(app.button(panel, "Resume session"));
    await app.settle();
    expect(app.text('[aria-label="Lesson"]')).toContain("おばあさん");

    await doActivity(app, "grandmother");
    // The last activity names its own ending.
    expect(app.button(app.section("Practice"), "Finish session")).toBeTruthy();
    await app.click(app.button(app.section("Practice"), "Finish session"));
    await app.settle();

    const summary = app.section("Session summary");
    expect(summary.textContent).toContain("Session finished — 2 of 2 activities.");
    // Nothing was invented: two activities were started, two were submitted.
    expect(app.engine.appCalls().filter((c) => c.cmd === "practice_submit")).toHaveLength(2);
    // And the summary carries no reward surface (ADR-0002).
    expect(summary.textContent).not.toMatch(/streak|points|badge|🔥/i);

    // The summary is dismissable back to the plan.
    await app.click(app.button(summary, "Back to the plan"));
    await app.settle();
    expect(document.querySelector('[aria-label="Session summary"]')).toBeNull();
    expect(document.querySelector(".plan-item")).toBeTruthy();
  });

  it("stops honestly: nothing was done, and the plan says so", async () => {
    app = await mountLearner();
    await app.click(app.button(app.section("Practice"), "Start ·"));
    await app.settle();

    await app.click(sessionExit().stop);
    await app.settle();

    const summary = app.section("Session summary");
    expect(summary.textContent).toContain("Session stopped after 0 of 2 activities.");
    expect(summary.textContent).toContain(
      "What you finished is saved. The rest is still on your plan.",
    );
    expect(app.engine.appCalls().filter((c) => c.cmd === "practice_submit")).toHaveLength(0);
  });
});
