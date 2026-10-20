/**
 * Journey — the in-app kana keyboard (issue #2 phase 1).
 *
 * A learner with `kana-keyboard = romaji-kana` types romaji into the app's
 * own Japanese fields and gets kana, with no system layout or IME involved;
 * a learner with it off sees the app intercept NO key at all. Both halves
 * are contracts from the issue: zero interception when off, and grading
 * stays button-only — Enter completes the in-progress romaji, it never
 * activates a control.
 *
 * happy-dom models neither text input nor IME composition, so this file
 * dispatches real keydown events (what the layer consumes) and asserts the
 * layer's half: preventDefault, the field's rendered value, and which
 * engine commands did — and did not — run.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("in-app kana keyboard on the My Words form", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });
  /** Press one printable/control key on `el` and report whether the app took it. */
  async function pressKey(el: HTMLElement, key: string): Promise<boolean> {
    const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    await app.settle(2);
    return ev.defaultPrevented;
  }
  async function typeRomaji(el: HTMLInputElement, word: string) {
    for (const ch of word)
      expect(await pressKey(el, ch), `typing "${ch}" should be taken over`).toBe(true);
  }

  async function openWords(kana: "off" | "romaji-kana") {
    const engine = new LearnerEngine({
      profiles: [{ id: "sam", display_name: "Sam", active: JA, kana }],
      installed: [JA],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Sam"));
    await app.click(app.button(app.section("Routes"), "My Words"));
    return engine;
  }

  it("romaji typed on the surface field lands as kana", async () => {
    await openWords("romaji-kana");
    const surface = document.querySelector("#mine-surface") as HTMLInputElement;
    const reading = document.querySelector("#mine-reading") as HTMLInputElement;
    surface.focus();

    await typeRomaji(surface, "konnichiwa");
    expect(surface.value).toBe("こんにちわ");

    // The reading field has its own independent live buffer.
    reading.focus();
    await typeRomaji(reading, "kyou");
    expect(reading.value).toBe("きょう");
    expect(surface.value).toBe("こんにちわ");
  });

  it("Escape cancels the half-typed syllable; Enter completes the word, grading untouched", async () => {
    const engine = await openWords("romaji-kana");
    const surface = document.querySelector("#mine-surface") as HTMLInputElement;
    surface.focus();

    await typeRomaji(surface, "ky");
    expect(surface.value).toBe("ky"); // unresolved tail shows raw
    expect(await pressKey(surface, "Escape"), "Escape should cancel the preedit").toBe(true);
    expect(surface.value).toBe("");

    await typeRomaji(surface, "nihon");
    expect(surface.value).toBe("にほn"); // a trailing n waits, like a real IME
    expect(await pressKey(surface, "Enter"), "Enter should stay inside the field").toBe(true);
    expect(surface.value).toBe("にほん");
    expect(surface.value).not.toContain("n");

    // Enter committed text into the draft — it never reached a control: the
    // word was not added and grading stayed button-only.
    expect(engine.calls.some((c) => c.cmd === "mine_new")).toBe(false);
    await app.click(app.button(app.section("My words"), "Add to my words"));
    expect(app.section("My words").textContent).toContain("にほん");
  });

  it("with the setting off the app intercepts nothing", async () => {
    await openWords("off");
    const surface = document.querySelector("#mine-surface") as HTMLInputElement;
    surface.focus();
    for (const ch of "konnichiwa")
      expect(await pressKey(surface, ch), "the layer must stand down when off").toBe(false);
    expect(surface.value).toBe(""); // keydowns alone type nothing; nothing was rewritten
  });
});
