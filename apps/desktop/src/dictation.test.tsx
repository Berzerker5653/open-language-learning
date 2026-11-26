// Roadmap feature B: dictation UI contract — honest guided verdicts, abstention
// reasons, and the guided-only disclaimer. Recording plumbing is container-level.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DictationPractice, type DictationResult } from "./dictation";
import type { FormErrorOfferView } from "./error-review";

const base = {
  sentence: null as { id: string; text: string; reading: string | null; gloss: string } | null,
  target: "おばあさん",
  onTargetChange: () => {},
  onNewSentence: () => {},
  recording: false,
  hasAttempt: true,
  onRecord: () => {},
  onStop: () => {},
  onPlayAttempt: () => {},
};

function withResult(result: DictationResult | null): string {
  return renderToStaticMarkup(<DictationPractice {...base} result={result} />);
}

describe("dictation practice", () => {
  it("confirms a match and shows what was heard", () => {
    const html = withResult({
      matched: true,
      heard: "おばあさん",
      target: "おばあさん",
      abstain_reason: null,
      mode: "guided",
    });
    expect(html).toContain("That matches");
    expect(html).toContain("おばあさん");
  });

  it("reports a mismatch honestly without grading", () => {
    const html = withResult({
      matched: false,
      heard: "おばさん",
      target: "おばあさん",
      abstain_reason: null,
      mode: "guided",
    });
    expect(html).toContain("does not match");
    expect(html).toContain("Try again");
  });

  it("explains the off default with a path to enable it", () => {
    const html = withResult({
      matched: null,
      heard: "",
      target: "おばあさん",
      abstain_reason: "speech-model-off",
      mode: "guided",
    });
    expect(html).toContain("No speech model is selected");
  });

  it("is honest when the recognition runtime is absent", () => {
    const html = withResult({
      matched: null,
      heard: "",
      target: "おばあさん",
      abstain_reason: "aligner-unavailable",
      mode: "guided",
    });
    expect(html).toContain("lacks the speech runtime");
    expect(html).toContain("downloading a model alone does not add one");
    // A model download does not supply the runtime: the old copy implied
    // it did.
    expect(html).not.toContain("Download it under");
  });

  it("treats a quality rejection as a neutral retry", () => {
    const html = withResult({
      matched: null,
      heard: "",
      target: "おばあさん",
      abstain_reason: "quality:silence",
      mode: "guided",
    });
    expect(html).toContain("too quiet, too short, or clipped");
  });

  it("owns an engine fault instead of hinting at the learner (sweep finding 12)", () => {
    // The backend now abstains with `engine-error` / `sidecar-timeout`
    // for its own recognizer faults; the copy must attribute the fault
    // to the app, never render raw fault strings.
    const html = withResult({
      matched: null,
      heard: "",
      target: "おばあさん",
      abstain_reason: "engine-error",
      mode: "guided",
    });
    expect(html).toContain("faulted");
    expect(html).toContain("our fault, not your speech");
    expect(html).not.toContain("try again");
  });

  it("states the guided-only, never-saved disclaimer", () => {
    const html = withResult({
      matched: true,
      heard: "おばあさん",
      target: "おばあさん",
      abstain_reason: null,
      mode: "guided",
    });
    expect(html).toContain("recognition check, not a pronunciation grade");
    expect(html).toContain("never saved");
  });

  it("offers a stop control while recording", () => {
    const html = renderToStaticMarkup(<DictationPractice {...base} recording result={null} />);
    expect(html).toContain("Stop and check");
    expect(html).not.toContain("Record attempt");
  });

  it("shows a pack sentence with its gloss and a new-sentence control", () => {
    const html = renderToStaticMarkup(
      <DictationPractice
        {...base}
        result={null}
        sentence={{
          id: "ja.sent.greet-morning",
          text: "おはようございます。",
          reading: "おはようございます",
          gloss: "Good morning.",
        }}
      />,
    );
    expect(html).toContain("おはようございます。");
    expect(html).toContain("Good morning.");
    expect(html).toContain("New sentence");
  });

  it("renders a pack sentence with no reading field (U04)", () => {
    // Russian has no kana cue: the surface travels as the comparison target
    // and the card still shows text + gloss.
    const html = renderToStaticMarkup(
      <DictationPractice
        {...base}
        target="Посмотрите, пожалуйста, третий абзац и исправьте ошибку."
        result={null}
        sentence={{
          id: "ru.sent.b2.j1",
          text: "Посмотрите, пожалуйста, третий абзац и исправьте ошибку.",
          reading: null,
          gloss: "Please look at the third paragraph and correct the mistake.",
        }}
      />,
    );
    expect(html).toContain("Посмотрите");
    expect(html).toContain("Please look at the third paragraph");
  });
});

