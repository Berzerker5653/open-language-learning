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

  it("names both versions when the catalogue lists a different one, and offers review", () => {
    const html = renderToStaticMarkup(
      <PracticeHub
        onOpen={open}
        updates={[
          {
            pack_id: "org.openlanguage.ja-demo",
            display_name: "Japanese",
            installed_version: "0.4.0",
            available_version: "0.4.1",
          },
        ]}
        onOpenLanguagePacks={open}
      />,
    );
    expect(html).toContain("Japanese");
    expect(html).toContain("version 0.4.0 is on this device.");
    expect(html).toContain("The pack catalogue lists version 0.4.1.");
    expect(html).toContain("Review pack updates");
    // The app may be packaged against a newer pack than the catalogue
    // lists, so the copy names both versions and claims no ordering.
    expect(html).not.toMatch(/newer|latest|out of date|up to date/i);
  });
});
