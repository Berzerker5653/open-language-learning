/**
 * R14: object-URL lifetime and playback failure visibility.
 *
 * The app holds two kinds of clip URL. A one-shot clip (a reference audio
 * decoded from a base64 response) belongs to a single playback and must be
 * revoked when the webview is done with it, or every played clip pins its
 * sample for the session. A retained clip — the learner's own recorded
 * attempt — is app state: it has to survive every replay until it is
 * replaced or the screen unmounts. Revoking it after one play turned "Hear
 * your attempt" into a dead URL that failed without saying anything.
 */

export const PLAYBACK_FAILED =
  "That recording could not be played. Try again, or use text practice.";

/** The part of `HTMLMediaElement` this policy actually depends on. */
export interface ClipLike {
  play(): Promise<void>;
  addEventListener(type: string, listener: () => void): void;
}

export function playClip(opts: {
  url: string;
  retained: boolean;
  audio: ClipLike;
  revoke: (url: string) => void;
  onError: (message: string) => void;
  onClearError?: () => void;
}): void {
  const release = () => {
    if (!opts.retained) opts.revoke(opts.url);
  };
  const fail = () => opts.onError(PLAYBACK_FAILED);
  opts.onClearError?.();
  opts.audio.addEventListener("ended", release);
  opts.audio.addEventListener("error", () => {
    release();
    fail();
  });
  void opts.audio.play().then(
    () => {
      /* `ended` or `error` settles the URL for this clip */
    },
    () => {
      release();
      fail();
    },
  );
}
