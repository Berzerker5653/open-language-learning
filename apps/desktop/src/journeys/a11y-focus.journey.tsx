/**
 * A11Y-RUN-L1-REMEDIATION-001 (F-01) — every in-app navigation moves focus
 * into the new content.
 *
 * The owner's Orca pass (state/evidence/ACC-001/OWNER-PASS-2026-10-19.md)
 * found the screen reader silent on wizard steps, lesson pages, and
 * activity cards: only route changes moved focus, because the focus effect
 * in App.tsx returned early for every wizard step and knew nothing of the
 * lesson/card state. This is the mounted-interaction proof the task's
 * acceptance demands — real clicks, real focus assertions, not a static
 * render.
 */
import { afterEach, describe, expect, it } from "vitest";
import { LearnerEngine, RU, mountApp, type Mounted } from "./harness";

/** The focused element when — and only when — it is a heading inside the
 * main content area. */
function focusedHeading(): HTMLElement | null {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body) return null;
  return el.matches("#main h1, #main h2") ? el : null;
}

describe("focus lands on the heading of every new screen (F-01)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("announces lesson arrival and activity cards with focus on their heading", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "katya", display_name: "Katya", active: RU }],
      installed: [RU],
    });
    app = await mountApp(engine);
    await app.settle();

    // Entering the app is a navigation: the Today heading owns focus, not
    // the resume button that was just clicked.
    await app.click(app.button(app.section("Profiles"), "Katya"));
    await app.settle();
    expect(focusedHeading()?.textContent).toContain("Hi Katya");

    // Opening a plan row lands on the lesson page: a fresh h1 inside
    // #main has focus. (The plan card's own controls do not.)
    const firstLook = app.section("First look");
    const row = [...firstLook.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("Write it"),
    );
    if (!row) throw new Error('"First look" offers no "Write it" row');
    await app.click(row);
    await app.settle();
    const lessonHeading = focusedHeading();
    expect(lessonHeading, "no heading in #main had focus on lesson arrival").toBeTruthy();
    expect(lessonHeading?.tagName).toBe("H1");

    // Start practising: the activity card's question heading is now the
    // focused landmark — either the content h1 or the runner h2, and not
    // the Start button that was clicked.
    await app.click(app.button(app.section("Lesson"), "Start practising"));
    await app.settle();
    const cardHeading = focusedHeading();
    expect(cardHeading, "no heading in #main had focus on card arrival").toBeTruthy();
    expect(cardHeading?.textContent?.trim()).toBe("Fill in the blank");

    // Grading must NOT steal focus: the verdict arrives in a status
    // region (F-05) while focus stays parked on the card heading, so the
    // answer controls stay reachable.
    const answer = document.querySelector<HTMLInputElement>("#practice-answer");
    if (!answer) throw new Error("the writing stage rendered no typed input");
    await app.type(answer, "Подпишите");
    await app.click(app.button(app.section("Practice"), "Check"));
    await app.settle();
    expect(app.text('[aria-label="Practice"] [aria-live="polite"]')).toBe("Correct");
    expect(document.activeElement).toBe(cardHeading);

    // Back to plan is another navigation: focus returns to the Today
    // heading, not the button just pressed.
    await app.click(app.button(app.section("Practice"), "Back to plan"));
    await app.settle();
    expect(focusedHeading()?.textContent).toContain("Hi Katya");
  });

  it("announces onboarding step changes with focus on the step heading", async () => {
    const engine = new LearnerEngine({ profiles: [], installed: [] });
    app = await mountApp(engine);
    await app.settle();

    // The wizard's first step arrives focused — the old effect bailed out
    // for every step except "done" and nothing else ever focused a heading.
    expect(focusedHeading()?.textContent).toContain("Your data stays on this device");

    // Creating the profile moves the wizard to the pack step: a new step,
    // same route, still a navigation that must be announced.
    const name = document.querySelector<HTMLInputElement>("#profile-name");
    if (!name) throw new Error("the welcome step rendered no name field");
    await app.type(name, "Sam");
    await app.click(app.button(app.section("Onboarding"), "Create local profile"));
    await app.settle();
    expect(focusedHeading()?.textContent).toContain("Choose a language pack");
  });
});
