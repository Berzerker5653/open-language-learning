/**
 * WORD-TIMING-001: word-level clip timings (karaoke highlight +
 * click-to-hear-word) for the shadowing surface.
 *
 * The pack's optional `media/words.jsonl` sidecar ships per-clip spans
 * (`{ w, s, e }`, seconds in-clip, `w` the exact pack-text token). The
 * native layer attaches them to each shadowing item; this module owns the
 * two pure decisions the UI depends on:
 *
 * 1. `alignSurfaceTokens` maps spans onto the rendered surface tokens. The
 *    sidecar was generated from this same text, so spans appear in token
 *    order; matching is positional and exact. If nothing lines up (sidecar
 *    from different text, script without whitespace tokenization, etc.) it
 *    returns null and the surface renders exactly as before.
 * 2. `activeTokenIndex` answers which timed token covers a playback clock
 *    time — the karaoke highlight.
 */

export interface WordSpan {
  /// exact pack-text token (stress marks preserved)
  w: string;
  /// in-clip start, seconds
  s: number;
  /// in-clip end, seconds
  e: number;
}

export interface SurfaceToken {
  /// rendered text of this token plus its original trailing separator
  text: string;
  /// the clip span covering this token; null when the sidecar abstains
  span: WordSpan | null;
}

/**
 * Align sidecar spans to the surface's whitespace-separated tokens.
 * Returns null when no span matches, so callers can fall back to the
 * pre-feature plain render instead of a half-highlighted surface.
 */
export function alignSurfaceTokens(surface: string, words: WordSpan[]): SurfaceToken[] | null {
  if (words.length === 0) return null;
  // Split on whitespace runs, keeping each run attached to the token before
  // it so the reconstruction is byte-identical to `surface`.
  const parts = surface.split(/(\s+)/);
  const tokens: SurfaceToken[] = [];
  let next = 0;
  for (let i = 0; i < parts.length; i += 2) {
    const word = parts[i] ?? "";
    const sep = parts[i + 1] ?? "";
    if (word === "") continue;
    const candidate = next < words.length ? words[next]! : null;
    const span = candidate !== null && candidate.w === word ? candidate : null;
    if (span !== null) next++;
    tokens.push({ text: word + sep, span });
  }
  return tokens.some((t) => t.span !== null) ? tokens : null;
}

/**
 * Index of the token whose span contains `time` (half-open `[s, e)`), or
 * null when the clock is outside every span. Tokens without spans never
 * activate.
 */
export function activeTokenIndex(tokens: SurfaceToken[], time: number | null): number | null {
  if (time === null) return null;
  for (let i = 0; i < tokens.length; i++) {
    const span = tokens[i]?.span;
    if (span && span.s <= time && time < span.e) return i;
  }
  return null;
}

/** True when this token may be clicked to hear only its span. */
export function playableToken(token: SurfaceToken): token is SurfaceToken & { span: WordSpan } {
  return token.span !== null;
}
