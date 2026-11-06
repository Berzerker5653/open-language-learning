/**
 * Journey — IME-TOGGLE-UX-001: the script-agnostic input-mode toggle.
 *
 * (1) The documented shortcut (Ctrl+Shift+K) flips the active pack's in-app
 * keyboard from ANY in-app route without opening Settings, honoring pack
 * capability gating; (2) the bubble pinned to the app chrome shows the
 * current input mode on every route, flips on click, and its label comes
 * from the ACTIVE pack's declared script metadata — never a hardcoded
 * language — with mode changes announced through a live region; (3) a pack
 * that declares no in-app keyboard (the ru-RU fixture: Cyrillic only)
 * shows no bubble and its shortcut press no-ops.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, RU, type Mounted } from "./harness";

const BUBBLE = '[data-testid="input-mode-bubble"]';
const ANNOUNCE = '[data-testid="input-mode-announcement"]';

describe("input-mode bubble and shortcut follow the active pack's declared scripts", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  async function enter(name: string, pack: string): Promise<LearnerEngine> {
    const engine = new LearnerEngine({
      profiles: [{ id: name.toLowerCase(), display_name: name, active: pack }],
      installed: [pack],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), name));
    await app.settle();
    return engine;
  }

  /** Press the documented Ctrl+Shift+K and report whether the app took it. */
  async function pressToggle(target: EventTarget = window): Promise<boolean> {
    const ev = new KeyboardEvent("keydown", {
      key: "K",
      code: "KeyK",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(ev);
    await app.settle(2);
    return ev.defaultPrevented;
  }

  function bubbleText(): string {
    return app.text(BUBBLE);
  }

  it("the bubble rides every in-app route and names the pack's declared scripts", async () => {
    await enter("Mika", JA);

    // On Today right after entry: the bubble exists and its text carries
    // the script names from the ja-JP manifest's own `scripts:` ids — the
    // strings "hiragana"/"katakana" appear nowhere in the UI code, only in
    // pack data, so seeing them here IS the metadata-derived label.
    expect(document.querySelector(BUBBLE)).not.toBeNull();
    expect(bubbleText()).toContain("hiragana");
    const off = bubbleText();
    expect(off).toContain("System keyboard");

    // Still pinned to the chrome after two route changes.
    await app.click(app.button(app.section("Routes"), "My Words"));
    await app.settle();
    expect(document.querySelector(BUBBLE)).not.toBeNull();
    await app.click(app.button(app.section("Routes"), "Settings"));
    await app.settle();
    expect(document.querySelector(BUBBLE)).not.toBeNull();
    expect(bubbleText()).toBe(off);
  });

  it("the documented shortcut flips the keyboard from a non-Settings route, and typing follows", async () => {
    const engine = await enter("Mika", JA);

    // From the Today route, no Settings visit: the shortcut writes the
    // same per-profile setting Settings shows.
    expect(await pressToggle()).toBe(true);
    expect(engine.lastArgsFor("set_kana_keyboard")).toEqual({
      profileId: "mika",
      mode: "romaji-kana",
    });
    expect(bubbleText()).toContain("In-app keyboard on");

    // The flip is live on the next route: romaji typed into the My Words
    // field lands as kana with no settings screen in sight.
    await app.click(app.button(app.section("Routes"), "My Words"));
    await app.settle();
    const surface = document.querySelector("#mine-surface") as HTMLInputElement;
    surface.focus();
    for (const ch of "kyou") {
      const ev = new KeyboardEvent("keydown", { key: ch, bubbles: true, cancelable: true });
      surface.dispatchEvent(ev);
      await app.settle(1);
    }
    expect(surface.value).toBe("きょう");

    // Pressing the shortcut with the field focused flips back to off and
    // leaks NO letter into the field: shortcuts must never eat ordinary
    // text entry, and ordinary typing must never eat the shortcut.
    expect(await pressToggle(surface)).toBe(true);
    expect(engine.lastArgsFor("set_kana_keyboard")).toEqual({ profileId: "mika", mode: "off" });
    expect(surface.value).toBe("きょう");
    expect(bubbleText()).toContain("System keyboard");
  });

  it("clicking the bubble flips the keyboard and announces the mode to screen readers", async () => {
    const engine = await enter("Mika", JA);

    // A live region is part of the bubble: mode changes announce
    // (A11Y-FLOW-001 semantics).
    const status = document.querySelector(`${BUBBLE} [role="status"][aria-live="polite"]`);
    if (!status) throw new Error("the bubble has no screen-reader status region");
    const before = app.text(ANNOUNCE);

    const toggle = document.querySelector(`${BUBBLE} button`) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await app.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(engine.lastArgsFor("set_kana_keyboard")).toEqual({
      profileId: "mika",
      mode: "romaji-kana",
    });

    // The announcement changed — the mode change is what carries, and it
    // still names the pack's declared scripts.
    const after = app.text(ANNOUNCE);
    expect(after).not.toBe(before);
    expect(after).toContain("In-app keyboard on");
    expect(after).toContain("hiragana");

    // Second click flips back through the same single write path.
    await app.click(toggle);
    expect(engine.lastArgsFor("set_kana_keyboard")).toEqual({ profileId: "mika", mode: "off" });
    expect(app.text(ANNOUNCE)).toContain("System keyboard");
  });

  it("a pack declaring no in-app keyboard has no bubble, and the shortcut no-ops", async () => {
    const engine = await enter("Dima", RU);

    // The ru-RU fixture declares only Cyrillic — no converter serves it,
    // so there is no keyboard to show or flip: absent, not disabled.
    expect(document.querySelector(BUBBLE)).toBeNull();
    expect(await pressToggle()).toBe(false);
    expect(engine.appCalls().some((c) => c.cmd === "set_kana_keyboard")).toBe(false);
  });
});
