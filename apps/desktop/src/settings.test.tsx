// SETTINGS-001 UI contract: the mic control mirrors the stored setting,
// Delete is a two-step confirmation (never fires from the first control),
// Export reports the written path, and no copy claims a capability this
// build lacks (the speech-runtime limit is stated and pointed at the page
// that reports it; choosing a model never supplies a missing runtime).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Settings, type SettingsProps } from "./settings";

const base: SettingsProps = {
  microphoneEnabled: false,
  onSetMicrophone: () => {},
  romajiMode: "auto",
  onSetRomajiMode: () => {},
  speechModel: "off",
  speechModels: [
    {
      id: "org.openlanguage.speech.whisper-ggml-tiny",
      version: "1.0.0",
      license_code: "MIT",
      installed: false,
      size_bytes: 77691713,
    },
  ],
  onSelectSpeechModel: () => {},
  exportPath: null,
  onExport: () => {},
  deleteArmed: false,
  onArmDelete: () => {},
  onCancelDelete: () => {},
  onConfirmDelete: () => {},
  error: null,
};

function render(over: Partial<SettingsProps> = {}): string {
  return renderToStaticMarkup(<Settings {...base} {...over} />);
}

describe("settings", () => {
  it("the microphone control reflects the stored value", () => {
    expect(render({ microphoneEnabled: true })).toMatch(/id="mic-enabled"[^>]*checked=""/);
    expect(render({ microphoneEnabled: false })).not.toMatch(/id="mic-enabled"[^>]*checked/);
    expect(render()).toContain("never blocks progress");
  });

  it("the romaji control reflects the stored mode", () => {
    // React SSR emits `checked=""` before `value=` on checked radios.
    expect(render({ romajiMode: "off" })).toMatch(/checked="" value="off"/);
    expect(render({ romajiMode: "auto" })).toMatch(/checked="" value="auto"/);
    expect(render({ romajiMode: "always" })).toMatch(/checked="" value="always"/);
    expect(render({ romajiMode: "off" })).not.toMatch(/checked="" value="auto"/);
    // The scaffold policy's promise: never gates progression.
    expect(render()).toContain("never blocks progression");
  });

  it("delete requires a second explicit confirmation before it can fire", () => {
    const disarmed = render({ deleteArmed: false });
    // Only the arming control exists; no confirm control to fire on.
    expect(disarmed).toContain("Delete profile data");
    expect(disarmed).not.toContain("Yes, delete");
    const armed = render({ deleteArmed: true });
    expect(armed).toContain("Yes, delete this profile and all its local data");
    expect(armed).toContain("Cancel");
  });

  it("export reports where the file went", () => {
    expect(render()).not.toContain("Export written to");
    const html = render({
      exportPath: "/home/x/.local/share/openlang/exports/prof-abc-2026-10-08T120000Z.json",
    });
    expect(html).toContain("Export written to:");
    expect(html).toContain("prof-abc-2026-10-08T120000Z.json");
    // Recordings stay out; the UI says so.
    expect(html).toContain("Recording metadata is not included");
  });

  it("makes no capability claim this build lacks", () => {
    const html = render({
      microphoneEnabled: true,
      speechModel: "org.openlanguage.speech.whisper-ggml-tiny",
    });
    // The runtime limit is stated, not glossed over — and Settings states it
    // as a limit, not as a build-wide claim about which runtimes exist.
    expect(html).toContain("need a speech runtime");
    expect(html).toContain("states whether this build carries one");
    expect(html).toContain("does not change that");
    // No "install a model in Settings to get feedback" promise.
    expect(html).not.toMatch(/install a speech model in Settings/i);
    expect(html).not.toMatch(/to get feedback/i);
    expect(html).not.toMatch(/fluent/i);
  });
});
