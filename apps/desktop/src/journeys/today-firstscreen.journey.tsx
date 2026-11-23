/**
 * Journey — the first screen IS the path (TODAY-FIRSTSCREEN-001).
 *
 * Owner dogfood 2026-11-23: the Today screen opened on meta and the start
 * button was somewhere mid-page, so the learner hunted for the action
 * instead of seeing it on the node they are standing on. The market rule
 * (docs/design/PROGRESSION-UX-AUDIT-2026-11-22.md § MARKET NAVIGATION
 * RULES): open at the frontier, ONE start pill anchored to that node,
 * one tap from app-open to the first question. This journey pins the App
 * wiring the static component tests cannot see:
 *   1. a fresh learner's path carries exactly one start pill, and it
 *      rides the pinned frontier node's row;
 *   2. the pill is the ONLY plan CTA — the old mid-page begin block is
 *      not rendered beside it (moved, never duplicated);
 *   3. one click on the pill lands on the practice surface (the lesson
 *      card or the drill choices) — the whatsnext CTA semantics ride
 *      unchanged, only its anchor moved.
 * The 390x844 first-viewport geometry itself is measured on the real
 * engine by scripts/firstscreen-capture.mjs (evidence).
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("first screen is the path, start pill on the pin (TODAY-FIRSTSCREEN-001)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("opens a fresh learner on the pill riding the frontier pin, one tap from practice", async () => {
    app = await mountApp(
      new LearnerEngine({
        profiles: [{ id: "walker", display_name: "Walker", active: JA }],
        installed: [JA],
      }),
    );
    await app.click(app.button(app.section("Profiles"), "Walker"));
    await app.settle();

    // 1. Exactly one pill, and it lives in the pinned node's row.
    const pills = [...document.querySelectorAll('[data-testid="path-start-pill"]')];
    expect(pills).toHaveLength(1);
    const pill = pills[0] as HTMLElement;
    const row = pill.closest("li[data-unit]");
    expect(row, "the pill rides a path node row").not.toBeNull();
    expect(
      row!.querySelector('[data-testid="path-pin"]'),
      "the pill rides the PINNED node, not any node",
    ).not.toBeNull();

    // 2. The pill is the only plan CTA — the begin block moved onto it.
    const planCtas = [...document.querySelectorAll("button")].filter((b) =>
      (b.textContent ?? "").includes("Start ·"),
    );
    expect(planCtas).toHaveLength(1);
    expect(planCtas[0]).toBe(pill);

    // 3. One click on the pill lands on the practice surface.
    await app.click(pill);
    await app.settle();
    const inPractice =
      Boolean(document.querySelector('[aria-label="Lesson"]')) ||
      Boolean(document.querySelector('[aria-label="Choices"] button'));
    expect(inPractice, "one tap from the pill into the first activity").toBe(true);
  });
});
