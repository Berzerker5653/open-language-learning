/**
 * FIX-ERR-SRS-LOOP-001-2 (review defect D3): the learner-facing surface of
 * the error memory loop. Dictation and writing verdicts carry explicit
 * per-form review OFFERS; accepting one is a separate, deliberate click —
 * that click is the ONLY thing that creates a review card. The engine
 * enforces the same rule (the card row is created inside
 * `error_review_accept`), and the tests here pin it on this side: merely
 * rendering an offer never calls the accept command (never silent).
 *
 * The panel below is the drill queue for ACCEPTED cards: the exact form
 * replayed in its context sentence, reveal, then self-grade Again/I knew
 * it — the same idiom the my-words drill uses. Before reveal the sentence
 * is shown with the drilled form blanked, so the drill never spoils its
 * own answer; when blanking is impossible (no pack row, or the context is
 * the form itself) the prompt honestly names just the word. Like every
 * self-graded drill here, these cards never count as mastery evidence
 * (docs/18: the error loop is its own scheduler partition, no calibration
 * claim).
 */
import { PackText, usePackTextAttrs } from "@openlang/ui";

/** Wire mirror of `FormErrorClass` (crates/activity/src/form_errors.rs,
 * kebab-case serde). `other` is the engine's honest fallback and is
 * labeled as one, never dressed up as a named grammar term. */
export type FormErrorClass =
  | "case"
  | "aspect"
  | "stress"
  | "agreement"
  | "wrong-word"
  | "other";

/** Wire mirror of `FormErrorOffer` — an explicit per-form review offer
 * riding on a dictation or writing verdict. Nothing is scheduled by it. */
export interface FormErrorOfferView {
  ledger_id: string;
  /** The correct form the pack expected — the form the drill replays. */
  expected: string;
  /** What the learner produced. */
  produced: string;
  lemma: string;
  error_class: FormErrorClass;
  context_sentence_id: string;
}

/** Wire mirror of the desktop `ErrorReviewCardView` — an ACCEPTED card as
 * the drill queue needs it. `context_text` is null when the pack no
 * longer has the row; the form itself is then still drilled. */
export interface ErrorReviewCardView {
  card_id: string;
  ledger_id: string;
  surface: string;
  lemma: string;
  error_class: FormErrorClass;
  context_sentence_id: string;
  context_text: string | null;
  due_at: string;
}

function errorClassLabel(kind: FormErrorClass): string {
  switch (kind) {
    case "case":
      return "the word's case ending";
    case "aspect":
      return "the verb's aspect";
    case "stress":
      return "the word stress";
    case "agreement":
      return "words not agreeing with each other";
    case "wrong-word":
      return "a different word than the one asked for";
    default:
      return "a form difference we could not name";
  }
}

/**
 * The per-form review OFFERS attached to a dictation or writing verdict.
 * Presentational: the App container owns the `error_review_accept` call,
 * so this component can never schedule anything by itself.
 */
export function ErrorOfferList({
  offers,
  acceptedIds = [],
  onAccept,
}: {
  offers: FormErrorOfferView[];
  /** Ledger ids whose offer the learner has already accepted — the card
   *  was created by that click, and the offer is not re-offered. */
  acceptedIds?: string[];
  onAccept(offer: FormErrorOfferView): void;
}) {
  const packAttrs = usePackTextAttrs();
  if (offers.length === 0) return null;
  return (
    <div className="error-offers" data-testid="error-offers">
      <p className="meta">
        These forms tripped you up. If you want to work on one, it joins your review list — only
        after you add it, never by itself.
      </p>
      {offers.map((o) =>
        acceptedIds.includes(o.ledger_id) ? (
          <p key={o.ledger_id} className="notice" data-testid="error-offer-accepted">
            Added to your review list — you will meet it again under My words.
          </p>
        ) : (
          <div key={o.ledger_id} className="card error-offer-card">
            <p>
              You wrote <strong {...packAttrs}>{o.produced}</strong>; the pack expected{" "}
              <strong {...packAttrs}>{o.expected}</strong> — that looks like{" "}
              {errorClassLabel(o.error_class)}.
            </p>
            <button
              type="button"
              className="btn btn--quiet"
              data-testid={`error-offer-accept-${o.ledger_id}`}
              onClick={() => onAccept(o)}
            >
              Add <strong {...packAttrs}>{o.expected}</strong> to my review list
            </button>
          </div>
        ),
      )}
    </div>
  );
}

