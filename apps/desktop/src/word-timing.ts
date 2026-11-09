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

/// Clock pump options: the karaoke clock plus the optional word-span window.
export interface KaraokeClockOpts {
  onTime: (t: number | null) => void;
  startAt?: number;
  stopAt?: number;
  /// injectable frame source so the pump is testable without a real rAF
  requestFrame?: (cb: () => void) => number;
  cancelFrame?: (id: number) => void;
}

/// Drive the karaoke clock from an <audio> element.
///
/// Two webview facts make `timeupdate`-only unreliable: WebKitGTK (and
/// short blob clips in general) can starve it to zero events before
/// `ended` fires, and a software-rendered webview (no compositor) never
/// runs `requestAnimationFrame` at all — both observed on the same
/// device. So the pump samples `currentTime` on a 100 ms TIMER while the
/// element plays (timers do not need a compositor), and keeps
/// `timeupdate` as a second source. Seeking once to `startAt` and
/// pausing at `stopAt` implements click-to-hear-word windows.
/// Returns a disposer that stops the pump.
export function attachKaraokeClock(audio: HTMLAudioElement, opts: KaraokeClockOpts): () => void {
  const requestFrame = opts.requestFrame ?? ((cb) => window.setTimeout(cb, 100));
  const cancelFrame = opts.cancelFrame ?? ((id) => window.clearTimeout(id));
  let frame = 0;
  const stopPump = () => {
    if (frame !== 0) cancelFrame(frame);
    frame = 0;
  };
  const pastStop = () => {
    if (opts.stopAt !== undefined && audio.currentTime >= opts.stopAt) {
      audio.pause();
      stopPump();
      opts.onTime(null);
      return true;
    }
    return false;
  };
  const pump = () => {
    frame = 0;
    if (audio.paused || audio.ended) return;
    if (pastStop()) return;
    opts.onTime(audio.currentTime);
    frame = requestFrame(pump);
  };
  const startPump = () => {
    if (frame === 0) frame = requestFrame(pump);
  };
  const handlers: Array<[string, EventListener]> = [
    ["play", () => startPump()],
    ["playing", () => startPump()],
    [
      "timeupdate",
      () => {
        if (!pastStop()) opts.onTime(audio.currentTime);
      },
    ],
    ["pause", stopPump],
    ["ended", stopPump],
  ];
  for (const [ev, fn] of handlers) audio.addEventListener(ev, fn as EventListener);
  if (opts.startAt !== undefined) {
    audio.addEventListener("loadedmetadata", () => {
      audio.currentTime = opts.startAt as number;
    });
  }
  return stopPump;
}
