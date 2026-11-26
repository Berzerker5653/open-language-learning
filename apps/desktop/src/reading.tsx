/**
 * READ-002 / READER-FLOW-001 graded reading: a story renders as ONE flowing
 * paragraph, not a button column. The three-interaction budget:
 *   1. word tap  -> word card (gloss, pack status, lemma line, word audio, Mine)
 *   2. sentence tap (anywhere that is not a word) -> that sentence's audio
 *   3. the quiet CONTENT-CONFIRM-001 control UNDER the story (READING-CLUTTER-001,
 *      owner ruling 2026-11-21: no confirm control inside the prose)
 * Nothing else is a primary affordance. Reading is formative — nothing here
 * is scored or saved unless the learner mines a word.
 *
 * READING-CLUTTER-001: the story flow shows only text the learner reads —
 * raw morphology tag chips (`nom.sg`) are data, not learner UI, so they
 * never render in the paragraph; grammar rides the word card in human form
 * ("nominative singular"). The pack-side `labels` sidecar is unchanged.
 *
 * Direction (RTL-001, ADR-0029): the paragraph itself is pack text, so the
 * `reader-paragraph` element carries the active pack's `dir`/`lang` and the
 * sentence spans and word buttons inside it inherit it. Romaji and the
 * sentence gloss are Latin scaffolding and stay `dir="ltr"` inside the RTL
 * block; the explanatory prose (card labels, controls) is app chrome and is
 * never flipped.
 */
import { useRef } from "react";
import { LatinText, PackText } from "@openlang/ui";
import { Ruby } from "./ruby";

export interface StorySummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  sentence_count: number;
}

export interface StoryWord {
  id: string;
  surface: string;
  reading: string | null;
  romaji: string | null;
  gloss: string;
  status: string;
}

/** GRAMMAR-LABELS-001: one token's compact label (gen.sg style), from the
 * pack's `media/labels.jsonl` sidecar. `token` is the raw whitespace token
 * (punctuation intact) so the reader can verify alignment before showing
 * the label. */
export interface TokenLabel {
  token: string;
  label: string;
}

export interface StorySentence {
  content_id: string;
  text: string;
  furigana: string | null;
  romaji: string | null;
  faded_by_mastery: boolean;
  gloss: string | null;
  status: string;
  known: StoryWord[];
  /** Grammar labels for this sentence's open-class tokens; empty when the
   * pack ships no sidecar (or nothing in the sentence is labelable).
   * READING-CLUTTER-001: these NEVER render inline in the paragraph — they
   * power the word card's human-form grammar line only. */
  labels: TokenLabel[];
}

/** Full-form expansions for the compact labels, shown in the word card.
 * Keyed by the dot-separated atoms `build-grammar-labels.py` emits. */
const LABEL_ATOMS: Record<string, string> = {
  nom: "nominative",
  gen: "genitive",
  dat: "dative",
  acc: "accusative",
  ins: "instrumental",
  voc: "vocative",
  prep: "prepositional",
  sg: "singular",
  pl: "plural",
  impf: "imperfective",
  perf: "perfective",
  past: "past",
  pres: "present",
  fut: "future",
  inf: "infinitive",
  part: "participle",
  ger: "gerund",
};

/** Expand "gen.sg" to "genitive singular"; an unknown atom renders verbatim
 * rather than dropping information. */
export function expandGrammarLabel(label: string): string {
  return label
    .split(".")
    .map((atom) => LABEL_ATOMS[atom] ?? atom)
    .join(" ");
}

/** CONTENT-CONFIRM-001 (ADR-0040): one learner's attributed confirmation
 * mark, exactly as `story_view` reports it. Display names only — the app
 * never claims verification, expertise, or review (docs/18). */
export interface ConfirmedByName {
  display_name: string;
  at: string;
}

export interface Story {
  id: string;
  title: string;
  sentences: StorySentence[];
  status: string;
  /// CONTENT-CONFIRM-001: attribution keyed by content id (sentences and
  /// looked-up words). Absent/empty means nobody has confirmed that item.
  confirmations?: Record<string, ConfirmedByName[]>;
}

