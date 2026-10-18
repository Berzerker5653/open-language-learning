/**
 * Journey (a) — first run: a brand-new device reaches a local profile and puts
 * a first practice session in front of the learner.
 *
 * Everything here is what a learner sees and clicks: the privacy notice opens
 * the wizard, the profile button stays shut until a name is typed, installing
 * the bundled pack is what unlocks Continue, and the plan the wizard leaves the
 * learner on carries the button that starts the drill. No helper is called
 * directly; the only thing replaced is the engine under the IPC boundary.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("first run (journey a)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("walks a new device from the privacy notice to a graded first drill", async () => {
    // A fresh install: the store holds no profile at all.
    app = await mountApp(new LearnerEngine());

    // UX-001: the app opens on what it does with the learner's data, and the
    // first thing it asks for is a name that never leaves the device.
    const wizard = app.section("Onboarding");
    expect(wizard.querySelector("h1")?.textContent).toBe("Your data stays on this device");
    expect(wizard.textContent).toContain("No account required. Everything stays on this device.");
    expect(wizard.textContent).toContain("No account is required; profiles live on this device.");
    expect(app.button(wizard, "Create local profile").disabled).toBe(true);

    // The button opens once a name exists — and only then does the app ask the
    // engine to write a profile.
    const nameField = document.querySelector<HTMLInputElement>("#profile-name");
    if (!nameField) throw new Error('the wizard rendered no "#profile-name" field');
    await app.type(nameField, "Alex");
    await app.click(app.button(wizard, "Create local profile"));

    const created = app.engine.argsFor("create_profile");
    expect(created).toEqual({ displayName: "Alex" });

    // The language step: the bundled packs, and a Continue that is explained
    // rather than silently dead until a pack is on the device.
    expect(app.text('[aria-label="Onboarding"] h1')).toBe("Choose a language pack");
    const packRow = [...document.querySelectorAll('[name="pack"]')];
    expect(packRow).toHaveLength(3);
    const ru = packRow.find((input) =>
      (input.closest("label")?.textContent ?? "").includes("Russian"),
    );
    if (!ru) throw new Error("the Russian pack was not offered in the wizard");
    const ja = packRow.find((input) =>
      (input.closest("label")?.textContent ?? "").includes("Japanese"),
    ) as HTMLInputElement | undefined;
    if (!ja) throw new Error("the Japanese pack was not offered in the wizard");
    expect(app.button(wizard, "Continue").disabled).toBe(true);
    expect(app.text("#packs-continue-note")).toContain("Select an installed pack to continue");

    await app.click(ja);
    await app.click(app.button(wizard, "Install"));
    expect(app.engine.argsFor("install_pack")).toEqual({ packId: JA });
    await app.click(app.button(wizard, "Continue"));

    // Microphone is optional and never gates progress.
    expect(app.text('[aria-label="Onboarding"] h1')).toBe("Microphone (optional)");
    await app.click(app.button(wizard, "Skip for now"));

    // Setup finished: the engine was told which pack this profile chose, and
    // the plan the learner lands on comes back from the engine.
    expect(app.engine.argsFor("complete_onboarding")).toEqual({
      profileId: "profile-1",
      packId: JA,
      micEnabled: false,
    });
    expect(app.engine.appCalls().map((c) => c.cmd)).toContain("home_state");

    // Home names the learner, states the plan in the learner's own terms, and
    // offers the first session with the verb the runner actually performs.
    expect(app.text('[aria-label="Practice"] h1')).toBe("Hi Alex");
    expect(app.text(".plan-summary")).toBe("2 activities · about 3 minutes");
    expect(app.text('[aria-label="First steps"]')).toContain("how do you do (first meeting)");
    const planItem = app.button(app.section("First look"), "how do you do (first meeting)");
    expect(planItem.textContent).toContain("Recall");

    // The first session: the pack's authored encounter teaches the word before
    // anything is asked about it.
    await app.click(planItem);
    const lesson = app.section("Lesson");
    expect(lesson.querySelector("h1")?.textContent).toBe("First meeting");
    expect(lesson.textContent).toContain("はじめまして");
    expect(lesson.textContent).toContain("how do you do (first meeting)");
    await app.click(app.button(lesson, "Start practising"));

    // …then the drill itself, graded by the engine and answered in words the
    // learner can act on.
    const drill = app.section("Practice");
    expect(drill.querySelector("h2")?.textContent).toBe("What does this mean?");
    expect(drill.textContent).toContain("はじめまして");
    const choice = app.button(app.section("Choices"), "how do you do (first meeting)");
    await app.click(choice);

    expect(app.engine.argsFor("practice_submit")).toMatchObject({
      profileId: "profile-1",
      contentId: "ja.lex.demo.hajimemashite",
      modality: "recall-meaning",
      choiceIndex: 0,
    });
    expect(app.text('[aria-label="Practice"] [aria-live="polite"]')).toBe("Correct");
    expect(app.button(app.section("Practice"), "Back to plan")).toBeTruthy();
  });
});
