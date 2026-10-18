/**
 * The kanji drill states which case a card's element list is in, instead of
 * joining the glyphs and leaving the learner to guess what the list means.
 *
 * The three characters opened here are the three shapes the shipped ja-JP pack
 * contains: a list of elements that are parts (祖母), a character listed as its
 * own only element (一), and a list that is only the strokes it is written with
 * (八 -> ハ). The characters and their element lists are pack data; the
 * sentences are app copy. Both are asserted exactly, so a change to either half
 * fails here rather than in someone reading the render afterwards.
 */
import { afterEach, describe, expect, it } from "vitest";
import { JA, LearnerEngine, mountApp, type Mounted } from "./harness";

/** Mount a learner with the Japanese pack and open one character's drill. */
async function openDrill(character: string): Promise<Mounted> {
  const app = await mountApp(
    new LearnerEngine({
      profiles: [{ id: "dana", display_name: "Dana", active: JA, events: 7 }],
      installed: [JA],
    }),
  );
  await app.click(app.button(app.section("Profiles"), "Dana"));
  await app.click(app.button(app.section("Routes"), "Practice"));
  await app.click(app.button(app.section("Practice modes"), "Kanji"));
  await app.click(app.button(app.section("Kanji"), character));
  return app;
}

describe("the kanji drill states the rule behind each element list", () => {
  let app: Mounted;

  afterEach(async () => {
    await app?.unmount();
  });

  it("frames an element list as a decomposition that may nest", async () => {
    app = await openDrill("祖母");
    const line = app.text('[aria-label="Kanji"] .field small');
    expect(line).toContain(
      "Made of these elements, which can overlap or sit inside one another.",
    );
    expect(line).toContain("女 + 亻 + 木");
    expect(line).not.toContain("no smaller parts");
  });

  it("suppresses a list that only repeats the character, with a reason", async () => {
    app = await openDrill("一");
    const line = app.text('[aria-label="Kanji"] .field small');
    expect(line).toContain(
      "Learned as a whole character — this pack lists no smaller parts for it.",
    );
    // Nothing is joined: the only element available to join is the character.
    expect(line).not.toContain("+");
  });

  it("suppresses a list of writing strokes, with a reason", async () => {
    app = await openDrill("八");
    const line = app.text('[aria-label="Kanji"] .field small');
    expect(line).toContain(
      "Written with strokes — this character is not built from separate parts.",
    );
    expect(line).not.toContain("+");
    // The stroke is not presented as a part the learner should memorise.
    expect(line).not.toContain("ハ");
  });
});
