/**
 * Journey — SETTINGS-PACK-CAPABILITY-001: the "Kana keyboard (in-app)"
 * setting exists only when the active pack's own manifest grants it.
 * The ja-JP fixture declares hiragana/katakana script ids; the ru-RU fixture
 * declares only Cyrillic. Same App container, same route, same components:
 * the card appears for the kana pack and is absent — not disabled, not
 * inert — for the Cyrillic pack. Nothing anywhere reads the pack's locale
 * to decide; the grant is the pack's declared `scripts:` read back.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, RU, type Mounted } from "./harness";

describe("the in-app keyboard card follows the active pack's declared scripts", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  async function openSettings(name: string, pack: string) {
    const engine = new LearnerEngine({
      profiles: [{ id: name.toLowerCase(), display_name: name, active: pack }],
      installed: [pack],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), name));
    await app.click(app.button(app.section("Routes"), "Settings"));
    await app.settle();
    return engine;
  }

  it("a profile learning the kana pack gets the keyboard setting", async () => {
    await openSettings("Mika", JA);
    const settings = app.section("Settings");
    expect(settings.textContent).toContain("Kana keyboard (in-app)");
    expect(settings.querySelector('[name="kana-keyboard"]')).not.toBeNull();
  });

  it("a profile learning the Cyrillic pack never sees the control", async () => {
    await openSettings("Dima", RU);
    const settings = app.section("Settings");
    // Absent entirely: no heading, no radios to interact with.
    expect(settings.textContent).not.toContain("Kana keyboard (in-app)");
    expect(settings.querySelector('[name="kana-keyboard"]')).toBeNull();
    // Settings itself is alive — only the ungranted card is gone.
    expect(settings.textContent).toContain("Profile data");
  });
});
