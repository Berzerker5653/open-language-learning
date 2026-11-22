/**
 * Journey — attributed content confirmation (CONTENT-CONFIRM-001, ADR-0040)
 * on the READER-FLOW-001 paragraph reader, in its READING-CLUTTER-001 shape
 * (owner ruling 2026-11-21: no confirm control inside the prose).
 *
 * The only "checked by" mark this project will ever have: an explicit
 * click by the learner reading the text, attributed to their profile.
 * The mounted path pins what the static component test cannot: the story
 * body is one flowing paragraph of sentence spans with inline word
 * buttons and NO confirm control among them; one quiet story-level
 * control under the paragraph invokes `content_confirm`/`content_unconfirm`
 * for every sentence of the story; a word tap invokes `word_card` +
 * `story_word_audio` for the exact raw token and opens a card whose
 * confirmation invokes the same commands for the word's content id;
 * another learner's mark is visible but never retractable here; Mine stays
 * inside the card (manual Mine still works); a fixture with no word audio
 * renders no Play button rather than guessing; and no automatic action
 * adds a mark — the engine call list shows only the clicks the learner
 * made.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

describe("content confirmation on the paragraph reader (CONTENT-CONFIRM-001, READING-CLUTTER-001)", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("shows another learner's mark, confirms the story once, retracts only its own", async () => {
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
    const first = sentences[0] as HTMLElement;

    // READING-CLUTTER-001: the prose carries NO confirm control — the
    // assertion walks interactive elements, not body text (the
    // WEB-HISTORY-001 lesson: text can pass while the button is gone).
    const paragraphButtons = [
      ...(panel.querySelector(".reader-paragraph") as HTMLElement).querySelectorAll("button"),
    ];
    expect(paragraphButtons.some((b) => (b.textContent ?? "").includes("looks right"))).toBe(false);
    // Exactly one story-level control, riding under the paragraph.
    const storyToggles = [...panel.querySelectorAll("button.story-confirm-toggle")];
    expect(storyToggles.length).toBe(1);

    // Bruno's mark is visible before Dana touches anything, named as a
    // confirmation by a person — never a verified/expert claim.
    expect(panel.textContent).toContain("Confirmed by Bruno");
    expect(panel.textContent).not.toMatch(/verified|expert|reviewed/i);

    // One quiet click under the story confirms EVERY sentence of it —
    // the same content_confirm command, one per sentence, nothing else.
    await app.click(app.button(panel, "It sounds right"));
    const confId = (c: { args?: Record<string, unknown> }) =>
      String((c.args as { contentId?: string })?.contentId);
    expect(
      app.engine
        .appCalls()
        .filter((c) => c.cmd === "content_confirm")
        .map(confId),
    ).toEqual(["ja.sent.journeys.confirm.1", "ja.sent.journeys.confirm.2"]);

    // Both names now stand behind the story, and Dana can undo all of it
    // — but only her own marks are ever at stake.
    expect(panel.textContent).toContain("Confirmed by Bruno, Dana");
    await app.click(app.button(panel, "Undo"));
    expect(
      app.engine
        .appCalls()
        .filter((c) => c.cmd === "content_unconfirm")
        .map(confId),
    ).toEqual(["ja.sent.journeys.confirm.1", "ja.sent.journeys.confirm.2"]);
    expect(panel.textContent).toContain("Confirmed by Bruno");
    expect(panel.textContent).not.toContain("Confirmed by Bruno, Dana");

    // Word tap: the card opens at that exact token, wired through the
    // reader's two new commands.
    await app.click(app.button(first, "きょうしつ"));
    await app.settle();
    expect(app.engine.lastArgsFor("word_card")).toEqual({
      profileId: "dana",
      sentenceId: "ja.sent.journeys.confirm.1",
      // VOCAB-BUILDER-001 (merged): the reader carries the story it is
      // reading so the tap can log its encounter context.
      storyId: "ja.story.journeys.confirmation",
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
    // the clicks this learner made — the story confirm (one call per
    // sentence), the word-card confirm, and the story undo per marked
    // sentence.
    const confirmCalls = app.engine.appCalls().filter((c) => c.cmd === "content_confirm");
    const unconfirmCalls = app.engine.appCalls().filter((c) => c.cmd === "content_unconfirm");
    expect(confirmCalls).toHaveLength(3);
    expect(unconfirmCalls).toHaveLength(2);
    // The word-card confirm targeted only the word, and only Dana's own
    // marks were retracted.
    for (const c of [...confirmCalls, ...unconfirmCalls]) {
      expect((c.args as { profileId?: string }).profileId).toBe("dana");
    }
  });
});
