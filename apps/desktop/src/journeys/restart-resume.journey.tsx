/**
 * Journey (g) — restarting the app resumes the learner, never re-onboards them.
 *
 * K-05: a device that already holds a profile must open on the resume picker,
 * and the launch-time branch has to run before anything that can fail (a pack
 * read, a notice read) — otherwise a failing read strands a returning learner
 * back at the new-profile wizard. Mounting the app a second time against the
 * same engine is what a restart looks like inside one process: React state is
 * gone, the store is not, and the boot guard means the second launch still
 * reaches the resume branch. Every assertion is about what the learner sees
 * when they reopen the app; the only thing replaced is the engine under the
 * IPC boundary.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("restarting resumes instead of re-onboarding (journey g)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  function expectResumePicker() {
    const picker = app.section("Profiles");
    expect(picker.textContent).toContain("Dana");
    expect(app.text('[aria-label="Onboarding"] h1')).toBe("Welcome back");
    expect(app.text('[aria-label="Onboarding"]')).toContain("These profiles live on this device.");
    // The wizard is nowhere in sight: no name field, no create button, and the
    // first-run privacy heading is not what this learner is asked to read.
    expect(document.querySelector("#profile-name")).toBeNull();
    expect(app.text('[aria-label="Onboarding"]')).not.toContain("Create local profile");
    expect(app.text('[aria-label="Onboarding"]')).not.toContain("Your data stays on this device");
  }

  it("opens on the resume picker at launch, ahead of the reads that can fail", async () => {
    // The learner's device already holds a profile with a pack and recorded
    // attempts — the store a restart has to find its way back to.
    const engine = new LearnerEngine({
      profiles: [{ id: "dana", display_name: "Dana", active: JA, events: 7 }],
      installed: [JA],
    });
    app = await mountApp(engine);
    await app.settle();

    // K-05: the read that decides where the learner lands runs ahead of the
    // reads that can fail (the notice, the pack lists) — a failing read must
    // never strand a returning learner back at the new-profile wizard. The
    // chrome's build-identity reads are component noise, not the boot branch.
    const boot = engine.appCalls().map((c) => c.cmd);
    const resume = boot.indexOf("list_profiles");
    expect(resume, "the resume branch never ran at launch").toBeGreaterThan(-1);
    for (const later of ["privacy_notice", "available_packs", "installed_packs"]) {
      expect(boot.indexOf(later), `"${later}" ran before the resume branch`).toBeGreaterThan(
        resume,
      );
    }
    expect(boot).not.toContain("create_profile");

    expectResumePicker();
  });

  it("reopens on the resume picker after a restart, not at the wizard", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "dana", display_name: "Dana", active: JA, events: 7 }],
      installed: [JA],
    });
    app = await mountApp(engine);
    await app.settle();
    const firstLaunchCalls = engine.appCalls().length;

    // Restart: the process keeps the store, the component tree is thrown away.
    await app.unmount();
    app = await mountApp(engine);
    await app.settle();

    // The second launch is a launch: it re-reads the profile list ahead of the
    // reads that can fail, and the once-per-process guard keeps the headless
    // walkthrough out of it — a learner's restart must not run the smoke
    // script, and it must never write a profile.
    const relaunch = engine
      .appCalls()
      .slice(firstLaunchCalls)
      .map((c) => c.cmd);
    const resume = relaunch.indexOf("list_profiles");
    expect(resume, "the resume branch never ran on the second launch").toBeGreaterThan(-1);
    for (const later of ["privacy_notice", "available_packs", "installed_packs"]) {
      expect(relaunch.indexOf(later), `"${later}" ran before the resume branch`).toBeGreaterThan(
        resume,
      );
    }
    expect(relaunch).not.toContain("create_profile");
    expect(relaunch, "the second launch re-ran the headless walkthrough").not.toContain(
      "smoke_ack",
    );

    expectResumePicker();

    // And the picker is not a dead end on the second launch either: picking
    // Dana lands on a Home with the plan the store still holds.
    await app.click(app.button(app.section("Profiles"), "Dana"));
    expect(app.text('[aria-label="Practice"] h1')).toBe("Hi Dana");
    expect(app.text(".plan-summary")).toBe("2 activities · about 3 minutes");
  });
});
