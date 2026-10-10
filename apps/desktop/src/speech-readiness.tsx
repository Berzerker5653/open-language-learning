/**
 * K-78/K-90: one readiness rule for every surface that plays pack audio
 * (pronunciation reference, shadowing model play, practice play, story
 * audio, dictation-adjacent listening). K-90 (ADR-0024) deleted runtime
 * synthesis, so exactly one audio-block token remains — the pack ships no
 * recording for this item — and no in-app setup can fix it: surfaces say
 * so plainly, and surfaces that can proceed text-first never pretend the
 * click worked.
 *
 * K-76 boundary this module must never cross: recording is mic-only.
 * Nothing in here gates a Record control on audio availability.
 */

/** The stable token the native audio miss emits before ": " (lib.rs
 * MEDIA_MISSING_CODE). Parsed once here, never re-invented per tab. */
export const AUDIO_BLOCK_TOKENS = ["media-asset-missing"] as const;

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

/** Whether the named failure is exactly the honest media miss (a pack that
 * ships no recording), as opposed to an unexpected transport error whose
 * raw text should surface instead. */
export function isMediaMissing(error: string): boolean {
  const at = error.indexOf(": ");
  return at > 0 && (AUDIO_BLOCK_TOKENS as readonly string[]).includes(error.slice(0, at));
}

/** What the shadowing surface's target area can honestly say (K-76/W-08):
 * a failed load must never read as "this pack has no targets" — the pack
 * may be fine while the read failed. */
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
