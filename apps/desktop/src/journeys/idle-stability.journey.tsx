/**
 * U01 — idle time and ordinary interaction issue no repeated native reads.
 *
 * The review caught a reactive loop in the old bridge: `detectInvoke` handed
 * the identity effect a fresh function every render, the effect stored a
 * fresh object on success AND failure, and the render loop hammered the
 * native host with `build_identity` — while the kanji capability probe
 * re-derived itself the same way. The bridge now memoizes the callback once
 * per mount, identity settles to "unknown" without retrying, and the probe
 * depends on (profile, pack) only. The tree has since moved (static invoke,
 * session seeding), so this journey is the regression PIN, measured against
 * the current code: after bootstrap settles, a waiting period and typing
 * into a real input produce zero further identity or capability calls.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("idle time and interaction issue no repeated native reads (U01)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("settles after bootstrap instead of looping the bridge", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "sam", display_name: "Sam", active: JA }],
      installed: [JA],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Sam"));
    await app.settle();

    const identityAfterBoot = app.engine.appCalls().filter((c) => c.cmd === "build_identity");
    const probeAfterBoot = app.engine.appCalls().filter((c) => c.cmd === "kanji_available");
    expect(identityAfterBoot.length).toBe(1);
    expect(probeAfterBoot.length).toBe(1);

    // A fixed idle interval: nothing re-fires.
    const later = Promise.withResolvers<void>();
    setTimeout(later.resolve, 300);
    await later.promise;
    await app.settle();
    expect(app.engine.appCalls().filter((c) => c.cmd === "build_identity").length).toBe(1);
    expect(app.engine.appCalls().filter((c) => c.cmd === "kanji_available").length).toBe(1);

    // Unrelated display state: typing a My Words draft answer fires no
    // identity read and no capability probe either.
    await app.click(app.button(app.section("Routes"), "My Words"));
    const panel = app.section("My words");
    await app.type(panel.querySelector("#mine-surface") as HTMLInputElement, "ねこ");
    await app.settle();
    expect(app.engine.appCalls().filter((c) => c.cmd === "build_identity").length).toBe(1);
    expect(app.engine.appCalls().filter((c) => c.cmd === "kanji_available").length).toBe(1);
  });
});