export interface ErrorReviewPanelProps {
  /** Cards due now, from `error_review_queue`. */
  cards: ErrorReviewCardView[];
  review: { card: ErrorReviewCardView; revealed: boolean } | null;
  error: string | null;
  notice: string | null;
  onStartReview(): void;
  onReveal(): void;
  onGrade(again: boolean): void;
}

/** The learner-facing blank standing in for the drilled form before the
 *  answer is revealed ("Write it yourself", not "read it here"). */
const FORM_BLANK = "____";

/**
 * The context sentence with the drilled form blanked, or null when the
 * form is not literally inside it. A context that IS the form (a
 * lexicon-origin card, FIX-ERR-SRS-LOOP-001-2 D4) blanks to nothing but
 * the gap — that is a spoiler with extra steps, so it also returns null.
 */
function blankedContext(contextText: string, surface: string): string | null {
  if (!contextText.includes(surface)) return null;
  const blanked = contextText.replaceAll(surface, FORM_BLANK);
  return blanked.replaceAll(FORM_BLANK, "").trim().length > 0 ? blanked : null;
}

/**
 * The drill queue over ACCEPTED error-review cards (defect D3's missing
 * view). Opening it asks the engine for due cards; the only way a card
 * got here is a past accept click. Drill: the context sentence (or the
 * word alone when the row is gone or the form cannot be blanked out of
 * it), reveal, self-grade.
 */
export function ErrorReviewPanel(p: ErrorReviewPanelProps) {
  const packAttrs = usePackTextAttrs();
  // Pre-reveal the drilled form is never visible: blank it out of the
  // context sentence, and when that is impossible show only the word.
  const preRevealContext =
    p.review && !p.review.revealed && p.review.card.context_text
      ? blankedContext(p.review.card.context_text, p.review.card.surface)
      : null;
  return (
    <section aria-label="Form reviews">
      <h1>Form reviews</h1>
      <p className="empty">
        Forms you asked to work on after a mistake. Reviews are self-graded and stay on this
        device; they never count as mastery evidence.
      </p>
      {p.error && (
        <p role="alert" className="alert">
          {p.error}
        </p>
      )}
      {p.notice && (
        <p role="status" className="notice">
          {p.notice}
        </p>
      )}
      {p.review ? (
        <div className="field" data-testid="error-review-card">
          {preRevealContext ? (
            <p className="prompt">
              In this sentence: <PackText tag="span">{preRevealContext}</PackText>
            </p>
          ) : (
            <p className="prompt">
              The word to work on: <strong {...packAttrs}>{p.review.card.lemma}</strong>
            </p>
          )}
          {p.review.revealed ? (
            <>
              <p className="notice" data-testid="error-review-answer">
                The form to own: <strong {...packAttrs}>{p.review.card.surface}</strong>
                {p.review.card.context_text ? (
                  <>
                    {" "}
                    in: <PackText tag="span">{p.review.card.context_text}</PackText>
                  </>
                ) : null}
              </p>
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => p.onGrade(false)}>
                  I knew it
                </button>
                <button type="button" className="btn btn--quiet" onClick={() => p.onGrade(true)}>
                  Again
                </button>
              </div>
            </>
          ) : (
            <p>
              Can you produce the exact form that belongs here?
              <span className="btn-row">
                <button type="button" className="btn btn--primary" onClick={p.onReveal}>
                  Reveal
                </button>
              </span>
            </p>
          )}
        </div>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={p.onStartReview}>
            Review due forms
          </button>
        </div>
      )}
      {p.cards.length > 0 && !p.review && (
        <ul>
          {p.cards.map((c) => (
            <li key={c.card_id}>
              <PackText tag="span">{c.lemma}</PackText>
              {"  ·  "}
              <small>due {c.due_at.slice(0, 10)}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
