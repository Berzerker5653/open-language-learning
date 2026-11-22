/**
 * Journey — the never-lost loop (PATH-WHATSNEXT-001, phase 2 of
 * PROGRESS-PATH-DESIGN-001.md; the Codemm rule).
 *
 * The owner dogfood trigger: finish a short session and have no idea what
 * to do next. The engine answers with EXACTLY ONE offer — a due review
 * first, otherwise the next ready unit — and every surface shows the same
 * answer: the Today strip, the after-session card, and the path scrolled
 * (pinned) to the offered node. This journey walks a real session to its
 * end and pins the contract:
 *   1. Today carries one "Next: ..." offer line (no due rows in the fixture
 *      world, so it honestly answers "new material", review-introducing);
 *   2. the path renders the offered unit's node (the scroll target exists);
 *   3. the after-session card names the SAME offer — one answer, never two;
 *   4. no review-due chip while nothing is due (the chip is earned, not
 *      decorative).
 * The review-first flip itself is pinned engine-side (Rust test
 * current_offer_flips_to_review_first_when_a_review_is_due) and measured on
 * the REAL engine in scripts/whatsnext-capture.mjs — the fake world carries
 * no due scheduler rows and never pretends otherwise.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

async function doActivity(app: Mounted, gloss: string): Promise<void> {
  const lesson = document.querySelector('[aria-label="Lesson"]');
  if (lesson) await app.click(app.button(lesson as HTMLElement, "Start practicing"));
  await app.click(app.button(app.section("Choices"), gloss));
  expect(app.text('[aria-label="Practice"] [aria-live="polite"]')).toBe("Correct");
}

function offerStrip(): string {
  const el = document.querySelector('[data-testid="next-offer"]');
  if (!el) throw new Error('no [data-testid="next-offer"] strip on the Today route');
  return (el.textContent ?? "").trim();
}

describe("never-lost loop (PATH-WHATSNEXT-001)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("offers exactly one next step, and the after-session card names it", async () => {
    app = await mountApp(
      new LearnerEngine({
        profiles: [{ id: "dana", display_name: "Dana", active: JA }],
        installed: [JA],
      }),
    );
    await app.click(app.button(app.section("Profiles"), "Dana"));
    await app.settle();

    // 1. One offer line, and it is the "what, roughly how long" sentence.
    const strip = offerStrip();
    expect(strip).toMatch(/^Next: /);
    expect(strip).toMatch(/about \d+ minutes/);
    // Nothing is due in this fixture world, so the honest answer is the
    // next new-material unit — never a fabricated review nag.
    expect(strip).toContain("new material");
    expect(strip).toContain("greetings unit");

    // 4. No due rows: no review-due chip.
    expect(document.querySelector('[data-testid="review-due-chip"]')).toBeNull();

    // 2. The offered unit's node is in the path — the scroll/pin target
    // (suffix match: the unit id is pack-namespaced by both mirrors).
    expect(document.querySelector('[data-unit$=".unit.greetings"]')).toBeTruthy();

    // Walk the session to its honest end (same shape as session.journey).
    await app.click(app.button(app.section("Practice"), "Start today's plan"));
    await app.settle();
    await doActivity(app, "how do you do (first meeting)");
    await app.click(app.button(app.section("Practice"), "Continue to next activity"));
    await new Promise((r) => setTimeout(r, 1500));
    await app.settle();
    await doActivity(app, "grandmother");
    await app.click(app.button(app.section("Practice"), "Finish session"));
    await app.settle();

    // 3. The after-session card answers the question the owner asked — and
    // it is the SAME single answer the strip showed.
    const summary = app.section("Session summary");
    const card = summary.querySelector('[data-testid="next-offer-card"]');
    if (!card) throw new Error('the after-session card shows no [data-testid="next-offer-card"]');
    const after = (card.textContent ?? "").trim();
    expect(after).toBe(strip);
    // The path is still there, node for the offered unit included.
    expect(document.querySelector('[data-unit$=".unit.greetings"]')).toBeTruthy();
  });
});
