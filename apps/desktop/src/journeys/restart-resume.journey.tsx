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

  it("a failed resume-list read names the failure and keeps the wizard usable (sweep finding 16)", async () => {
    // The same device state as the first test, but the resume read itself
    // fails: before the fix this was an unhandled rejection, a wizard with
    // no explanation of why the returning learner was not on their picker.
    const engine = new LearnerEngine({
      profiles: [{ id: "dana", display_name: "Dana", active: JA }],
      installed: [JA],
      failOnce: ["list_profiles"],
    });
    app = await mountApp(engine);
    await app.settle();

    const wizard = app.text('[aria-label="Onboarding"]');
    expect(wizard).toContain("Existing profiles could not be checked");
    expect(wizard).not.toContain("Welcome back");
    // Creating a profile remains reachable — the failure is not a dead end.
    expect(document.querySelector("#profile-name")).not.toBeNull();
  });

  it("a failed active-pack read is attributed, never claimed as 'no language' (sweep finding 19)", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "dana", display_name: "Dana", active: JA }],
      installed: [JA],
      failOnce: ["active_pack"],
    });
    app = await mountApp(engine);
    await app.settle();
    await app.click(app.button(app.section("Profiles"), "Dana"));
    await app.settle();

    // K-05 rule: the learner is inside the app anyway...
    expect(app.text('[aria-label="Practice"] h1')).toBe("Hi Dana");
    // ...and Home says the read failed instead of asserting the pack-less
    // copy for a profile that does have an active pack on disk.
    const home = app.section("Practice").textContent ?? "";
    expect(home).toContain("could not read which language pack");
    expect(home).not.toContain("No language is set for this profile");
  });

  it("a running session survives neither a profile switch nor a profile delete (sweep finding 15)", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "dana", display_name: "Dana", active: JA }],
      installed: [JA],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Dana"));

    // A session is started, then PAUSED: the panel and the
    // "Resume session" offer are exactly the state that must not
    // outlive a profile switch or delete.
    await app.click(app.button(app.section("Practice"), "Start today's plan"));
    await app.settle();
    await app.click(document.querySelector("[data-session-pause]")!);
    await app.settle();
    expect(app.section("Today's session").textContent).toContain("Session paused");
    expect(app.button(app.section("Today's session"), "Resume session")).toBeTruthy();

    // Switch profiles mid-session: the next profile must inherit no
    // panel, no summary, and — once back on a plan — no "Resume
    // session" for the old pack's snapshot.
    await app.click(app.button(app.section("Routes"), "Settings"));
    await app.click(app.button(app.section("Settings"), "Switch profile…"));
    await app.click(app.button(app.section("Switch profile confirmation"), "Yes, switch profile"));
    await app.settle();
    expect(
      [...document.querySelectorAll("button")].some((b) =>
        (b.textContent ?? "").includes("Resume session"),
      ),
    ).toBe(false);
    await app.click(app.button(app.section("Profiles"), "Dana"));
    expect(document.querySelector('[aria-label="Today\'s session"]')).toBeNull();
    expect(document.querySelector('[aria-label="Session summary"]')).toBeNull();
    expect(
      [...document.querySelectorAll("button")].some((b) =>
        (b.textContent ?? "").includes("Resume session"),
      ),
    ).toBe(false);

    // And deleting a profile mid-session tears the same state down.
    await app.click(app.button(app.section("Practice"), "Start today's plan"));
    await app.settle();
    await app.click(document.querySelector("[data-session-pause]")!);
    await app.settle();
    await app.click(app.button(app.section("Routes"), "Settings"));
    await app.click(app.button(app.section("Settings"), "Delete profile data…"));
    await app.click(
      app.button(
        app.section("Delete confirmation"),
        "Yes, delete this profile and all its local data",
      ),
    );
    await app.settle();
    expect(document.querySelector('[aria-label="Today\'s session"]')).toBeNull();
    expect(document.querySelector('[aria-label="Session summary"]')).toBeNull();
    expect(
      [...document.querySelectorAll("button")].some((b) =>
        (b.textContent ?? "").includes("Resume session"),
      ),
    ).toBe(false);
  });
});
