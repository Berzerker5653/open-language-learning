/**
 * READ-002 graded reading: story list, sentence-by-sentence reading with
 * audio, word lookup, and mining into "my words". Reading is formative —
 * nothing here is scored or saved unless the learner mines a word.
 *
 * Direction (RTL-001, ADR-0029): story titles, sentence surfaces and looked-up
 * words are pack text, so they carry the active pack's `dir`/`lang` through
 * `PackText`. Romaji and the sentence gloss are Latin scaffolding and stay
 * `dir="ltr"` inside an RTL block; the explanatory prose is app chrome and is
 * never flipped.
 */
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
   * pack ships no sidecar (or nothing in the sentence is labelable). */
  labels: TokenLabel[];
}

/** Full-form expansions for the compact labels, shown in the lookup panel
 * (the card's "abbreviate with tap-for-full-form via the existing word
 * card"). Keyed by the dot-separated atoms `build-grammar-labels.py` emits. */
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

export interface ReadingPanelProps {
  storyList: StorySummary[];
  storyActive: Story | null;
  /// `content_id` of the sentence whose word lookup is open, else null.
  storyLookup: string | null;
  storyError: string | null;
  /// Display name of the signed-in profile — the learner's OWN marks are
  /// the only ones the toggle can retract (the engine scopes it by
  /// profile id; the name match only picks the button's label).
  profileName: string;
  /// GRAMMAR-LABELS-001: the global show/hide for interlinear grammar
  /// labels (per-profile display setting; true until the learner turns
  /// it off). Labels only ever appear where the pack ships them.
  grammarLabels: boolean;
  onOpenStory(id: string): void;
  onBack(): void;
  onPlaySentence(contentId: string): void;
  onToggleLookup(contentId: string): void;
  onMine(surface: string, reading: string | null, gloss: string): void;
  onConfirm(contentId: string): void;
  onUnconfirm(contentId: string): void;
}

export function ReadingPanel(p: ReadingPanelProps) {
  // CONTENT-CONFIRM-001: the only "checked by" surface in the app. The
  // mark is created ONLY by this explicit button click (acceptance 2),
  // and the copy says "confirmed by <names>" — never verified, expert,
  // or reviewed (docs/18).
  const marksFor = (contentId: string): ConfirmedByName[] =>
    p.storyActive?.confirmations?.[contentId] ?? [];
  // GRAMMAR-LABELS-001: interlinear render. Tokens split on whitespace
  // runs exactly like the sidecar builder (`build-grammar-labels.py`
  // `tokenize`), so raw tokens (punctuation and any authored stress
  // intact) verify alignment before a label attaches. A token the sidecar
  // does not cover stays bare text — silent degradation, no layout shift;
  // a repeated token consumes its labels in sidecar order.
  const interlinear = (s: StorySentence) => {
    const remaining = [...s.labels];
    return s.text
      .split(/\s+/)
      .filter(Boolean)
      .map((tok) => {
        const at = remaining.findIndex((l) => l.token === tok);
        const hit = at >= 0 ? remaining.splice(at, 1)[0] : undefined;
        return hit ? { token: tok, label: hit.label } : { token: tok };
      });
  };
  // The label rides under the token; the compact form is always visible,
  // the full-form expansion appears in the lookup panel below.
  const sentenceText = (s: StorySentence) =>
    p.grammarLabels && s.labels.length > 0 && s.furigana === null ? (
      <PackText tag="span">
        {interlinear(s).map((w, i) => (
          <span key={i} className="il-token">
            {w.token}
            {w.label ? (
              <span className="il-label">{w.label}</span>
            ) : (
              <span className="il-label il-label--empty" aria-hidden="true" />
            )}
          </span>
        ))}
      </PackText>
    ) : (
      <PackText tag="span">
        <Ruby surface={s.text} furigana={s.furigana} />
      </PackText>
    );
  const confirmControl = (contentId: string) => {
    const marks = marksFor(contentId);
    const mine = marks.some((c) => c.display_name === p.profileName);
    return (
      <>
        <button
          type="button"
          className="btn btn--quiet"
          aria-pressed={mine}
          onClick={() => (mine ? p.onUnconfirm(contentId) : p.onConfirm(contentId))}
        >
          {mine ? "Undo" : "This looks right"}
        </button>
        {marks.length > 0 && (
          <span className="notice">
            {"Confirmed by " + marks.map((c) => c.display_name).join(", ")}
          </span>
        )}
      </>
    );
  };
  return (
    <section aria-label="Graded reading">
      <h1>
        {p.storyActive ? <PackText tag="span">{p.storyActive.title}</PackText> : "Graded reading"}
      </h1>
      <p className="empty">
        Read along at your level. Tapping a sentence plays its audio and looks up the words from
        your pack that appear in it. Reading is formative: nothing is scored or saved.
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
          {p.storyActive.sentences.map((s) => (
            <div key={s.content_id} className="field">
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => {
                  p.onToggleLookup(s.content_id);
                  p.onPlaySentence(s.content_id);
                }}
              >
                {sentenceText(s)}
              </button>
              {s.romaji && (
                <p>
                  <small>
                    <LatinText>{s.romaji}</LatinText>
                  </small>
                </p>
              )}
              {marksFor(s.content_id).length > 0 && (
                <p className="notice">
                  {"Confirmed by " +
                    marksFor(s.content_id)
                      .map((c) => c.display_name)
                      .join(", ") +
                    "."}
                </p>
              )}
              {p.storyLookup === s.content_id && (
                <div role="group" aria-label="Word lookup">
                  {s.gloss && (
                    <p className="notice">
                      <LatinText>{s.gloss}</LatinText>
                    </p>
                  )}
                  {/* GRAMMAR-LABELS-001 acceptance 4: the compact label is
                      always visible in the line; the full form rides the
                      lookup card, same panel that carries the word glosses. */}
                  {s.labels.length > 0 && (
                    <div className="field">
                      <p>
                        <small>Grammar in this sentence:</small>
                      </p>
                      <ul>
                        {s.labels.map((l, i) => (
                          <li key={`${l.token}-${i}`}>
                            <PackText tag="span">{l.token}</PackText>
                            {" — "}
                            <LatinText locale="en">{expandGrammarLabel(l.label)}</LatinText>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="btn-row">{confirmControl(s.content_id)}</p>
                  {s.known.length === 0 ? (
                    <p className="empty">No pack words match this sentence yet.</p>
                  ) : (
                    <ul>
                      {s.known.map((w) => (
                        <li key={w.id}>
                          <PackText tag="span">{w.surface}</PackText>
                          {w.reading ? (
                            <>
                              {" ("}
                              <PackText tag="span">{w.reading}</PackText>
                              {")"}
                            </>
                          ) : (
                            ""
                          )}
                          {w.romaji ? (
                            <>
                              {" "}
                              <LatinText>{w.romaji}</LatinText>
                            </>
                          ) : (
                            ""
                          )}
                          {" — "}
                          <LatinText locale="en">{w.gloss}</LatinText>
                          {"  "}
                          <button
                            type="button"
                            className="btn btn--quiet"
                            onClick={() => p.onMine(w.surface, w.reading, w.gloss)}
                          >
                            Mine
                          </button>
                          {"  "}
                          {confirmControl(w.id)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
