// K-78/K-76 frontend contract: the engine's audio-block tokens are parsed
// once (never per-tab), only speech-chain tokens get the setup affordance,
// and a shadowing target-load failure is never displayed as an empty pack.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  audioFailureMessage,
  fixableBySpeechSetup,
  shadowTargetsState,
  SpeechSetupNotice,
} from "./speech-readiness";

const RUNTIME_ERR =
  "tts-runtime-unavailable: The sherpa-onnx speech runtime is not installed, so there is no model audio for this item. Install it under Speech setup to hear pronunciation, shadowing, story and dictation audio.";

describe("audio failure copy (K-78)", () => {
  it("reveals the engine's sentence from a tokenized block", () => {
    expect(audioFailureMessage(RUNTIME_ERR)).toBe(
      "The sherpa-onnx speech runtime is not installed, so there is no model audio for this item. Install it under Speech setup to hear pronunciation, shadowing, story and dictation audio.",
    );
  });

  it("passes un-tokenized errors through unchanged", () => {
    expect(audioFailureMessage("pack not installed")).toBe("pack not installed");
    expect(audioFailureMessage("some: other: thing")).toBe("some: other: thing");
  });

  it("offers speech setup only where an install can fix it", () => {
    expect(fixableBySpeechSetup(RUNTIME_ERR)).toBe(true);
    expect(fixableBySpeechSetup("tts-voice-unavailable: x")).toBe(true);
    expect(fixableBySpeechSetup("tts-chain-unavailable: x")).toBe(true);
    // A pack that ships no recording is not fixed by installing speech.
    expect(
      fixableBySpeechSetup("the installed version of this pack ships no reference recording"),
    ).toBe(false);
  });

  it("renders the message verbatim with one setup control", () => {
    const html = renderToStaticMarkup(
      <SpeechSetupNotice
        message="The Kokoro Japanese voice is not installed."
        onOpenSetup={() => {}}
      />,
    );
    expect(html).toContain("The Kokoro Japanese voice is not installed.");
    expect(html).toContain("Set up speech");
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
