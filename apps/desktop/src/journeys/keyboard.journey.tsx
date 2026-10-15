/**
 * Journey — the whole route walk, keyboard only.
 *
 * A learner who never touches the mouse resumes, sees a Today view that
 * offers exactly one next action (their profile has no language yet, so no
 * budget chips and no "0 activities" summary), and uses it to reach
 * Settings; each route change lands the focus on the new page's own heading
 * so screen readers and keyboard users know the navigation happened. No
 * control swallows Enter, so nothing along the path traps the keyboard.
 *
 * happy-dom has no sequential Tab and no default Enter activation, so this
 * file models exactly those two browser behaviours — Tab walks the focusable
 * elements in DOM order, Enter clicks the focused control unless a handler
 * cancels the keydown — and every assertion is about the app's half of the
 * contract.
 */
import { afterEach, describe, expect, it } from "vitest";
import { LearnerEngine, mountApp, type Mounted } from "./harness";

/** The elements sequential Tab can stop on, in DOM order. */
function tabStops(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]"),
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

describe("keyboard-only route walk", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  /** Press `key` on `el` the way the browser does: keydown first, and the
   * control's default action only if nothing cancelled the key. */
  async function press(el: HTMLElement, key = "Enter") {
    el.focus();
    expect(document.activeElement, `the ${el.tagName.toLowerCase()} refused focus`).toBe(el);
    const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    expect(ev.defaultPrevented, `keydown ${key} was swallowed on "${el.textContent?.trim()}"`).toBe(
      false,
    );
    if (
      !ev.defaultPrevented &&
      (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement)
    )
      el.click();
    await app.settle();
  }

  it("walks from the resume picker through a no-pack Today into Settings, focus in hand", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "lee", display_name: "Lee", active: null }],
      installed: [],
    });
    app = await mountApp(engine);
    await app.settle();

    // The skip link is the first tab stop of the app, whatever else is on
    // the screen — that is what makes it usable as an escape hatch.
    expect(tabStops()[0]).toBe(document.querySelector('a[href="#main"]'));

    // Tab to the resume picker and Enter: Lee's profile.
    const stops = tabStops();
    const lee = stops.find((el) => el.textContent?.trim() === "Lee");
    if (!lee) throw new Error("the resume picker offered no tab-reachable profile");
    await press(lee);

    // Entering the app is a navigation: focus must arrive at the Today
    // heading, not stay parked in the wizard that just closed.
    const homeHeading = document.activeElement;
    expect(homeHeading?.tagName).toBe("H1");
    expect(homeHeading?.textContent).toContain("Hi Lee");

    // A profile with no language gets one useful next action and nothing
    // that only makes noise: no budget chips, no zero-count summary, and
    // the with-a-pack "nothing due" copy is not stacked under the notice.
    const home = document.querySelector('[aria-label="Practice"]');
    expect(home?.textContent).toContain("No language is set for this profile yet");
    expect(home?.querySelector('[aria-label="Time budget"]')).toBeNull();
    expect(home?.textContent).not.toContain("activities · about");
    expect(home?.textContent).not.toContain("Nothing is due right now");

    // Tab from where focus now sits (the heading) to the notice's button.
    // Recompute the stops: the page has been replaced underneath.
    const choose = tabStops().find((el) => el.textContent?.trim() === "Choose a language");
    if (!choose) throw new Error('"Choose a language" is not reachable by Tab from the heading');
    await press(choose);

    // The Settings route rendered, and the keyboard user was carried with
    // it: the destination heading holds focus.
    const afterChoose = document.activeElement;
    expect(afterChoose?.tagName).toBe("H1");
    expect(afterChoose?.textContent?.trim()).toBe("Language packs");
    expect(document.querySelector("#main h1")?.textContent?.trim()).toBe("Language packs");

    // One more hop through the route nav to prove the transition focus is
    // the route change itself, not a one-off.
    const practice = tabStops().find(
      (el) => el.textContent?.trim() === "Practice" && el.closest('nav[aria-label="Routes"]'),
    );
    if (!practice) throw new Error('the Routes nav has no tab-reachable "Practice" stop');
    await press(practice);
    const hubHeading = document.activeElement;
    expect(hubHeading?.tagName).toBe("H1");
    expect(hubHeading?.textContent?.trim()).toBe("Practice");
    expect(engine.appCalls().length).toBeGreaterThan(0);
  });
});
