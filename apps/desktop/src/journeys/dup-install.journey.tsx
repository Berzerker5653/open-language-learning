/**
 * Journey (h) — a failed `installed_packs` read degrades honestly, and a
 * later Install click re-checks instead of blindly re-dispatching the
 * download (sweep-ts-dup-install). The engine's already-current install is a
 * no-op, so the learner-facing cost of the old silent catch was a confident
 * wrong "Install" for a pack already on the device; this pins the fixed
 * behavior: say the state is unknown, then verify before moving bytes.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("installed state unknown (journey h)", () => {
  let app: Mounted;
  afterEach(async () => {
    await app?.unmount();
  });

  it("says the state is unknown, then refuses to double-install once it is knowable", async () => {
    // The pack is already on this device, but the launch-time read fails
    // once — the transient engine hiccup the audit flagged.
    app = await mountApp(new LearnerEngine({ installed: [JA], failOnce: ["installed_packs"] }));

    // Fresh install (no profiles), so the wizard opens; walk to the language step.
    const wizard = app.section("Onboarding");
    const nameField = document.querySelector<HTMLInputElement>("#profile-name");
    if (!nameField) throw new Error('the wizard rendered no "#profile-name" field');
    await app.type(nameField, "Alex");
    await app.click(app.button(wizard, "Create local profile"));
    expect(app.text('[aria-label="Onboarding"] h1')).toBe("Choose a language pack");

    // Honest degraded state: the step names the unknown instead of
    // rendering a confident-but-unverified Install for everything.
    expect(app.section("Onboarding").textContent).toContain(
      "could not check which packs are already installed",
    );

    // The Japanese row still offers Install (the state is unknown, not
    // known-installed) — clicking must RE-CHECK, not dispatch a download.
    const jaInput = [...document.querySelectorAll('[name="pack"]')].find((input) =>
      (input.closest("label")?.textContent ?? "").includes("Japanese"),
    ) as HTMLElement | undefined;
    if (!jaInput) throw new Error("the Japanese pack was not offered in the wizard");
    const row = jaInput.closest(".radio-row") as HTMLElement;
    const installButton = row.querySelector("button") as HTMLButtonElement;
    await app.click(installButton);

    // The fresh check found the pack: the row flips to Installed, the
    // degraded notice is cleared, and no install was ever dispatched.
    expect(installButton.textContent).toBe("Installed");
    expect(app.text('[aria-label="Onboarding"]')).not.toContain("could not check");
    expect(app.engine.appCalls().some((c) => c.cmd === "install_pack")).toBe(false);
  });
});
