// K-78/K-90 frontend contract: the engine's single audio-block token is
// parsed once (never per-tab), the media miss is recognized as such (no
// setup can fix it), and a shadowing target-load failure is never displayed
// as an empty pack.
import { describe, expect, it } from "vitest";
import { audioFailureMessage, isMediaMissing, shadowTargetsState } from "./speech-readiness";

const MEDIA_ERR =
  "media-asset-missing: This pack does not ship audio for this item, and the app never synthesizes speech, so there is nothing to play.";

describe("audio failure copy (K-78/K-90)", () => {
  it("reveals the engine's sentence from a tokenized block", () => {
    expect(audioFailureMessage(MEDIA_ERR)).toBe(
      "This pack does not ship audio for this item, and the app never synthesizes speech, so there is nothing to play.",
    );
  });

  it("passes un-tokenized errors through unchanged", () => {
    expect(audioFailureMessage("pack not installed")).toBe("pack not installed");
    expect(audioFailureMessage("some: other: thing")).toBe("some: other: thing");
  });

  it("recognizes the media miss, and only it", () => {
    expect(isMediaMissing(MEDIA_ERR)).toBe(true);
    // The deleted synthesis-chain tokens are not special anymore: they are
    // unexpected payloads and must surface raw.
    expect(isMediaMissing("tts-runtime-unavailable: x")).toBe(false);
    // A transport error is not the honest media sentence.
    expect(isMediaMissing("ipc timeout")).toBe(false);
  });
});

describe("shadowing target states (K-76/W-08)", () => {
  it("a failed load is an error state, never the empty-pack sentence", () => {
    expect(shadowTargetsState([], "pack not installed")).toBe("error");
    expect(shadowTargetsState(null, "no active language pack")).toBe("error");
  });

  it("distinguishes still-loading, truly empty, and ready", () => {
    expect(shadowTargetsState(null, null)).toBe("loading");
    expect(shadowTargetsState([], null)).toBe("empty");
    expect(shadowTargetsState([{ length: 0 }], null)).toBe("ready");
  });
});
