/**
 * Journey — SETTINGS-SCOPE-001 (owner phone dogfood complaint 06): a
 * Settings section exists only because an INSTALLED pack declared the
 * capability on its own manifest (`settings_capabilities:`).
 *
 * The ru-RU fixture declares NO settings grant; the ja fixtures declare
 * `romanization-display` (mirroring their shipped manifests). Same App
 * container, same route, same components: the "Romaji (romanisation)
 * display" card is absent for the RU-only learner — not disabled, not
 * hidden — and appears when a granting pack is on device, EVEN while the
 * RU pack is the active one: the gate is the union across installed packs,
 * never a language constant and never `locale`.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, RU, type Mounted } from "./harness";

describe("settings sections follow installed packs' declared capabilities", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  async function openSettings(name: string, installed: string[], active: string) {
    const engine = new LearnerEngine({
      profiles: [{ id: name.toLowerCase(), display_name: name, active }],
      installed,
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), name));
    await app.click(app.button(app.section("Routes"), "Settings"));
    await app.settle();
    return engine;
  }

  it("a Russian-only learner never sees the Japanese-only romaji control", async () => {
    await openSettings("Katya", [RU], RU);
    const settings = app.section("Settings");
    // Absent entirely: no heading, no radios to interact with (the owner's
    // phone screenshot showed exactly this card on a RU-only device).
    expect(settings.textContent).not.toContain("Romaji (romanisation) display");
    expect(settings.querySelector('[name="romaji-mode"]')).toBeNull();
    // Settings itself is alive — only the ungranted card is gone.
    expect(settings.textContent).toContain("Microphone");
    expect(settings.textContent).toContain("Profile data");
  });

  it("a learner with a Japanese pack on device gets the romaji setting", async () => {
    await openSettings("Mika", [JA], JA);
    const settings = app.section("Settings");
    expect(settings.textContent).toContain("Romaji (romanisation) display");
    expect(settings.querySelector('[name="romaji-mode"]')).not.toBeNull();
  });

  it("the grant is the union across installed packs, not the active pack's language", async () => {
    // RU active, JA installed but not active: the setting still exists,
    // because the installed JA pack made the grant. Nothing reads a locale.
    await openSettings("Sasha", [RU, JA], RU);
    const settings = app.section("Settings");
    expect(settings.querySelector('[name="romaji-mode"]')).not.toBeNull();
  });
});
