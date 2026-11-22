/**
 * READER-FLOW-001 — component pin for the continuous paragraph reader,
 * carrying the CONTENT-CONFIRM-001 (ADR-0040) confirmation surface and the
 * GRAMMAR-LABELS-001 interlinear contract into the new structure.
 *
 * What must hold visually: the story body is ONE flowing paragraph of
 * sentence spans with inline word buttons (never a button column); the word
 * card renders gloss, pack status, the lemma line when resolved, Mine, and a
 * Play button ONLY when word audio exists (off-pack words get the honest
 * "not in your pack yet" line, never an invented gloss); READING-CLUTTER-001
 * (owner ruling 2026-11-21): the confirm surface has LEFT the prose — one
 * quiet story-level control under the paragraph, plus the word card's own
 * toggle; attribution renders as "Confirmed by <names>", only the signed-in
 * learner's own mark turns into "Undo", and the panel never uses a
 * verification/expertise/review claim (docs/18). Grammar labels never
 * render inline in the paragraph (raw tags are internal notation); the
 * human-form grammar line rides the word card and obeys the global toggle.
 * The mounted click-through (callbacks firing against the engine, the
 * word_card/story_word_audio wire) is pinned by
 * src/journeys/content-confirm.journey.tsx.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ReadingPanel,
  expandGrammarLabel,
  normToken,
  type ReadingPanelProps,
  type Story,
  type WordCardView,
} from "./reading";

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
      labels: [],
    },
  ],
  confirmations: {
    "ja.sent.test.one": [
      { display_name: "Ana", at: "2026-11-16T09:00:00Z" },
      { display_name: "Bruno", at: "2026-11-16T09:05:00Z" },
    ],
  },
};

/** The `word_card` answer for the classroom word, in the wire shape. */
const CLASSROOM_CARD: WordCardView = {
  query: "きょうしつ",
  lemma: null,
  surface: "きょうしつ",
  reading: null,
  gloss: "classroom",
  status: "community",
  in_pack: true,
  aux_word: null,
  aux_gloss: null,
  aux_pos: null,
  aux_source: null,
  in_review: false,
};

function base(over: Partial<ReadingPanelProps>): ReadingPanelProps {
  const noop = () => {};
  return {
    storyList: [],
    storyActive: STORY,
    storyError: null,
    profileName: "Carla",
    grammarLabels: true,
    wordCard: null,
    wordAudioAvailable: false,
    onOpenStory: noop,
    onBack: noop,
    onPlaySentence: noop,
    onWordTap: noop,
    onWordPlay: noop,
    onWordClose: noop,
    onMine: noop,
    onConfirm: noop,
    onUnconfirm: noop,
    ...over,
  };
}

const render = (over: Partial<ReadingPanelProps> = {}) =>
  renderToStaticMarkup(<ReadingPanel {...base(over)} />);

