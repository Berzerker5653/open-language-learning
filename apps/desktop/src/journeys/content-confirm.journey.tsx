/**
 * Journey — attributed content confirmation (CONTENT-CONFIRM-001, ADR-0040)
 * on the READER-FLOW-001 paragraph reader.
 *
 * The only "checked by" mark this project will ever have: an explicit
 * click by the learner reading the text, attributed to their profile.
 * The mounted path pins what the static component test cannot: the story
 * body is one flowing paragraph of sentence spans with inline word
 * buttons; the quiet sentence-tail toggle invokes
 * `content_confirm`/`content_unconfirm` for the right content id; a word
 * tap invokes `word_card` + `story_word_audio` for the exact raw token and
 * opens a card whose confirmation invokes the same commands for the
 * word's content id; another learner's mark is visible but never
 * retractable here; Mine stays inside the card (manual Mine still works);
 * a fixture with no word audio renders no Play button rather than
 * guessing; and no automatic action adds a mark — the engine call list
 * shows only the clicks the learner made.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("content confirmation on the paragraph reader (CONTENT-CONFIRM-001, READER-FLOW-001)", () => {
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

    // The body is a flowing paragraph of sentence spans, not a column of
    // sentence buttons: the words themselves are the clickable controls.
    expect(panel.querySelectorAll(".reader-paragraph").length).toBe(1);
    const sentences = [...panel.querySelectorAll(".sentence")];
    expect(sentences.length).toBe(2);

    // Bruno's mark is visible on the sentence before Dana touches anything,
    // named as a confirmation by a person — never a verified/expert claim.
    expect(panel.textContent).toContain("Confirmed by Bruno");
    expect(panel.textContent).not.toMatch(/verified|expert|reviewed/i);

    // The quiet tail control offers Dana her own explicit action, without
    // opening anything.
    const first = sentences[0] as HTMLElement;
    await app.click(app.button(first, "This looks right"));
    expect(app.engine.lastArgsFor("content_confirm")).toEqual({
      profileId: "dana",
      contentId: "ja.sent.journeys.confirm.1",
    });

    // Both names now stand behind the sentence, oldest first, and Dana can
    // undo — but only her own mark is ever at stake.
    expect(panel.textContent).toContain("Confirmed by Bruno, Dana");
    await app.click(app.button(first, "Undo"));
    expect(app.engine.lastArgsFor("content_unconfirm")).toEqual({
      profileId: "dana",
      contentId: "ja.sent.journeys.confirm.1",
    });
    expect(panel.textContent).toContain("Confirmed by Bruno");
    expect(panel.textContent).not.toContain("Confirmed by Bruno, Dana");

    // Word tap: the card opens at that exact token, wired through the
    // reader's two new commands.
    await app.click(app.button(first, "きょうしつ"));
    await app.settle();
    expect(app.engine.lastArgsFor("word_card")).toEqual({
      profileId: "dana",
      sentenceId: "ja.sent.journeys.confirm.1",
      token: "きょうしつ",
    });
    expect(app.engine.lastArgsFor("story_word_audio")).toEqual({
      profileId: "dana",
      sentenceId: "ja.sent.journeys.confirm.1",
      token: "きょうしつ",
    });
    const card = app.section("Word card");
    expect(card.textContent).toContain("classroom");
    // The fixture story ships no media at all: no Play button rather than
    // guessed audio, and the word tap never reached sentence audio either.
    const cardButtons = [...card.querySelectorAll("button")].map(
      (b) => b.textContent?.trim() ?? "",
    );
    expect(cardButtons).not.toContain("Play");
    expect(app.engine.appCalls().filter((c) => c.cmd === "story_audio")).toHaveLength(0);

    // The looked-up word gets the same explicit treatment, from scratch.
    await app.click(app.button(card, "This looks right"));
    expect(app.engine.lastArgsFor("content_confirm")).toMatchObject({
      profileId: "dana",
      contentId: "ja.lex.journeys.classroom",
    });
    expect(card.textContent).toContain("Confirmed by Dana");

    // Mine stays inside the word card (manual Mine still works), cited to
    // the story the learner was reading.
    await app.click(app.button(card, "Mine"));
    await app.settle();
    expect(app.engine.lastArgsFor("mine_add")).toMatchObject({
      surface: "きょうしつ",
      gloss: "classroom",
      sourceCitation: "ja.story.journeys.confirmation",
    });

    // An off-pack word gets the honest card: no invented gloss, and no
    // per-word confirm control (there is no content id to attribute).
    await app.click(app.button(first, "ほん"));
    const offCard = app.section("Word card");
    expect(offCard.textContent).toContain("not in your pack yet");
    expect(offCard.textContent).not.toContain("classroom");
    const offButtons = [...offCard.querySelectorAll("button")].map(
      (b) => b.textContent?.trim() ?? "",
    );
    expect(offButtons).toContain("Mine");
    expect(offButtons).not.toContain("This looks right");
    await app.click(app.button(offCard, "Close"));
    expect(() => app.section("Word card")).toThrow();

    // Nothing confirmed anything automatically: the engine heard exactly
    // the clicks this learner made — two confirms, one unconfirm.
    const confirmCalls = app.engine.appCalls().filter((c) => c.cmd === "content_confirm");
    const unconfirmCalls = app.engine.appCalls().filter((c) => c.cmd === "content_unconfirm");
    expect(confirmCalls).toHaveLength(2);
    expect(unconfirmCalls).toHaveLength(1);
  });
});
