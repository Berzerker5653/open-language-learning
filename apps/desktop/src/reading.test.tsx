/**
 * READER-FLOW-001 — component pin for the continuous paragraph reader,
 * carrying the CONTENT-CONFIRM-001 (ADR-0040) confirmation surface and the
 * GRAMMAR-LABELS-001 interlinear contract into the new structure.
 *
 * What must hold visually: the story body is ONE flowing paragraph of
 * sentence spans with inline word buttons (never a button column); the word
 * card renders gloss, pack status, the lemma line when resolved, Mine, and a
 * Play button ONLY when word audio exists (off-pack words get the honest
 * "not in your pack yet" line, never an invented gloss); the confirmation
 * toggle stays a quiet control at the sentence tail and inside the word
 * card, attribution renders as "Confirmed by <names>", only the signed-in
 * learner's own mark turns into "Undo", and the panel never uses a
 * verification/expertise/review claim (docs/18).
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

  it("the quiet CONTENT-CONFIRM control rides the sentence tail, not the sentence itself", () => {
    const html = render();
    // The sentence span is a plain span (its non-word area plays audio);
    // the toggle is a small control in the tail, after the last word.
    expect(html).toContain('<span class="sentence">');
    expect(html).toContain('<span class="sentence-tail">');
    expect(count(html, "This looks right")).toBe(1);
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
      aux_source: "Wiktionary via kaikki.org (CC BY-SA / GFDL)",
    });
    // The aux answer is shown, labeled, and attributed (ShareAlike).
    expect(html).toContain("present, gift");
    expect(html).toContain("auxiliary dictionary");
    expect(html).toContain("kaikki.org");
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

describe("content confirmation surface (CONTENT-CONFIRM-001)", () => {
  it("offers the explicit toggle for the sentence tail and for a looked-up word", () => {
    // Sentence toggle sits quiet at the tail; the word card carries its
    // own. Two items, two toggles; Ana's mark never turns a stranger's
    // button into "Undo".
    const html = withCard("きょうしつ", CLASSROOM_CARD);
    expect(count(html, "This looks right")).toBe(2);
    expect(html).toContain(">Mine</button>");
    expect(html).not.toContain(">Undo</button>");
  });

  it("renders attribution as plain names, oldest mark first", () => {
    expect(render()).toContain("Confirmed by Ana, Bruno");
  });

  it("shows Undo only where the signed-in learner's own mark stands", () => {
    const html = withCard("きょうしつ", CLASSROOM_CARD, { profileName: "Ana" });
    expect(html).toContain(">Undo</button>");
    // The word row carries no mark from Ana — that toggle is still explicit.
    expect(count(html, "This looks right")).toBe(1);
  });

  it("shows no attribution line where nobody has confirmed", () => {
    const html = withCard("きょうしつ", CLASSROOM_CARD, {
      profileName: "Carla",
      storyActive: { ...STORY, confirmations: {} },
    });
    expect(html).not.toContain("Confirmed by");
    expect(count(html, "This looks right")).toBe(2);
  });

  it("never claims verification, expertise, or review (docs/18)", () => {
    expect(withCard("きょうしつ", CLASSROOM_CARD, { profileName: "Ana" })).not.toMatch(
      /verif|expert|review/i,
    );
  });

  it("shows sentence attribution with no word card open", () => {
    // Attribution and the quiet toggle ride the sentence tail always. A
    // learner browsing without tapping anything still sees who stood
    // behind each sentence and can confirm without opening a card.
    const html = render();
    expect(html).toContain("Confirmed by Ana, Bruno");
    expect(count(html, "This looks right")).toBe(1);
  });
});

/* GRAMMAR-LABELS-001 — interlinear grammar labels in the paragraph reader.
 * The compact label rides under its token inside the word button, the
 * full-form expansion rides the word card, the global toggle hides labels,
 * uncovered tokens (and ja furigana text) stay exactly as before — silent
 * degradation, no layout shift. */
describe("interlinear grammar labels (GRAMMAR-LABELS-001)", () => {
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

  it("labels sit under their tokens inside the word buttons; uncovered tokens keep an empty placeholder", () => {
    const html = ru();
    expect(count(html, 'class="word il-token"')).toBe(4);
    expect(html).toContain(">nom.sg<");
    expect(html).toContain(">perf.past<");
    expect(html).toContain(">gen.sg<");
    // "вчера" carries no sidecar label — the empty same-height placeholder
    // keeps the line box uniform: degradation with no layout shift.
    expect(count(html, 'class="il-label il-label--empty"')).toBe(1);
  });

  it("the word card expands the tapped token's compact label to its full form", () => {
    expect(ruCard("хлеба")).toContain("Grammar in this sentence:");
    expect(ruCard("хлеба")).toContain("genitive singular");
    expect(ruCard("купил")).toContain("perfective past");
    expect(ruCard("Он")).toContain("nominative singular");
    // A token the sidecar does not cover carries no grammar line.
    expect(ruCard("вчера")).not.toContain("Grammar in this sentence:");
  });

  it("the global toggle off renders bare word buttons — no labels at all", () => {
    const html = ru({ grammarLabels: false });
    expect(html).not.toContain("il-token");
    expect(html).not.toContain("gen.sg");
    // The same four tokens, as plain word buttons.
    expect(count(html, 'class="word"')).toBe(4);
    expect(html).toContain(">Он<");
    expect(html).toContain(">вчера<");
  });

  it("ja furigana text is never rerouted through the interlinear path", () => {
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