/** READER-FLOW-001 wire shape of the `word_card` command's answer, mirrored
 * exactly: everything None except `query` and `in_pack` when the token is
 * not in the pack — the frontend then renders the honest "not in your pack
 * yet" card instead of inventing a gloss. The off-pack slice adds the aux
 * fields: set together only when the offline auxiliary lexicon (Wiktionary
 * via kaikki.org, CC BY-SA) answered; they render under their own label
 * and never masquerade as pack data. */
export interface WordCardView {
  query: string;
  lemma: string | null;
  surface: string | null;
  reading: string | null;
  gloss: string | null;
  status: string | null;
  in_pack: boolean;
  aux_word: string | null;
  aux_gloss: string | null;
  aux_pos: string | null;
  aux_source: string | null;
  /// VOCAB-BUILDER-001: true once the word lives in the review pipeline
  /// (the tap itself puts it there — the lookup IS the learning signal).
  /// Rendered as "In My words", never as a mastery claim.
  in_review: boolean;
}

/** The open word card: which sentence's which raw token, plus the engine's
 * answer (`null` while it is loading or failed). */
export interface WordCardState {
  sentenceId: string;
  token: string;
  card: WordCardView | null;
}

/** The wire's norm-token: remove U+0301, lowercase, strip leading/trailing
 * non-letters, NFC. Mirrored from the engine so the card can tie a tapped
 * token back to the sentence's `known` rows (whose content ids are the
 * only confirmable handles a word has). */
export function normToken(token: string): string {
  return token
    .replace(/\u0301/g, "")
    .toLowerCase()
    .replace(/^[^\p{L}]+/u, "")
    .replace(/[^\p{L}]+$/u, "")
    .normalize("NFC");
}

/** WORD-STATE-COLORING-001: the per-word reader state, derived from the same
 * learner record the My Words surface reads — never a parallel store.
 *   - confirmed: the learner's OWN confirmation mark on this word's content id
 *     (the same known-word row the word card's confirm button keys off)
 *   - learning:  the word is in the learner's kept-words list (My Words)
 *   - unseen:    everything else — plain text, the honest default
 * Confirmation is only ever claimed for a mark the learner actually earns;
 * someone else's mark never paints a word as confirmed. */
export type WordState = "unseen" | "learning" | "confirmed";

export interface ReadingPanelProps {
  storyList: StorySummary[];
  storyActive: Story | null;
  storyError: string | null;
  /// Display name of the signed-in profile — the learner's OWN marks are
  /// the only ones the toggle can retract (the engine scopes it by
  /// profile id; the name match only picks the button's label).
  profileName: string;
  /// WORD-STATE-COLORING-001: raw surfaces in the learner's kept-words list
  /// (My Words), exactly the mint of `mine_list`. Optional: absent means
  /// nothing is learned, which renders every word unseen.
  minedSurfaces?: string[];
  /// GRAMMAR-LABELS-001 / READING-CLUTTER-001: the global show/hide for
  /// grammar information (per-profile display setting; true until the
  /// learner turns it off). It gates the word card's human-form grammar
  /// line — nothing grammar-shaped renders in the story flow itself.
  grammarLabels: boolean;
  /** READER-FLOW-001: the open word card, or null. */
  wordCard: WordCardState | null;
  /** Whether `story_word_audio` answered for the open card's word. False
   * renders NO play button — the reader never guesses word audio. */
  wordAudioAvailable: boolean;
  onOpenStory(id: string): void;
  onBack(): void;
  /** Sentence tap (anywhere in the sentence span that is not a word). */
  onPlaySentence(contentId: string): void;
  /** Word tap: opens the card at that raw token of that sentence. */
  onWordTap(contentId: string, token: string): void;
  /** WORDCARD-OFFSCREEN-001: hands the tapped word's button element to the
   * caller before the tap fires, so opening a phone bottom-sheet card can
   * focus it when the card closes (focus returns to the word). Optional:
   * desktop/inline behavior ignores it. */
  onWordAnchor?(el: HTMLElement): void;
  /** The card's Play button: just that word's audio. */
  onWordPlay(contentId: string, token: string): void;
  onWordClose(): void;
  onMine(surface: string, reading: string | null, gloss: string | null): void;
  onConfirm(contentId: string): void;
  onUnconfirm(contentId: string): void;
}