describe("correction inline inside the sentence (U9)", () => {
  const OFFER = {
    ledger_id: "err-1",
    expected: "книги",
    produced: "книгу",
    lemma: "книга",
    error_class: "case" as const,
    context_sentence_id: "ru.sentence.p1",
  };
  const SENTENCE = {
    id: "ru.sent.p1",
    text: "Я читаю книги.",
    reading: null,
    gloss: "I read books.",
  };

  function render(overrides: Record<string, unknown> = {}) {
    return renderToStaticMarkup(
      <DictationPractice
        {...base}
        sentence={SENTENCE}
        target="Я читаю книги."
        result={{
          matched: false,
          heard: "Я читаю книгу.",
          target: "Я читаю книги.",
          abstain_reason: null,
          mode: "guided",
          error_offers: [OFFER],
        }}
        onAcceptOffer={(overrides.onAcceptOffer as ((o: FormErrorOfferView) => void) | undefined) ?? (() => {})}
        onNewSentence={() => {}}
        recording={false}
        hasAttempt={true}
        onRecord={() => {}}
        onStop={() => {}}
        onPlayAttempt={() => {}}
        {...overrides}
      />,
    );
  }

  it("marks the wrong form inside the sentence with the corrected form beside it", () => {
    const html = render();
    const blockquote = html.split("<blockquote")[1]!.split("</blockquote>")[0]!;
    expect(blockquote).toContain('data-testid="inline-correction"');
    expect(blockquote).toContain('class="inline-correction__wrong">книгу</s>');
    expect(blockquote).toContain('class="inline-correction__correct">книги</span>');
    // The plain text around the marked form survives.
    expect(blockquote).toContain("Я читаю ");
  });

  it("renders the sentence unchanged when nothing mismatched was reported", () => {
    const html = render({
      result: {
        matched: false,
        heard: "Я читаю книгу.",
        target: "Я читаю книги.",
        abstain_reason: null,
        mode: "guided",
      },
    });
    const blockquote = html.split("<blockquote")[1]!.split("</blockquote>")[0]!;
    expect(blockquote).not.toContain("inline-correction");
    expect(blockquote).toContain("Я читаю книги.");
  });

  it("never fabricates an inline mark for forms the grade did not report", () => {
    const html = render({
      result: {
        matched: false,
        heard: "Я читаю книгу.",
        target: "Я читаю книги.",
        abstain_reason: null,
        mode: "guided",
        error_offers: [{ ...OFFER, expected: "несуществующаяформа" }],
      },
    });
    const blockquote = html.split("<blockquote")[1]!.split("</blockquote>")[0]!;
    expect(blockquote).not.toContain("inline-correction");
    expect(blockquote).toContain("Я читаю книги.");
  });

  it("rendering the correction never calls the accept handler", () => {
    const accepted: string[] = [];
    render({ onAcceptOffer: (o: { ledger_id: string }) => accepted.push(o.ledger_id) });
    expect(accepted).toEqual([]);
  });

  it("a matched result renders no inline correction", () => {
    const html = render({
      result: {
        matched: true,
        heard: "Я читаю книги.",
        target: "Я читаю книги.",
        abstain_reason: null,
        mode: "guided",
        error_offers: [OFFER],
      },
    });
    const blockquote = html.split("<blockquote")[1]!.split("</blockquote>")[0]!;
    expect(blockquote).not.toContain("inline-correction");
    expect(blockquote).toContain("Я читаю книги.");
  });
});
