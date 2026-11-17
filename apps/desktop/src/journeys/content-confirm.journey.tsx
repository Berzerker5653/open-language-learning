/**
 * Journey — attributed content confirmation (CONTENT-CONFIRM-001, ADR-0040).
 *
 * The only "checked by" mark this project will ever have: an explicit
 * click by the learner reading the text, attributed to their profile.
 * The mounted path pins what the static component test cannot: the
 * toggle actually invokes `content_confirm`/`content_unconfirm` for the
 * right content id, the answer's attribution is spliced back into the
 * open view, another learner's mark is visible but never retractable
 * here, and no automatic action adds a mark — the engine call list shows
 * only the clicks the learner made.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("content confirmation (CONTENT-CONFIRM-001)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("shows another learner's mark, confirms once, and retracts only its own", async () => {
    app = await mountApp(
      new LearnerEngine({
        profiles: [
          { id: "bruno", display_name: "Bruno", active: JA },
          { id: "dana", display_name: "Dana", active: JA },
        ],
        installed: [JA],
        confirmations: [
          {
            profileId: "bruno",
            packId: JA,
            contentId: "ja.sent.journeys.confirm.1",
            at: "2026-11-16T09:00:00Z",
          },
        ],
      }),
    );
    await app.click(app.button(app.section("Profiles"), "Dana"));

    await app.click(app.button(app.section("Routes"), "Practice"));
    await app.click(app.button(app.section("Practice modes"), "Reading"));
    const panel = app.section("Graded reading");
    await app.click(app.button(panel, "A quiet morning"));
    await app.settle();

    // Bruno's mark is visible on the sentence before Dana touches anything,
    // named as a confirmation by a person — never a verified/expert claim.
    expect(panel.textContent).toContain("Confirmed by Bruno");
    expect(panel.textContent).not.toMatch(/verified|expert|reviewed/i);

    // Opening the lookup offers Dana her own explicit action.
    await app.click(app.button(panel, "きょうしつ に ほん が おいてある"));
    await app.settle();
    const lookup = app.section("Word lookup");
    await app.click(app.button(lookup, "This looks right"));
    await app.settle();
    expect(app.engine.lastArgsFor("content_confirm")).toEqual({
      profileId: "dana",
      contentId: "ja.sent.journeys.confirm.1",
    });

    // Both names now stand behind the sentence, oldest first, and Dana can
    // undo — but only her own mark is ever at stake.
    expect(panel.textContent).toContain("Confirmed by Bruno, Dana");
    await app.click(app.button(app.section("Word lookup"), "Undo"));
    await app.settle();
    expect(app.engine.lastArgsFor("content_unconfirm")).toEqual({
      profileId: "dana",
      contentId: "ja.sent.journeys.confirm.1",
    });
    expect(panel.textContent).toContain("Confirmed by Bruno");
    expect(panel.textContent).not.toContain("Confirmed by Bruno, Dana");

    // The looked-up word gets the same explicit treatment, from scratch.
    const wordRow = [...lookup.querySelectorAll("li")].find((li) =>
      (li.textContent ?? "").includes("classroom"),
    );
    if (!wordRow) throw new Error("the lookup rendered no classroom word");
    await app.click(app.button(wordRow, "This looks right"));
    await app.settle();
    expect(app.engine.lastArgsFor("content_confirm")).toMatchObject({
      profileId: "dana",
      contentId: "ja.lex.journeys.classroom",
    });
    expect(wordRow.textContent).toContain("Confirmed by Dana");

    // Nothing confirmed anything automatically: the engine heard exactly
    // the clicks this learner made — two confirms, one unconfirm.
    const confirmCalls = app.engine.appCalls().filter((c) => c.cmd === "content_confirm");
    const unconfirmCalls = app.engine.appCalls().filter((c) => c.cmd === "content_unconfirm");
    expect(confirmCalls).toHaveLength(2);
    expect(unconfirmCalls).toHaveLength(1);
  });
});