/** The card open at a tapped token of the ja test story. */
const withCard = (
  token: string,
  card: WordCardView | null,
  over: Partial<ReadingPanelProps> = {},
) =>
  render({
    wordCard: { sentenceId: "ja.sent.test.one", token, card },
    ...over,
  });

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("paragraph reader structure (READER-FLOW-001)", () => {
  it("renders the story body as one flowing paragraph, not a button column", () => {
    const html = render();
    expect(count(html, 'class="reader-paragraph"')).toBe(1);
    expect(count(html, 'class="sentence"')).toBe(1);
    // Every whitespace token is an inline word button, whitespace-joined.
    expect(count(html, 'class="word"')).toBe(5);
    expect(html).toContain('</button> <button type="button" class="word">');
  });

  it("content-confirm has left the prose: one quiet control under the story (READING-CLUTTER-001)", () => {
    const html = render();
    // The sentence span is a plain span (its non-word area plays audio);
    // NOTHING confirmable rides inside the paragraph anymore.
    expect(html).toContain('<span class="sentence">');
    expect(html).not.toContain("sentence-tail");
    const paragraph = html.slice(html.indexOf('class="reader-paragraph"'));
    expect(paragraph.slice(0, paragraph.indexOf("story-confirm"))).not.toContain("looks right");
    // Exactly one story-level control, carrying the quiet question copy.
    expect(count(html, 'class="btn btn--quiet story-confirm-toggle"')).toBe(1);
    expect(html).toContain("Did this story sound right?");
    expect(html).toContain("It sounds right");
  });

  it("the card opens at the tapped word with gloss, pack status, and Mine", () => {
    const html = withCard("きょうしつ", CLASSROOM_CARD);
    expect(html).toContain('aria-label="Word card"');
    expect(html).toContain(">Mine</button>");
    expect(html).toContain("classroom");
    expect(html).toContain("in your pack");
    // The tapped token's word button carries the active marker.
    expect(html).toContain('class="word word--active"');
  });

  it("an off-pack token gets the honest card — no invented gloss, Mine still offered", () => {
    const html = withCard("ほん", {
      query: "ほん",
      lemma: null,
      surface: null,
      reading: null,
      gloss: null,
      status: null,
      in_pack: false,
      aux_word: null,
      aux_gloss: null,
      aux_pos: null,
      aux_source: null,
      in_review: false,
    });
    expect(html).toContain("not in your pack yet");
    expect(html).toContain(">Mine</button>");
    // The tapped headword falls back to the raw token; no pack fields leak
    // (the sentence gloss rides the tail, not the card).
    expect(html).toContain(">ほん<");
    expect(html).not.toContain(">classroom<");
    expect(html).not.toContain(">in your pack");
  });

  it("an off-pack token the offline aux lexicon covers gets the clearly labeled aux card", () => {
    const html = withCard("подарка", {
      query: "подарка",
      lemma: null,
      surface: null,
      reading: null,
      gloss: null,
      status: null,
      in_pack: false,
      aux_word: "подарок",
      aux_gloss: "present, gift",
      aux_pos: "noun",
      aux_source: "Definitions from Wiktionary via kaikki.org (CC BY-SA / GFDL)",
      in_review: false,
    });
    // The aux answer is shown, labeled, and carries the EXACT
    // contract-pinned attribution string (ShareAlike; pinned in
    // state/notes/READER-FLOW-001.md OFF-PACK SLICE addendum).
    expect(html).toContain("present, gift");
    expect(html).toContain("auxiliary dictionary");
    expect(html).toContain("Definitions from Wiktionary via kaikki.org (CC BY-SA / GFDL)");
    expect(html).toContain(">подарок<");
    // Mine stays offered; the card never claims pack membership.
    expect(html).toContain(">Mine</button>");
    expect(html).not.toContain("in your pack (");
  });

  it("the card shows the lemma line only when the engine resolved one", () => {
    const withLemma = withCard("хлеба", {
      query: "хлеба",
      lemma: "хлеб",
      surface: "хле́ба",
      reading: null,
      gloss: "bread (some)",
      status: "draft",
      in_pack: true,
      aux_word: null,
      aux_gloss: null,
      aux_pos: null,
      aux_source: null,
      in_review: false,
    });
    expect(withLemma).toContain("dictionary form:");
    expect(withLemma).toContain(">хлеб<");
    const withoutLemma = withCard("きょうしつ", CLASSROOM_CARD);
    expect(withoutLemma).not.toContain("dictionary form:");
  });

  it("the Play button renders only when word audio actually exists", () => {
    const noAudio = withCard("きょうしつ", CLASSROOM_CARD);
    expect(noAudio).not.toContain(">Play</button>");
    const audio = withCard("きょうしつ", CLASSROOM_CARD, { wordAudioAvailable: true });
    expect(audio).toContain(">Play</button>");
  });

  it("normToken mirrors the wire contract: acute stripped, cased lowered, edges cut", () => {
    expect(normToken("хле́ба,")).toBe("хлеба");
    expect(normToken("(Добрый!)")).toBe("добрый");
  });
});

describe("content confirmation surface (CONTENT-CONFIRM-001, READING-CLUTTER-001 shape)", () => {
  it("offers one story-level control plus the word card's own toggle", () => {
    // The story toggle rides UNDER the paragraph; the word card carries
    // its own. Ana's/Bruno's marks never turn Carla's stranger button into
    // "Undo".
    const html = withCard("きょうしつ", CLASSROOM_CARD);
    expect(count(html, "This looks right")).toBe(1); // word card only
    expect(html).toContain("It sounds right");
    expect(html).not.toContain(">Undo</button>");
  });

  it("renders attribution as plain names, oldest mark first", () => {
    expect(render()).toContain("Confirmed by Ana, Bruno");
  });

  it("shows Undo only where the signed-in learner's own mark stands", () => {
    const html = withCard("きょうしつ", CLASSROOM_CARD, { profileName: "Ana" });
    // Ana's sentence mark surfaces as the story control's Undo.
    expect(count(html, ">Undo</button>")).toBe(1);
    // The word row carries no mark from Ana — that toggle is still explicit.
    expect(count(html, "This looks right")).toBe(1);
  });

  it("shows no attribution line where nobody has confirmed", () => {
    const html = withCard("きょうしつ", CLASSROOM_CARD, {
      profileName: "Carla",
      storyActive: { ...STORY, confirmations: {} },
    });
    expect(html).not.toContain("Confirmed by");
    expect(count(html, "This looks right")).toBe(1);
    expect(html).toContain("It sounds right");
  });

  it("never claims verification, expertise, or review (docs/18)", () => {
    expect(withCard("きょうしつ", CLASSROOM_CARD, { profileName: "Ana" })).not.toMatch(
      /verif|expert|review/i,
    );
  });

  it("shows story attribution with no word card open", () => {
    // A learner browsing without tapping anything still sees who stood
    // behind the story and can confirm it without opening a card.
    const html = render();
    expect(html).toContain("Confirmed by Ana, Bruno");
    expect(count(html, "This looks right")).toBe(0);
    expect(count(html, "story-confirm-toggle")).toBe(1);
  });
});

