/**
 * K-78: one readiness rule for every surface that plays model audio
 * (pronunciation reference, shadowing model play, practice play, story
 * audio, dictation-adjacent listening). The rule the engine enforces
 * server-side — an unavailable chain names WHICH component is missing —
 * has one frontend half here: the block tokens `speech_audio`/
 * `reference_audio` emit are parsed once, never re-invented per tab, and
 * surfaces that can proceed text-first say the audio is unavailable
 * rather than pretending the click worked.
 *
 * K-76 boundary this module must never cross: recording is mic-only.
 * Nothing in here gates a Record control on the TTS chain.
 */

/** Stable tokens the native audio block emits before ": " (lib.rs audio_block). */
export const AUDIO_BLOCK_TOKENS = [
  "tts-runtime-unavailable",
  "tts-voice-unavailable",
  "tts-chain-unavailable",
] as const;

/** The human sentence out of a blocked-audio error, verbatim from the engine.
 * Un-tokenized errors pass through unchanged — the engine's honesty contract
 * means its `String(e)` payloads are already learner-readable. */
export function audioFailureMessage(error: string): string {
  const at = error.indexOf(": ");
  if (at > 0 && (AUDIO_BLOCK_TOKENS as readonly string[]).includes(error.slice(0, at))) {
    return error.slice(at + 2);
  }
  return error;
}

/** Whether the named failure is fixable through the in-app speech setup
 * (runtime/voice install) — as opposed to, say, a pack that ships no
 * licensed recording for this item, where setup cannot help. */
export function fixableBySpeechSetup(error: string): boolean {
  const at = error.indexOf(": ");
  return at > 0 && (AUDIO_BLOCK_TOKENS as readonly string[]).includes(error.slice(0, at));
}

/** What the shadowing surface's target area can honestly say (K-76/W-08):
 * a failed load must never read as "this pack has no targets" — the pack
 * may be fine while the read (or the install) failed. */
export function shadowTargetsState(
  items: { length: number } | null,
  error: string | null,
): "loading" | "error" | "empty" | "ready" {
  if (error) return "error";
  if (items === null) return "loading";
  return items.length === 0 ? "empty" : "ready";
}

/** One inline affordance shared by every audio-blocked surface: the plain
 * sentence the engine wrote, plus the route to the ONE speech setup unit —
 * never three separate catalog ids (K-76), never silence (K-78). */
export function SpeechSetupNotice(props: { message: string; onOpenSetup: () => void }) {
  return (
    <p className="notice" role="status">
      {props.message}{" "}
      <button type="button" className="btn btn--quiet" onClick={props.onOpenSetup}>
        Set up speech
      </button>
    </p>
  );
}
