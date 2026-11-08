/**
 * K-31 shadowing: play the model audio, speak along, play the attempt back.
 * Formative practice — nothing is scored or saved.
 *
 * The target read must never blur "still loading" with "this pack has no
 * targets" (K-76/W-08): `shadowTargetsState` decides which of the three states
 * to render, and the failure state names the load error instead of showing an
 * empty-pack message.
 *
 * Direction (RTL-001, ADR-0029): the target surface is pack text and carries
 * the pack's `dir`/`lang`; `reading` is the pack-script scaffold and follows
 * the pack, while `romaji` is Latin transliteration pinned LTR.
 */
import { LatinText, PackText, usePackTextAttrs } from "@openlang/ui";
import { shadowTargetsState } from "./speech-readiness";
import { activeTokenIndex, alignSurfaceTokens, type WordSpan } from "./word-timing";

export interface ShadowTarget {
  content_id: string;
  surface: string;
  reading: string | null;
  romaji: string | null;
  /// WORD-TIMING-001: in-clip word timings from the pack's optional
  /// `media/words.jsonl` sidecar; absent/empty renders the plain surface.
  words?: WordSpan[];
}

export interface ShadowingPanelProps {
  /// null until the pack's targets load.
  items: ShadowTarget[] | null;
  index: number;
  error: string | null;
  audioMsg: string | null;
  recording: boolean;
  attemptUrl: string | null;
  /// WORD-TIMING-001: current in-clip playback clock (seconds), null while
  /// nothing of this clip is playing. Drives the karaoke highlight.
  playTime?: number | null;
  onRetry(): void;
  onOpenSetup(): void;
  onPlayModel(): void;
  onRecord(): void;
  onStop(): void;
  onPlayAttempt(): void;
  onStep(delta: number): void;
  /// WORD-TIMING-001: play only this word's span (click-to-hear-word).
  onPlayWord?(span: WordSpan): void;
}

export function ShadowingPanel(p: ShadowingPanelProps) {
  const packAttrs = usePackTextAttrs();
  const current = p.items ? (p.items[p.index] ?? null) : null;
  const total = p.items?.length ?? 0;
  // WORD-TIMING-001: karaoke only where the sidecar aligned with the surface;
  // `tokens === null` (no sidecar, or nothing lines up) keeps the plain
  // pre-feature render byte-for-byte.
  const tokens =
    current?.words && current.words.length > 0
      ? alignSurfaceTokens(current.surface, current.words)
      : null;
  const active = tokens ? activeTokenIndex(tokens, p.playTime ?? null) : null;
  return (
    <section aria-label="Shadowing">
      <h1>Shadowing</h1>
      <p className="empty">
        Play the model audio, speak along with it, then play your recording back. Shadowing is
        formative practice: nothing is scored or saved.
      </p>
      {p.error && (
        <p role="alert" className="alert">
          {p.error}
        </p>
      )}
      {p.audioMsg && (
        <p role="status" className="notice">
          {p.audioMsg}
        </p>
      )}
      {!current ? (
        shadowTargetsState(p.items, p.error) === "error" ? (
          <div>
            <p className="empty">
              The shadowing targets could not be loaded, so the practice controls are not shown.
              This is a load failure, not an empty pack.
            </p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={p.onRetry}>
                Retry
              </button>
              <button type="button" className="btn btn--quiet" onClick={p.onOpenSetup}>
                Check language and speech setup
              </button>
            </div>
          </div>
        ) : shadowTargetsState(p.items, p.error) === "loading" ? (
          <p className="empty" role="status">
            Loading shadowing targets from the installed pack…
          </p>
        ) : (
          <p className="empty">No shadowing targets are available in this pack yet.</p>
        )
      ) : (
        <>
          {tokens ? (
            <PackText tag="p" className="surface">
              {tokens.map((token, i) => {
                const cls = i === active ? "word word--active" : "word";
                return token.span && p.onPlayWord ? (
                  <button
                    key={i}
                    type="button"
                    className={cls}
                    aria-label={`Play “${token.span.w}”`}
                    onClick={() => token.span && p.onPlayWord?.(token.span)}
                  >
                    {token.text}
                  </button>
                ) : (
                  <span key={i} className={token.span ? cls : undefined}>
                    {token.text}
                  </span>
                );
              })}
            </PackText>
          ) : (
            <PackText tag="p" className="surface">
              {current.surface}
            </PackText>
          )}
          {current.reading && (
            <p className="reading" {...packAttrs}>
              {current.reading}
            </p>
          )}
          {!current.reading && current.romaji && (
            <p className="reading">
              <LatinText>{current.romaji}</LatinText>
            </p>
          )}
          <div className="btn-row">
            <button type="button" className="btn" onClick={p.onPlayModel}>
              Play model audio
            </button>
            {!p.recording ? (
              <button type="button" className="btn" onClick={p.onRecord}>
                Record
              </button>
            ) : (
              <button type="button" className="btn" onClick={p.onStop}>
                Stop
              </button>
            )}
            {p.attemptUrl && (
              <button type="button" className="btn btn--quiet" onClick={p.onPlayAttempt}>
                Play my recording
              </button>
            )}
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--quiet"
              disabled={p.index === 0}
              onClick={() => p.onStep(-1)}
            >
              Previous
            </button>
            <span>
              {p.index + 1} / {total}
            </span>
            <button
              type="button"
              className="btn btn--quiet"
              disabled={p.index >= total - 1}
              onClick={() => p.onStep(1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