/* GRAMMAR-LABELS-001 carried into READING-CLUTTER-001: the pack's label
 * sidecar never renders inline in the paragraph (raw tags like `nom.sg`
 * are internal notation, not learner UI); the human-form grammar line
 * rides the word card and obeys the global show/hide toggle. Data and
 * sidecar shape are unchanged. */
describe("grammar lives in the word card, not the story flow (READING-CLUTTER-001)", () => {
  const RU_SENT = "ru.sent.test.labels";
  const RU: Story = {
    id: "ru.story.test.labels",
    title: "Хлеб",
    status: "draft",
    sentences: [
      {
        content_id: RU_SENT,
        text: "Он купил хлеба вчера",
        furigana: null,
        romaji: null,
        faded_by_mastery: false,
        gloss: "He bought some bread yesterday.",
        status: "draft",
        known: [],
        labels: [
          { token: "Он", label: "nom.sg" },
          { token: "купил", label: "perf.past" },
          { token: "хлеба", label: "gen.sg" },
        ],
      },
    ],
  };
  const ru = (over: Partial<ReadingPanelProps> = {}) => render({ storyActive: RU, ...over });
  const ruCard = (token: string) => ru({ wordCard: { sentenceId: RU_SENT, token, card: null } });

  it("a labeled story renders bare word buttons — no raw tags anywhere in the flow", () => {
    const html = ru();
    // The sentence's three sidecar labels change NOTHING in the flow:
    // the same four plain word buttons, no chip, no placeholder, and the
    // raw tag string never reaches the rendered markup.
    expect(count(html, 'class="word"')).toBe(4);
    expect(html).not.toContain("il-token");
    expect(html).not.toContain("il-label");
    expect(html).not.toContain("nom.sg");
    expect(html).not.toContain("perf.past");
    expect(html).not.toContain("gen.sg");
    expect(html).toContain(">Он<");
    expect(html).toContain(">вчера<");
  });

  it("the word card expands the tapped token's compact label to its full form", () => {
    expect(ruCard("хлеба")).toContain("Grammar in this sentence:");
    expect(ruCard("хлеба")).toContain("genitive singular");
    expect(ruCard("купил")).toContain("perfective past");
    expect(ruCard("Он")).toContain("nominative singular");
    // A token the sidecar does not cover carries no grammar line.
    expect(ruCard("вчера")).not.toContain("Grammar in this sentence:");
    // The card line is human form only — the raw tag never renders.
    expect(ruCard("хлеба")).not.toContain("gen.sg");
  });

  it("the global toggle off hides the card's grammar line; the flow is identical", () => {
    const html = ru({ grammarLabels: false });
    expect(html).not.toContain("il-token");
    expect(html).not.toContain("gen.sg");
    // The same four tokens, as plain word buttons.
    expect(count(html, 'class="word"')).toBe(4);
    expect(html).toContain(">Он<");
    expect(html).toContain(">вчера<");
    // And the word card stays clean of grammar too while off (the card
    // body itself is otherwise unchanged).
    const offCard = ru({
      grammarLabels: false,
      wordCard: { sentenceId: RU_SENT, token: "хлеба", card: null },
    });
    expect(offCard).not.toContain("Grammar in this sentence:");
    expect(offCard).toContain("Looking this word up");
  });

  it("ja furigana stories stay Ruby even when the pack ships labels", () => {
    const jaLabeled: Story = {
      ...STORY,
      sentences: [
        {
          content_id: "ja.sent.test.one",
          text: "教室 に 本 が おいてある",
          furigana: "きょうしつ に ほん が おいてある",
          romaji: null,
          faded_by_mastery: false,
          gloss: "A book has been left in the classroom.",
          status: "community",
          known: [],
          labels: [{ token: "ほん", label: "nom.sg" }],
        },
      ],
    };
    const html = render({ storyActive: jaLabeled });
    expect(html).not.toContain("il-token");
    // Ruby still renders inside the sentence spans — now one <ruby> per
    // kanji word, annotating the whole word.
    expect(html).toContain("<ruby>");
    expect(html).toContain("<ruby>教室<rp>(</rp><rt>きょうしつ</rt><rp>)</rp></ruby>");
    // The words stay tappable buttons.
    expect(count(html, 'class="word"')).toBe(5);
  });

  it("unknown label atoms render verbatim rather than vanishing", () => {
    expect(expandGrammarLabel("nom.pl")).toBe("nominative plural");
    expect(expandGrammarLabel("dub.dat")).toBe("dub dative");
  });
});

describe("lookup state on the word card (VOCAB-BUILDER-001)", () => {
  it("an in_review card shows the In-My-words state beside the still-working Mine button", () => {
    const html = withCard("きょうしつ", { ...CLASSROOM_CARD, in_review: true });
    expect(html).toContain("In My words");
    expect(html).toContain(">Mine</button>");
  });
  it("a card whose word is not in the pipeline yet shows no In-My-words state", () => {
    const html = withCard("きょうしつ", { ...CLASSROOM_CARD, in_review: false });
    expect(html).not.toContain("In My words");
  });
});
