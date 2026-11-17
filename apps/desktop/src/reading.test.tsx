/**
 * CONTENT-CONFIRM-001 (ADR-0040) — component pin for the confirmation
 * surface in the graded-reading lookup panel. What must hold visually:
 * the explicit toggle exists for sentences and for looked-up words,
 * attribution renders as "Confirmed by <names>" from the view's own data,
 * the signed-in learner sees "Undo" only where their own mark stands, and
 * the panel never uses a verification/expertise/review claim (docs/18).
 * The mounted click-through (callbacks actually firing against the
 * engine) is pinned by src/journeys/content-confirm.journey.tsx.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { type ReadingPanelProps, type Story, ReadingPanel } from "./reading";

const STORY: Story = {
  id: "ja.story.test.confirm",
  title: "A quiet morning",
  status: "community",
  sentences: [
    {
      content_id: "ja.sent.test.one",
      text: "きょうしつ に ほん が おいてある",
      furigana: null,
      romaji: null,
      faded_by_mastery: false,
      gloss: "A book has been left in the classroom.",
      status: "community",
      known: [
        {
          id: "ja.lex.test.classroom",
          surface: "きょうしつ",
          reading: null,
          romaji: null,
          gloss: "classroom",
          status: "community",
        },
      ],
    },
  ],
  confirmations: {
    "ja.sent.test.one": [
      { display_name: "Ana", at: "2026-11-16T09:00:00Z" },
      { display_name: "Bruno", at: "2026-11-16T09:05:00Z" },
    ],
  },
};

function base(over: Partial<ReadingPanelProps>): ReadingPanelProps {
  const noop = () => {};
  return {
    storyList: [],
    storyActive: STORY,
    storyLookup: "ja.sent.test.one", // lookup open: the panel body renders
    storyError: null,
    profileName: "Carla",
    onOpenStory: noop,
    onBack: noop,
    onPlaySentence: noop,
    onToggleLookup: noop,
    onMine: noop,
    onConfirm: noop,
    onUnconfirm: noop,
    ...over,
  };
}

const render = (over: Partial<ReadingPanelProps> = {}) =>
  renderToStaticMarkup(<ReadingPanel {...base(over)} />);

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("content confirmation surface (CONTENT-CONFIRM-001)", () => {
  it("offers the explicit toggle for the sentence and for each looked-up word", () => {
    const html = render();
    // Sentence toggle sits with the gloss in the lookup; the word gets its
    // own beside "Mine". Two items, two toggles; Ana's mark never turns a
    // stranger's button into "Undo".
    expect(count(html, "This looks right")).toBe(2);
    expect(html).toContain(">Mine</button>");
    expect(html).not.toContain(">Undo</button>");
  });

  it("renders attribution as plain names, oldest mark first", () => {
    expect(render()).toContain("Confirmed by Ana, Bruno");
  });

  it("shows Undo only where the signed-in learner's own mark stands", () => {
    const html = render({ profileName: "Ana" });
    expect(html).toContain(">Undo</button>");
    // The word row carries no mark from Ana — that toggle is still explicit.
    expect(count(html, "This looks right")).toBe(1);
  });

  it("shows no attribution line where nobody has confirmed", () => {
    const html = render({
      profileName: "Carla",
      storyActive: { ...STORY, confirmations: {} },
    });
    expect(html).not.toContain("Confirmed by");
    expect(count(html, "This looks right")).toBe(2);
  });

  it("never claims verification, expertise, or review (docs/18)", () => {
    expect(render({ profileName: "Ana" })).not.toMatch(/verif|expert|review/i);
  });

  it("shows sentence attribution even with no lookup open", () => {
    // Attribution rides the sentence row always; only the toggle lives in
    // the lookup. A learner browsing without opening anything still sees
    // who stood behind each sentence.
    const html = render({ storyLookup: null });
    expect(html).toContain("Confirmed by Ana, Bruno");
    expect(count(html, "This looks right")).toBe(0);
  });
});
