// WRITE-PRACTICE-001 UI contract (red-first): the free-writing panel must
// (a) render target usage chips that accept whatever the engine's form
// matcher counted (inflected/variant forms included — that is the
// matcher's job, the chip is the evidence), (b) phrase unknown tokens as
// "not in dictionary" and NEVER as "wrong", and (c) hold no promise of
// grammar or correction feedback anywhere in v1 copy.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FreeWritingPanel,
  WRITING_SOFT_FLOOR_WORDS,
  countWritingWords,
  type WritingCheckResult,
  type WritingJournalEntry,
  type WritingPrompt,
} from "./free-writing";

const prompt: WritingPrompt = {
  targets: [
    { item_id: "ru.lex.routines.kofe", surface: "кофе", gloss: "coffee" },
    { item_id: "ru.lex.routines.utro", surface: "утро", gloss: "morning" },
    { item_id: "ru.lex.test.night", surface: "ночь", gloss: "night" },
  ],
  cue: "Write about your morning today.",
};

const journal: WritingJournalEntry[] = [
  {
    id: "wj-2",
    pack_id: "org.openlanguage.ru-ru.reference",
    text: "я пью кофе утром",
    word_count: 4,
    targets_used: 2,
    occurred_at: "2026-11-27T09:00:00Z",
  },
  {
    id: "wj-1",
    pack_id: "org.openlanguage.ru-ru.reference",
    text: "кофе",
    word_count: 1,
    targets_used: 1,
    occurred_at: "2026-11-26T09:00:00Z",
  },
];

const base = {
  prompt,
  promptError: null as string | null,
  value: "",
  onChange: () => {},
  onSubmit: () => {},
  onNewPrompt: () => {},
  submitting: false,
  checkError: null as string | null,
  journal: [] as WritingJournalEntry[],
  journalError: null as string | null,
};

function withProps(extra: Partial<typeof base> & { result: WritingCheckResult | null }): string {
  return renderToStaticMarkup(<FreeWritingPanel {...base} {...extra} />);
}

describe("free-writing panel (WRITE-PRACTICE-001)", () => {
  it("marks every engine-accepted target with a usage chip (variants included)", () => {
    // The engine answered that the learner used кофе and утро — including
    // via an inflected form; the chip is per target, and the untouched
    // target gets none.
    const html = withProps({
      result: {
        words: [
          { token: "кофе", status: "known" },
          { token: "утром", status: "unknown" },
        ],
        used_targets: ["ru.lex.routines.kofe", "ru.lex.routines.utro"],
        word_count: 2,
        dictionary_word_count: 1,
      },
      value: "кофе утром",
    });
    expect(html).toContain("fw-used-chip");
    expect(html.split("fw-used-chip").length - 1).toBe(2);
    expect(html).toContain("You used 2 of 3");
  });

  it("phrases unseen tokens as 'not in dictionary', never as wrong", () => {
    const html = withProps({
      result: {
        // A Cyrillic non-word and an unseen kana word land in the same
        // coaching bucket: the copy never declares either of them wrong.
        words: [
          { token: "Зюзя", status: "unknown" },
          { token: "すっぽん", status: "unknown" },
        ],
        used_targets: [],
        word_count: 2,
        dictionary_word_count: 0,
      },
      value: "Зюзя すっぽん",
    });
    expect(html).toContain("not in dictionary");
    expect(html).not.toMatch(/\bwrong\b|\binvalid\b/i);
    expect(html).toContain('data-status="unknown"');
  });

  it("renders the attempt words colored by mechanical status", () => {
    const html = withProps({
      result: {
        words: [
          { token: "кофе", status: "known" },
          { token: "Hello", status: "invalid-script" },
        ],
        used_targets: [],
        word_count: 2,
        dictionary_word_count: 1,
      },
      value: "кофе Hello",
    });
    expect(html).toContain("fw-word--known");
    expect(html).toContain("fw-word--invalid-script");
    expect(html).toContain("Hello");
  });

  it("promises completion signal only — no grammar, no correction", () => {
    const html = withProps({ result: null });
    expect(html).toContain("completion signal");
    // v1 explicitly disclaims the correction promise WRITE-PRACTICE-002
    // will eventually make (off-by-default, consent-gated) real.
    expect(html).toContain("never corrects your grammar");
    expect(html).not.toMatch(/corrections? (from|by)|grammar feedback/i);
  });

  it("shows the private journal newest-first, and its empty state", () => {
    const empty = withProps({ result: null });
    expect(empty).toContain("newest first");
    const html = withProps({ result: null, journal });
    const entries = html.split("fw-journal-entry").length - 1;
    expect(entries).toBe(2);
    // Newest first in source order: the 11-27 row appears before 11-26.
    expect(html.indexOf("2026-11-27")).toBeLessThan(html.indexOf("2026-11-26"));
  });

  it("nudges at the soft floor without gating submit", () => {
    const short = withProps({ result: null, value: "кофе" });
    expect(short).toContain(`about ${WRITING_SOFT_FLOOR_WORDS} words`);
    expect(short).toContain("Check</button>");
    expect(short).not.toContain('disabled=""');
  });

  it("counts words the way the engine journals them", () => {
    expect(countWritingWords("я пью кофе утром")).toBe(4);
    expect(countWritingWords("кофе, кофе!")).toBe(2);
    expect(countWritingWords("  ")).toBe(0);
  });
});
