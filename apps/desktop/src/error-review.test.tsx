/**
 * FIX-ERR-SRS-LOOP-001-2 (D3): the offer surface and the drill queue,
 * static-render tests (component contract; the mounted learner loop is the
 * error-offer journey). The core invariant pinned here is NEVER SILENT:
 * rendering offers never performs an accept — the accept affordance exists
 * for a deliberate click, and the panel only ever shows accepted cards.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DictationPractice } from "./dictation";
import { WritingPractice } from "./writing";
import {
  ErrorOfferList,
  ErrorReviewPanel,
  type ErrorReviewCardView,
  type FormErrorOfferView,
} from "./error-review";

const OFFER: FormErrorOfferView = {
  ledger_id: "err-1",
  expected: "книги",
  produced: "книгу",
  lemma: "книга",
  error_class: "case",
  context_sentence_id: "ru.sentence.p1",
};

const SECOND_OFFER: FormErrorOfferView = {
  ...OFFER,
  ledger_id: "err-2",
  expected: "студенты",
  produced: "студентов",
};

const CARD: ErrorReviewCardView = {
  card_id: "errcard-err-1",
  ledger_id: "err-1",
  surface: "книги",
  lemma: "книга",
  error_class: "case",
  context_sentence_id: "ru.sentence.p1",
  context_text: "Я читаю книги.",
  due_at: "2026-11-21T00:00:00Z",
};

const DICT_BASE = {
  sentence: null,
  target: "Я читаю книги.",
  onTargetChange: () => {},
  onNewSentence: () => {},
  recording: false,
  hasAttempt: false,
  onRecord: () => {},
  onStop: () => {},
  onPlayAttempt: () => {},
};

describe("per-form review offers (D3 surface)", () => {
  it("renders each offer with an explicit accept affordance and never accepts by itself", () => {
    const accept = vi.fn();
    const html = renderToStaticMarkup(
      <ErrorOfferList offers={[OFFER, SECOND_OFFER]} onAccept={accept} />,
    );
    expect(html).toContain("Add");
    expect(html).toContain("to my review list");
    expect(html).toContain("книги");
    // Never silent: rendering is not accepting.
    expect(accept).not.toHaveBeenCalled();
  });

  it("an accepted offer shows its confirmation, not a second button", () => {
    const html = renderToStaticMarkup(
      <ErrorOfferList offers={[OFFER]} acceptedIds={[OFFER.ledger_id]} onAccept={() => {}} />,
    );
    expect(html).toContain("Added to your review list");
    expect(html).not.toContain("to my review list");
  });

  it("a dictation mismatch renders its offers; a match or abstention renders none", () => {
    const accept = vi.fn();
    const mismatch = renderToStaticMarkup(
      <DictationPractice
        {...DICT_BASE}
        result={{
          matched: false,
          heard: "Я читаю книгу.",
          target: "Я читаю книги.",
          abstain_reason: null,
          mode: "guided",
          error_offers: [OFFER],
        }}
        onAcceptOffer={(o) => accept(o)}
      />,
    );
    expect(mismatch).toContain("error-offers");
    expect(mismatch).toContain("книги");
    expect(accept).not.toHaveBeenCalled();

    const match = renderToStaticMarkup(
      <DictationPractice
        {...DICT_BASE}
        result={{
          matched: true,
          heard: "Я читаю книги.",
          target: "Я читаю книги.",
          abstain_reason: null,
          mode: "guided",
          error_offers: [OFFER],
        }}
        onAcceptOffer={(o) => accept(o)}
      />,
    );
    expect(match).not.toContain("error-offers");
    expect(accept).not.toHaveBeenCalled();
  });

  it("without an accept handler the offer affordance is absent, never dead", () => {
    const html = renderToStaticMarkup(
      <DictationPractice
        {...DICT_BASE}
        result={{
          matched: false,
          heard: "Я читаю книгу.",
          target: "Я читаю книги.",
          abstain_reason: null,
          mode: "guided",
          error_offers: [OFFER],
        }}
      />,
    );
    expect(html).not.toContain("error-offers");
  });

  it("a writing miss renders its single offer alongside the expected form", () => {
    const accept = vi.fn();
    const html = renderToStaticMarkup(
      <WritingPractice
        task={{ item_id: "ru.lex.food.hleb", prompt_text: "bread" }}
        draft="хлебу"
        graded
        correct={false}
        expected="хлеб"
        offer={OFFER}
        onAcceptOffer={(o) => accept(o)}
        onDraft={() => {}}
        onSubmit={() => {}}
        onHint={() => {}}
      />,
    );
    expect(html).toContain("The form this task asked for");
    expect(html).toContain("error-offers");
    expect(accept).not.toHaveBeenCalled();
  });
});

describe("error-review drill queue (D3 drill view)", () => {
  const PANEL = {
    error: null,
    notice: null,
    onStartReview: () => {},
    onReveal: () => {},
    onGrade: () => {},
  };

  it("states what it is and only ever holds accepted cards", () => {
    const html = renderToStaticMarkup(<ErrorReviewPanel {...PANEL} cards={[]} review={null} />);
    expect(html).toContain("Form reviews");
    expect(html).toContain("never count as mastery evidence");
    expect(html).toContain("Review due forms");
  });

  it("the due list names cards by lemma, never spoiling the drilled form", () => {
    const html = renderToStaticMarkup(
      <ErrorReviewPanel {...PANEL} cards={[CARD]} review={null} />,
    );
    expect(html).toContain("книга");
    expect(html).not.toContain("книги");
  });

  it("before reveal the drilled form is hidden; the sentence is shown blanked", () => {
    const closed = renderToStaticMarkup(
      <ErrorReviewPanel {...PANEL} cards={[CARD]} review={{ card: CARD, revealed: false }} />,
    );
    // The learner sees the sentence around the gap, never the answer.
    expect(closed).toContain("Я читаю ____");
    expect(closed).not.toContain("книги");
    expect(closed).toContain("Reveal");

    const open = renderToStaticMarkup(
      <ErrorReviewPanel {...PANEL} cards={[CARD]} review={{ card: CARD, revealed: true }} />,
    );
    expect(open).toContain("The form to own");
    expect(open).toContain("книги");
    expect(open).toContain("I knew it");
    expect(open).toContain("Again");
  });

  it("a lexicon-origin card (context = the form itself) prompts the word, never spoils", () => {
    // D4 shape: the writing-miss context resolved to the lexicon row's
    // text, which IS the drilled form — blanking would leave only a gap.
    const lex = { ...CARD, context_text: "книги" };
    const html = renderToStaticMarkup(
      <ErrorReviewPanel {...PANEL} cards={[lex]} review={{ card: lex, revealed: false }} />,
    );
    expect(html).toContain("The word to work on");
    expect(html).not.toContain("книги");
  });

  it("a card whose pack row vanished still drills, with an honest prompt", () => {
    const bare = { ...CARD, context_text: null };
    const html = renderToStaticMarkup(
      <ErrorReviewPanel {...PANEL} cards={[bare]} review={{ card: bare, revealed: false }} />,
    );
    expect(html).toContain("The word to work on");
    expect(html).toContain("книга");
    expect(html).not.toContain("книги");
  });
});
