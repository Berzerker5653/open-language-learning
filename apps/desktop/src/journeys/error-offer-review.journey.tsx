/**
 * FIX-ERR-SRS-LOOP-001-2 (D3) — the learner-facing error loop end to end:
 * a writing miss carries an explicit per-form review OFFER; nothing is
 * scheduled until the learner clicks accept (never silent — the engine
 * fake refuses to create a card for any ledger id the app has not
 * accepted); the accepted card reaches the "Form reviews" drill queue on
 * the My Words tab and self-grades there through `error_review_grade`.
 *
 * The harness mirrors lib.rs with the same measured liberty the my-words
 * journey uses: the fake's accept schedules ~150 ms ahead instead of days,
 * so "scheduled ahead" and "now due" are both observable inside the test.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("an error offer becomes a review card only on accept (D3)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("miss → offer → accept → queue drill → self-grade, with no silent accept", async () => {
    const engine = new LearnerEngine({
      profiles: [{ id: "sam", display_name: "Sam", active: JA }],
      installed: [JA],
      errorOffer: {
        expected: "読みました",
        produced: "読みます",
        lemma: "読む",
        error_class: "aspect",
        context_sentence_id: "ja.sent.demo",
      },
    });
    app = await mountApp(engine);
    await app.click(app.button(app.section("Profiles"), "Sam"));
    await app.click(app.button(app.section("Routes"), "Practice"));
    await app.click(app.button(app.section("Practice modes"), "Writing"));

    const practice = app.section("Writing practice");
    await app.type(practice.querySelector("#writing-answer") as HTMLInputElement, "読みます");
    await app.click(app.button(practice, "Check"));

    // The graded miss shows the expected form AND the explicit offer.
    const view = app.section("Writing practice");
    expect(view.textContent).toContain("The form this task asked for");
    expect(view.textContent).toContain("to my review list");
    // Never silent: the verdict alone accepted nothing — the only accept
    // call site is the button, which has not been clicked.
    expect(engine.calls.filter((c) => c.cmd === "error_review_accept")).toHaveLength(0);

    const accept = view.querySelector('[data-testid="error-offer-accept-err-fake-1"]');
    if (!accept) throw new Error("the offer rendered without its accept affordance");
    await app.click(accept as HTMLButtonElement);

    // One deliberate click, one card — and the view says so.
    expect(engine.calls.filter((c) => c.cmd === "error_review_accept")).toHaveLength(1);
    expect(engine.lastArgsFor("error_review_accept")).toEqual({
      profileId: "sam",
      ledgerId: "err-fake-1",
    });
    expect(app.section("Writing practice").textContent).toContain("Added to your review list");

    // The fake's accept schedules 150 ms out; once due, the drill queue
    // reached from My Words carries the accepted card.
    const later = Promise.withResolvers<void>();
    setTimeout(later.resolve, 250);
    await later.promise;
    await app.settle();
    await app.click(app.button(app.section("Routes"), "My Words"));

    const reviews = app.section("Form reviews");
    // The list names the word by lemma only — the drilled form is not
    // spoiled before the learner tries.
    expect(reviews.textContent).toContain("読む");
    expect(reviews.textContent).not.toContain("読みました");
    await app.click(app.button(reviews, "Review due forms"));

    const drill = app.section("Form reviews");
    // The exact form replays IN its context sentence, revealed on demand.
    expect(drill.textContent).toContain("контекст ja.sent.demo");
    expect(drill.textContent).not.toContain("読みました");
    await app.click(app.button(drill, "Reveal"));
    expect(drill.textContent).toContain("The form to own");
    expect(drill.textContent).toContain("読みました");
    await app.click(app.button(drill, "I knew it"));

    expect(engine.calls.filter((c) => c.cmd === "error_review_grade")).toHaveLength(1);
    expect(engine.lastArgsFor("error_review_grade")?.cardId).toBe("errcard-err-fake-1");
  });
});
