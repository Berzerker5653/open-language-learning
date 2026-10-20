/**
 * K-33 "my words": words the learner chose to keep, with the citation of where
 * they met them. Reviews are self-graded and stay on the device; they never
 * count as mastery evidence (that distinction is contractual, so the panel
 * states it in its own copy, not only the docs).
 *
 * Direction (RTL-001, ADR-0029): a mined surface and reading are pack-language
 * content, so the review card and the add-word inputs carry the active pack's
 * `dir`/`lang`. The meaning and citation fields are the learner's own notes and
 * stay untouched.
 */
import { PackText, usePackTextAttrs } from "@openlang/ui";
import { useKanaIME } from "./kana-ime";

export interface MineItem {
  id: string;
  surface: string;
  reading: string | null;
  gloss: string | null;
  source_citation: string;
  created_at: string;
  due_at: string | null;
}

export interface MineDraft {
  surface: string;
  reading: string;
  gloss: string;
  source: string;
}

export interface MyWordsPanelProps {
  items: MineItem[];
  review: { item: MineItem; revealed: boolean } | null;
  error: string | null;
  notice: string | null;
  draft: MineDraft;
  onDraftChange(field: keyof MineDraft, value: string): void;
  onAdd(): void;
  onRemove(id: string): void;
  onGrade(again: boolean): void;
  onReviewNow(id: string): void;
  onStartNewReview(): void;
  onStartReview(): void;
  onReveal(): void;
  /// Issue #2 phase 1: in-app kana keyboard for the surface/reading fields.
  kanaInput?: boolean;
}

export function MyWordsPanel(p: MyWordsPanelProps) {
  const packAttrs = usePackTextAttrs();
  const kanaSurface = useKanaIME({
    enabled: p.kanaInput === true,
    value: p.draft.surface,
    onDraft: (v) => p.onDraftChange("surface", v),
  });
  const kanaReading = useKanaIME({
    enabled: p.kanaInput === true,
    value: p.draft.reading,
    onDraft: (v) => p.onDraftChange("reading", v),
  });
  return (
    <section aria-label="My words">
      <h1>My words</h1>
      <p className="empty">
        Words you chose to keep, with where you met them. Reviews are self-graded and stay on this
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
        <div className="field">
          <PackText tag="p" className="prompt">
            {p.review.item.surface}
          </PackText>
          {p.review.revealed ? (
            <>
              {p.review.item.gloss ? (
                <p>{p.review.item.gloss}</p>
              ) : p.review.item.reading ? (
                <p {...packAttrs}>{p.review.item.reading}</p>
              ) : (
                <p>(no gloss)</p>
              )}
              <p className="notice">Met in: {p.review.item.source_citation}</p>
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
            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={p.onReveal}>
                Reveal
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={p.onStartReview}>
            Review due words
          </button>
          {p.items.some((m) => !m.due_at) && (
            <button type="button" className="btn btn--quiet" onClick={p.onStartNewReview}>
              Review new words
            </button>
          )}
        </div>
      )}
      <div className="field">
        <label htmlFor="mine-surface">Word or phrase</label>
        <input
          id="mine-surface"
          value={p.draft.surface}
          onKeyDown={kanaSurface.onKeyDown}
          onChange={(e) => {
            kanaSurface.noteExternalEdit();
            p.onDraftChange("surface", e.target.value);
          }}
          {...packAttrs}
        />
        <label htmlFor="mine-reading">Reading (optional)</label>
        <input
          id="mine-reading"
          value={p.draft.reading}
          onKeyDown={kanaReading.onKeyDown}
          onChange={(e) => {
            kanaReading.noteExternalEdit();
            p.onDraftChange("reading", e.target.value);
          }}
          {...packAttrs}
        />
        <label htmlFor="mine-gloss">Meaning (optional)</label>
        <input
          id="mine-gloss"
          value={p.draft.gloss}
          onChange={(e) => p.onDraftChange("gloss", e.target.value)}
        />
        <label htmlFor="mine-source">Where did you meet it? (citation)</label>
        <input
          id="mine-source"
          value={p.draft.source}
          onChange={(e) => p.onDraftChange("source", e.target.value)}
        />
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={p.draft.surface.trim() === ""}
            onClick={p.onAdd}
          >
            Add to my words
          </button>
        </div>
      </div>
      {p.items.length === 0 ? (
        <p className="empty">Nothing mined yet. Add a word above or from a story lookup.</p>
      ) : (
        <ul>
          {p.items.map((m) => (
            <li key={m.id}>
              <PackText tag="span">{m.surface}</PackText>
              {m.reading ? (
                <>
                  {" ("}
                  <PackText tag="span">{m.reading}</PackText>
                  {")"}
                </>
              ) : (
                ""
              )}
              {m.gloss ? ` — ${m.gloss}` : ""}
              {"  ·  "}
              <small>
                {m.source_citation}
                {m.due_at ? ` · due ${m.due_at.slice(0, 10)}` : " · not scheduled yet"}
              </small>
              {"  "}
              {!m.due_at && (
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => p.onReviewNow(m.id)}
                >
                  Review now
                </button>
              )}
              {"  "}
              <button type="button" className="btn btn--quiet" onClick={() => p.onRemove(m.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
