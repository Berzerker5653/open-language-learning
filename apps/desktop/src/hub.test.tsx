// I03 UI contract: hub cards promise only what their screens do, and a mode
// the active pack cannot run is not offered at all.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticeHub } from "./hub";

const open = () => undefined;

describe("PracticeHub", () => {
  it("describes Speaking as read-aloud recognition, never as listening and typing", () => {
    const html = renderToStaticMarkup(<PracticeHub onOpen={open} />);
    expect(html).toContain("Read a sentence aloud");
    expect(html).not.toContain("Listen and type");
  });

  it("describes Writing as the check it actually runs", () => {
    const html = renderToStaticMarkup(<PracticeHub onOpen={open} />);
    expect(html).toContain("a miss shows the form it expected");
    expect(html).not.toContain("get corrections");
  });

  it("offers Kanji only when the active pack has kanji to drill", () => {
    const withKanji = renderToStaticMarkup(<PracticeHub onOpen={open} kanjiAvailable />);
    const withoutKanji = renderToStaticMarkup(<PracticeHub onOpen={open} kanjiAvailable={false} />);
    expect(withKanji).toContain("Kanji");
    expect(withoutKanji).not.toContain(">Kanji<");
    // Everything a pack can run stays available.
    expect(withoutKanji).toContain("Scenarios");
    expect(withoutKanji).toContain("Placement");
  });
});
