/**
 * Sweep finding 20 (2026-10-26): opening Settings primes several independent
 * reads. At HEAD one failed read — the speech catalogue — aborted every
 * remaining prime, so the learner saw Language-packs rows and microphone
 * pickers empty as if nothing were installed, when only one read had failed.
 * Each block now answers or reports on its own: the alert names exactly the
 * block that failed, and the blocks that answered show their real content.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("Settings priming survives a single failed read (sweep finding 20)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("a speech-catalogue failure leaves the pack rows and pickers populated", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "dana", display_name: "Dana", active: JA }],
      installed: [JA],
      failOnce: ["available_models"],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Dana"));

    await app.click(app.button(app.section("Routes"), "Settings"));
    await app.settle();

    // The one failed block says so once, attributed.
    const alert = document.querySelector('[aria-label="Settings"] [role="alert"]');
    expect(alert?.textContent ?? "").toContain("speech models");
    // The blocks that answered still render their real content: the pack
    // is listed, and the pickers exist — the pre-fix abort left both empty.
    expect(app.section("Language packs").textContent).toContain("Japanese — reference lexicon");
    expect(document.querySelectorAll('[aria-label="Settings"] select').length).toBeGreaterThan(0);
  });
});