export function ReadingPanel(p: ReadingPanelProps) {
  // WORDCARD-OFFSCREEN-001: the card region takes focus when the card
  // opens (a phone bottom-sheet covering the page is useless to keyboard
  // and screen-reader users if focus stays behind it), and Escape closes
  // it through the same handler as the Close button.
  const cardRef = useRef<HTMLDivElement>(null);
  // CONTENT-CONFIRM-001: the only "checked by" surface in the app. The
  // mark is created ONLY by an explicit click (acceptance 2), and the copy
  // says "confirmed by <names>" — never verified, expert, or reviewed
  // (docs/18). READING-CLUTTER-001 (owner ruling 2026-11-21): the control
  // has left the prose — one quiet story-level control under the paragraph
  // confirms/retracts every sentence with the SAME content_confirm /
  // content_unconfirm commands; the word card keeps its per-word control.
  const marksFor = (contentId: string): ConfirmedByName[] =>
    p.storyActive?.confirmations?.[contentId] ?? [];
  const confirmControl = (contentId: string) => {
    const marks = marksFor(contentId);
    const mine = marks.some((c) => c.display_name === p.profileName);
    return (
      <>
        <button
          type="button"
          className="btn btn--quiet word-confirm"
          aria-pressed={mine}
          onClick={() => (mine ? p.onUnconfirm(contentId) : p.onConfirm(contentId))}
        >
          {mine ? "Undo" : "This looks right"}
        </button>
        {marks.length > 0 && (
          <span className="notice confirmed-by">
            {"Confirmed by " + marks.map((c) => c.display_name).join(", ")}
          </span>
        )}
      </>
    );
  };
  // The story-level attribution is the union over its sentences, each
  // name at its earliest mark (matching the per-sentence oldest-first
  // order the engine already gives).
  const storyMarks = (): ConfirmedByName[] => {
    const first = new Map<string, ConfirmedByName>();
    for (const s of p.storyActive?.sentences ?? []) {
      for (const m of marksFor(s.content_id)) {
        if (!first.has(m.display_name)) first.set(m.display_name, m);
      }
    }
    return [...first.values()];
  };
  const storyConfirmControl = () => {
    const sentences = p.storyActive?.sentences ?? [];
    if (sentences.length === 0) return null;
    // Any of the learner's own marks inside the story makes the control an
    // Undo of all of them; confirming fills in every sentence at once.
    const mineSentences = sentences.filter((s) =>
      marksFor(s.content_id).some((c) => c.display_name === p.profileName),
    );
    const mine = mineSentences.length > 0;
    const marks = storyMarks();
    return (
      <p className="story-confirm">
        <span className="story-confirm-question">
          <LatinText locale="en">Did this story sound right?</LatinText>
        </span>{" "}
        <button
          type="button"
          className="btn btn--quiet story-confirm-toggle"
          aria-pressed={mine}
          onClick={() => {
            if (mine) mineSentences.forEach((s) => p.onUnconfirm(s.content_id));
            else sentences.forEach((s) => p.onConfirm(s.content_id));
          }}
        >
          {mine ? "Undo" : "👍 It sounds right"}
        </button>
        {marks.length > 0 && (
          <span className="notice confirmed-by">
            {"Confirmed by " + marks.map((c) => c.display_name).join(", ")}
          </span>
        )}
      </p>
    );
  };
  const cardAt = (contentId: string, token: string) =>
    p.wordCard !== null && p.wordCard.sentenceId === contentId && p.wordCard.token === token;
  // WORD-STATE-COLORING-001: per-word state from the learner record — the
  // same known-word rows the word card's confirm button keys off, and the
  // same kept-words list the My Words surface renders. Confirmation wins
  // over learning: a word the learner has confirmed is done, not in flight.
  const minedNorm = new Set((p.minedSurfaces ?? []).map(normToken).filter(Boolean));
  const knownFor = (s: StorySentence, tok: string) => {
    const nt = normToken(tok);
    if (!nt) return undefined;
    return s.known.find((w) => normToken(w.surface) === nt);
  };
  const stateFor = (s: StorySentence, tok: string): WordState => {
    const known = knownFor(s, tok);
    if (known) {
      const marks = p.storyActive?.confirmations?.[known.id] ?? [];
      if (marks.some((c) => c.display_name === p.profileName)) return "confirmed";
    }
    if (minedNorm.has(normToken(tok))) return "learning";
    return "unseen";
  };
  // One word token = one button. `word--active` marks the token whose card
  // is open, so the paragraph shows where the card came from.
  const wordButton = (
    s: StorySentence,
    tok: string,
    content: React.ReactNode,
    key: string,
  ) => {
    const state = stateFor(s, tok);
    return (
      <button
        key={key}
        type="button"
        className={
          "word" +
          (state === "confirmed" ? " word--confirmed" : state === "learning" ? " word--learning" : "") +
          (cardAt(s.content_id, tok) ? " word--active" : "")
        }
        onClick={(e) => {
          // The tap belongs to the word; the surrounding sentence span must
          // not also hear it (that would fire sentence audio too).
          e.stopPropagation();
          // WORDCARD-OFFSCREEN-001: hand the tapped button to the caller so
          // closing the card can return focus to this exact word.
          p.onWordAnchor?.(e.currentTarget);
          p.onWordTap(s.content_id, tok);
        }}
      >
        {content}
      </button>
    );
  };
  // The flowing paragraph's per-sentence span: word buttons inline,
  // scaffold small, and the quiet CONTENT-CONFIRM-001 control at the tail.
  const sentenceSpan = (s: StorySentence) => {
    const readingTokens = s.furigana?.split(/\s+/).filter(Boolean);
    const surfaceTokens = s.text.split(/\s+/).filter(Boolean);
    const rubyAligned =
      s.furigana !== null &&
      readingTokens !== undefined &&
      readingTokens.length === surfaceTokens.length;
    let body: React.ReactNode;
    if (s.furigana !== null && rubyAligned) {
      // ja path: Ruby renders inside the sentence spans, now per token —
      // one <ruby> per word, the reading annotating the whole word.
      body = surfaceTokens.flatMap((tok, i) => [
        i > 0 ? " " : null,
        wordButton(s, tok, <Ruby surface={tok} furigana={readingTokens[i]} />, `w${i}`),
      ]);
    } else if (s.furigana !== null) {
      // Furigana whose token runs do not align with the surface: the whole
      // sentence stays one Ruby run (word taps would mis-annotate it), and
      // the sentence span keeps its audio tap.
      body = <Ruby surface={s.text} furigana={s.furigana} />;
    } else {
      // READING-CLUTTER-001: bare word buttons — the pack's `labels`
      // sidecar never renders inline; the raw tag is internal notation,
      // and its human form lives in the word card.
      body = surfaceTokens.flatMap((tok, i) => [
        i > 0 ? " " : null,
        wordButton(s, tok, tok, `w${i}`),
      ]);
    }
    return (
      <span key={s.content_id} className="sentence" onClick={() => p.onPlaySentence(s.content_id)}>
        {body}
        {s.romaji && (
          <small className="sentence-romaji">
            {" "}
            <LatinText>{s.romaji}</LatinText>
          </small>
        )}
        {s.gloss && (
          <small className="sentence-gloss">
            {" "}
            <LatinText locale="en">{s.gloss}</LatinText>
          </small>
        )}
      </span>
    );
  };
  // READER-FLOW-001: the word card. Off-pack words get the honest
  // "not in your pack yet" line — no gloss is invented — and the Play
  // button only ever renders when `story_word_audio` actually answered.
  const wordCardRegion = () => {
    const wc = p.wordCard;
    if (!wc) return null;
    const card = wc.card;
    const sentence = p.storyActive?.sentences.find((s) => s.content_id === wc.sentenceId);
    // The tapped token's own grammar label, when the sidecar covers it.
    const tokenLabel = sentence?.labels.find((l) => l.token === wc.token)?.label;
    // Only words the view already ties to a pack content id can carry a
    // confirmation mark — the same ids `story_view` attributes marks to.
    const knownId = sentence ? knownFor(sentence, wc.token)?.id : undefined;
    return (
      <div
        ref={cardRef}
        role="group"
        aria-label="Word card"
        className="card word-card"
        tabIndex={-1}
        onKeyDown={(e) => {
          // The card is a transient surface: Escape closes it exactly like
          // the Close button (which returns focus to the tapped word).
          if (e.key === "Escape") p.onWordClose();
        }}
      >
        <p>
          <strong className="word-headword">
            <PackText tag="span">{card?.surface ?? wc.token}</PackText>
          </strong>
          {card?.reading && card.reading !== card.surface && (
            <>
              {" ("}
              <PackText tag="span">{card.reading}</PackText>
              {")"}
            </>
          )}
        </p>
        {card === null ? (
          <p className="empty">Looking this word up…</p>
        ) : card.in_pack ? (
          <>
            {card.gloss && (
              <p className="word-gloss">
                <LatinText locale="en">{card.gloss}</LatinText>
              </p>
            )}
            <p className="meta">
              <LatinText locale="en">
                {card.status ? `in your pack (${card.status})` : "in your pack"}
              </LatinText>
            </p>
            {card.lemma && (
              <p className="word-lemma">
                <LatinText locale="en">dictionary form: </LatinText>
                <PackText tag="span">{card.lemma}</PackText>
              </p>
            )}
          </>
        ) : card.aux_gloss ? (
          <>
            {/* READER-FLOW-001 off-pack slice: the offline auxiliary
                lexicon answered. Clearly labeled, attribution inline
                (ShareAlike), never claiming pack membership. */}
            <p className="word-gloss">
              <LatinText locale="en">{card.aux_gloss}</LatinText>
            </p>
            <p className="meta">
              <LatinText locale="en">
                not in your pack — offline auxiliary dictionary.
                {card.aux_source ? card.aux_source : ""}
              </LatinText>
            </p>
            {card.aux_word && (
              <p className="word-lemma">
                <LatinText locale="en">dictionary form: </LatinText>
                <PackText tag="span">{card.aux_word}</PackText>
              </p>
            )}
          </>
        ) : (
          <p className="empty">This word is not in your pack yet.</p>
        )}
        {p.grammarLabels && tokenLabel && (
          <p className="word-grammar">
            <small>Grammar in this sentence: </small>
            <PackText tag="span">{wc.token}</PackText>
            {" — "}
            <LatinText locale="en">{expandGrammarLabel(tokenLabel)}</LatinText>
          </p>
        )}
        <p className="btn-row">
          {p.wordAudioAvailable && (
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => p.onWordPlay(wc.sentenceId, wc.token)}
            >
              Play
            </button>
          )}
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() =>
              p.onMine(card?.surface ?? wc.token, card?.reading ?? null, card?.gloss ?? null)
            }
          >
            Mine
          </button>
          {/* VOCAB-BUILDER-001: the tap already recorded this word into
              My words — the state rides beside the still-working Mine
              button, and the copy makes no mastery claim. */}
          {card?.in_review && (
            <span role="status" className="meta word-in-review">
              <LatinText locale="en">In My words</LatinText>
            </span>
          )}
          {knownId && confirmControl(knownId)}
          <button type="button" className="btn btn--quiet" onClick={p.onWordClose}>
            Close
          </button>
        </p>
      </div>
    );
  };
  return (
    <section aria-label="Graded reading">
      <h1>
        {p.storyActive ? <PackText tag="span">{p.storyActive.title}</PackText> : "Graded reading"}
      </h1>
      <p className="empty">
        Read along at your level. Tap a word to open its card — meaning, audio, and Mine. Tap the
        rest of a sentence to hear that sentence. Reading is formative: nothing is scored or saved.
      </p>
      {p.storyError && (
        <p role="alert" className="alert">
          {p.storyError}
        </p>
      )}
      {!p.storyActive ? (
        p.storyList.length === 0 ? (
          <p className="empty">No stories are available in this pack yet.</p>
        ) : (
          <div role="group" aria-label="Stories" className="btn-row">
            {p.storyList.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn btn--quiet"
                onClick={() => p.onOpenStory(s.id)}
              >
                <PackText tag="span">{s.title}</PackText> ({s.sentence_count})
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="btn-row">
            <button type="button" className="btn btn--quiet" onClick={p.onBack}>
              All stories
            </button>
          </div>
          {/* One flowing paragraph: sentence spans whitespace-joined, word
              buttons inside them — not a button column. */}
          <PackText tag="p" className="reader-paragraph">
            {p.storyActive.sentences.flatMap((s, i) => [i > 0 ? " " : null, sentenceSpan(s)])}
          </PackText>
          {/* READING-CLUTTER-001: the single content-confirm surface for
              the story — outside the prose, quiet, with undo. */}
          {storyConfirmControl()}
          {wordCardRegion()}
        </>
      )}
    </section>
  );
}
