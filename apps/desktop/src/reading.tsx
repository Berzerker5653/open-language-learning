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

export interface StorySentence {
  content_id: string;
  text: string;
  furigana: string | null;
  romaji: string | null;
  faded_by_mastery: boolean;
  gloss: string | null;
  status: string;
  known: StoryWord[];
}

export interface Story {
  id: string;
  title: string;
  sentences: StorySentence[];
  status: string;
}

export interface ReadingPanelProps {
  storyList: StorySummary[];
  storyActive: Story | null;
  /// `content_id` of the sentence whose word lookup is open, else null.
  storyLookup: string | null;
  storyError: string | null;
  onOpenStory(id: string): void;
  onBack(): void;
  onPlaySentence(contentId: string): void;
  onToggleLookup(contentId: string): void;
  onMine(surface: string, reading: string | null, gloss: string): void;
}

export function ReadingPanel(p: ReadingPanelProps) {
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
                <PackText tag="span">
                  <Ruby surface={s.text} furigana={s.furigana} />
                </PackText>
              </button>
              {s.romaji && (
                <p>
                  <small>
                    <LatinText>{s.romaji}</LatinText>
                  </small>
                </p>
              )}
              {p.storyLookup === s.content_id && (
                <div role="group" aria-label="Word lookup">
                  {s.gloss && (
                    <p className="notice">
                      <LatinText>{s.gloss}</LatinText>
                    </p>
                  )}
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
