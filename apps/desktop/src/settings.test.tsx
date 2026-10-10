// SETTINGS-001 + K-77 UI contract: the mic control mirrors the stored
// setting, Delete is a two-step confirmation (never fires from the first
// control), and Export reports the written path. K-77: the Speech card is
// the ONLY place for speech models — exactly one picker, plus the TTS
// payload list and the runtime-availability statement folded in from the
// removed Languages tab. No copy claims a capability this build lacks.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Settings, type SettingsProps } from "./settings";

const base: SettingsProps = {
  microphoneEnabled: false,
  onSetMicrophone: () => {},
  microphoneDevice: null,
  microphoneDevices: [],
  onPickMicrophone: () => {},
  onDetectMicrophones: () => {},
  romajiMode: "auto",
  onSetRomajiMode: () => {},
  speechModel: "off",
  speechModels: [
    {
      id: "org.openlanguage.speech.whisper-ggml-tiny",
      version: "1.0.0",
      license_code: "MIT",
      installed: false,
      installable: true,
      size_bytes: 77691713,
    },
  ],
  onSelectSpeechModel: () => {},
  tts: { source: "none", components: [], models: [] },
  onInstallModel: () => {},
  onDeleteModel: () => {},
  aligner: null,
  deviceTier: null,
  exportPath: null,
  onExport: () => {},
  deleteArmed: false,
  onArmDelete: () => {},
  onCancelDelete: () => {},
  onConfirmDelete: () => {},
  switchArmed: false,
  onArmSwitch: () => {},
  onCancelSwitch: () => {},
  onConfirmSwitch: () => {},
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

  it("the microphone picker reflects the stored device and admits when names are unavailable", () => {
    // K-64: the picker shows the stored device as selected, offers "System
    // default" as a real choice, and never invents device names.
    const withDevice = render({
      microphoneDevice: "mic-headset",
      microphoneDevices: [{ deviceId: "mic-headset", label: "Headset Microphone" }],
    });
    const options = withDevice.match(/<option[^>]*>/g) ?? [];
    expect(options.some((t) => t.includes("selected") && t.includes('value="mic-headset"'))).toBe(
      true,
    );
    expect(withDevice).toContain("Headset Microphone");
    const onDefault = render({
      microphoneDevice: null,
      microphoneDevices: [{ deviceId: "mic-headset", label: "Headset Microphone" }],
    });
    const defaultOptions = onDefault.match(/<option[^>]*>/g) ?? [];
    expect(defaultOptions.some((t) => t.includes("selected") && t.includes('value=""'))).toBe(true);
    // No grant yet: honest copy instead of an empty picker.
    expect(render({ microphoneDevices: [] })).toContain("allow microphone access once");
    expect(render({ microphoneDevices: [{ deviceId: "a", label: "A" }] })).toContain(
      "instead of switching silently",
    );
    // K-64: the picker always offers a way to ask again — a webview that never
    // answered the first device query must not leave the setting stuck.
    expect(render()).toContain('id="mic-detect"');
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

  it("offers leaving the profile without deleting anything, with a confirmation step", () => {
    // O-06 2026-10-10 (P1): switching must read as non-destructive and be
    // one accidental click away from nothing.
    const disarmed = render({ switchArmed: false });
    expect(disarmed).toContain("Switch profile…");
    expect(disarmed).not.toContain("Yes, switch profile");
    expect(disarmed).toContain("Switching deletes nothing");
    const armed = render({ switchArmed: true });
    expect(armed).toContain('aria-label="Switch profile confirmation"');
    expect(armed).toContain("Yes, switch profile");
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
    // as a limit on a dedicated status card, not as a build-wide claim
    // tangled into the model picker.
    expect(html).toContain("need a recognition runtime");
    expect(html).toContain("honest status, not a choice");
    expect(html).toContain("does not change that");
    // No "install a model in Settings to get feedback" promise.
    expect(html).not.toMatch(/install a speech model in Settings/i);
    expect(html).not.toMatch(/to get feedback/i);
    expect(html).not.toMatch(/fluent/i);
  });

  it("K-77: exactly one speech-model picker — the duplicate is gone", () => {
    const html = render();
    expect((html.match(/id="speech-model"/g) ?? []).length).toBe(1);
    // The old Languages → Speech picker was a fieldset of radios sharing
    // the name "speech-model"; a second picker is the duplication K-77
    // removes, and old copy pointing at that page must not survive.
    expect(html).not.toMatch(/name="speech-model"/);
    expect(html).not.toMatch(/<legend>Speech model<\/legend>/);
    expect(html).not.toMatch(/Languages\s*→\s*Speech/);
  });

  it("the Speech runtimes card lists TTS payloads with install and remove controls", () => {
    const bundled = render({
      tts: {
        source: "bundled",
        components: [
          { name: "espeak-ng", license: "GPL-3.0", role: "pronunciation data for synthesis" },
          { name: "sherpa-onnx", license: "Apache-2.0", role: "speech runtime" },
          { name: "ONNX Runtime", license: "MIT", role: "model inference engine" },
          { name: "Kokoro", license: "Apache-2.0", role: "Japanese voice model" },
        ],
        models: [
          {
            id: "org.openlanguage.speech.kokoro-multi-lang",
            version: "1.0.0",
            license_code: "Apache-2.0",
            installed: true,
            installable: true,
          },
        ],
      },
    });
    expect(bundled).toContain("included in this download");
    expect(bundled).toContain("espeak-ng");
    expect(bundled).toContain("GPL-3.0");
    expect(bundled).toContain("ONNX Runtime");
    expect(bundled).toContain("Japanese voice model (Kokoro)");
    expect(bundled).toContain("Remove");
    const missing = render({
      tts: {
        source: "none",
        components: [],
        models: [
          {
            id: "org.openlanguage.speech.sherpa-onnx-runtime",
            version: "1.13.8",
            license_code: "Apache-2.0",
            installed: false,
            installable: true,
          },
        ],
      },
    });
    expect(missing).toContain("No speech synthesis is installed");
    expect(missing).toContain("Audio activities are disabled");
    expect(missing).not.toContain("GPL-3.0");
    // D5: a payload this build has not staged gets the honest label, no button.
    const unpublished = render({
      speechModels: [],
      tts: {
        source: "none",
        components: [],
        models: [
          {
            id: "org.openlanguage.speech.kokoro-multi-lang",
            version: "1.0.0",
            license_code: "Apache-2.0",
            installed: false,
            installable: false,
          },
        ],
      },
    });
    expect(unpublished).toContain("not published in this build");
    expect(unpublished).not.toContain("Download");
  });

  it("the single Speech card states runtime availability honestly (D4/ADR-0019)", () => {
    // Before the status is read the card admits it, rather than promising
    // a runtime this build may not carry.
    expect(render()).toContain("status could not be read");
    const bundled = render({
      aligner: {
        available: true,
        source: "bundled",
        runtime_version: "1.9.4",
        requires_cpu: "x86-64-v3 (SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no AVX-512)",
        reason: null,
      },
    });
    expect(bundled).toContain("whisper.cpp 1.9.4, bundled in this build");
    // The blanket absence claim must not survive a build that ships the
    // payload: it would tell the owner a runtime is missing when it is there.
    expect(bundled).not.toContain("this build does not include whisper.cpp");
    const cpu = render({
      aligner: {
        available: false,
        source: null,
        runtime_version: null,
        requires_cpu: "x86-64-v3 (SSE4.2, F16C, FMA, BMI2, AVX, AVX2; no AVX-512)",
        reason: "aligner-cpu-unsupported",
      },
    });
    expect(cpu).toContain("below the instruction set it was compiled for");
    expect(cpu).toContain("x86-64-v3");
    // A CPU-floor abstention is not an absence: the payload exists here.
    expect(cpu).not.toContain("does not include whisper.cpp");
    expect(cpu).toContain('data-aligner="no"');
  });

  it("the model list carries sizes, licenses, and the detected recommendation", () => {
    const html = render({
      speechModels: [
        {
          id: "org.openlanguage.speech.whisper-ggml-tiny",
          version: "1.0.0",
          license_code: "MIT",
          installed: false,
          installable: true,
          size_bytes: 77691713,
        },
        {
          id: "org.openlanguage.speech.whisper-ggml-base",
          version: "1.0.0",
          license_code: "MIT",
          installed: false,
          installable: true,
          size_bytes: 147951465,
        },
        {
          id: "org.openlanguage.speech.whisper-ggml-small",
          version: "1.0.0",
          license_code: "MIT",
          installed: true,
          installable: true,
          size_bytes: 592997257,
        },
      ],
      deviceTier: {
        cores: 8,
        total_ram_mb: 16000,
        tier: "typical",
        recommended_model: "org.openlanguage.speech.whisper-ggml-base",
      },
    });
    // Friendly labels with size and license; an installed model offers Remove.
    expect(html).toContain("Whisper Base");
    expect(html).toContain("Download ~141.1 MB");
    expect(html).toContain("Remove");
    // Honest framing: size does not change pronunciation accuracy; the
    // recommendation comes from the detected device tier (K-46), never a
    // static constant — and it lands on exactly one row.
    expect(html).toContain("the model sizes give the same result");
    expect(html).toContain("recommended for this device");
    expect(html).toContain("detected as the typical tier (8 cores, 16000 MB RAM)");
    expect((html.match(/recommended for this device/g) ?? []).length).toBe(1);
  });

  it("describes the speech models honestly: runtime-gated, never a false capability claim", () => {
    const html = render();
    // What the models actually feed, and the runtime they still need.
    expect(html).toContain("pronunciation alignment and");
    expect(html).toContain("dictation recognition");
    expect(html).toContain("need a recognition runtime");
    expect(html).toContain("Speech runtime:");
    // The old copy ("Choose a local speech model for pronunciation
    // feedback") implied selecting a model makes feedback work; that
    // claim may not return while the runtime is absent.
    expect(html).not.toMatch(/speech model for pronunciation feedback, or turn it off/i);
  });
});
