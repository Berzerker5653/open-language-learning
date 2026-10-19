/**
 * U03 — a saved word reaches its first review through the ordinary UI.
 *
 * Before the fix, a word saved from a story or the panel carried no
 * schedule, `mine_due` honestly refused it, and the only grade action lived
 * inside a review card nothing ever opened: the word could never become
 * due. The engine owns both states — `mine_new` answers which saved words
 * were never scheduled, and the first `mine_grade` seeds the schedule — so
 * the journey drives the real panel: save → Review now → reveal →
 * self-grade → scheduled ahead (still NOT due) → the engine's own clock
 * makes it due → due review offers it. Nothing touches the database. The
 * harness mirrors lib.rs with one measured liberty: the fake's first grade
 * schedules ~150 ms ahead instead of days, so "scheduled ahead" and "later
 * due" are both observable inside the test.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("a saved word reaches its first review (U03)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("save → Review now → reveal → self-grade → later due → due review", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "sam", display_name: "Sam", active: JA }],
      installed: [JA],
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Sam"));
    await app.click(app.button(app.section("Routes"), "My Words"));

    // Save the word from the panel itself — the story-save leg is the same
    // engine command, covered by the Rust tests.
    const panel = app.section("My words");
    await app.type(panel.querySelector("#mine-surface") as HTMLInputElement, "ねこ");
    await app.type(panel.querySelector("#mine-gloss") as HTMLInputElement, "cat");
    await app.type(panel.querySelector("#mine-source") as HTMLInputElement, "A first day");
    await app.click(app.button(panel, "Add to my words"));

    // The row states the truth — unscheduled — and the panel offers the
    // engine-backed entry points, never a false "due".
    const list = app.section("My words");
    expect(list.textContent).toContain("not scheduled yet");
    expect(app.button(list, "Review now")).toBeTruthy();
    expect(app.button(list, "Review new words")).toBeTruthy();

    // The per-word action opens the same reveal + self-grade card the due
    // reviews use; grading stays the single `mine_grade` path.
    await app.click(app.button(list, "Review now"));
    const card = app.section("My words");
    expect(card.textContent).toContain("ねこ");
    await app.click(app.button(card, "Reveal"));
    expect(card.textContent).toContain("cat");
    await app.click(app.button(card, "I knew it"));

    // The first grade created a schedule: the row is scheduled, no longer
    // labeled unscheduled, and the grade went through mine_grade. The
    // per-word action needed no second engine read.
    const row = app.section("My words");
    expect(row.textContent).toContain("due");
    expect(row.textContent).not.toContain("not scheduled yet");
    expect(engine.lastArgsFor("mine_grade")?.itemId).toMatch(/^mine-/);
    expect(engine.argsFor("mine_new")).toBeUndefined();

    // Scheduled ahead, not due: the engine's `mine_due` still refuses it,
    // which is what "future schedule" means to this app.
    await app.click(app.button(row, "Review due words"));
    expect(app.section("My words").textContent).toContain("Nothing is due for review right now.");

    // The fake's first-grade schedule (~150 ms ahead) rolls past; the same
    // engine-owned due list now opens the card on its own.
    const later = Promise.withResolvers<void>();
    setTimeout(later.resolve, 250);
    await later.promise;
    await app.settle();
    await app.click(app.button(app.section("My words"), "Review due words"));
    expect(engine.lastArgsFor("mine_due")).toEqual({ profileId: "sam" });
    const again = app.section("My words");
    expect(again.textContent).toContain("ねこ");
    await app.click(app.button(again, "Reveal"));
    await app.click(app.button(again, "Again"));
    expect(app.section("My words").textContent).toContain("due");
  });
});
