// SETTINGS-001 + K-77 UI contract: the mic control mirrors the stored
// setting, Delete is a two-step confirmation (never fires from the first
// control), and Export reports the written path. K-77: the Speech card is
// the ONLY place for speech models — exactly one picker. K-90 deleted the
// TTS payloads: the card lists recognition models only, and no copy claims
// a capability this build lacks.
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
  playbackDevice: null,
  playbackOutputs: [],
  canRouteOutput: false,
  onPickPlaybackDevice: () => {},
  romajiMode: "auto",
  onSetRomajiMode: () => {},
  kanaKeyboard: "off",
  onSetKanaKeyboard: () => {},
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
  onInstallModel: () => {},
  onDeleteModel: () => {},
  aligner: null,
  deviceTier: null,
  exportPath: null,
  onExport: () => {},
  restorePath: "",
  restorePreview: null,
  restoreOutcome: null,
  onRestorePathChange: () => {},
  onPreviewRestore: () => {},
  onConfirmRestore: () => {},
  deleteArmed: false,
  onArmDelete: () => {},
  onCancelDelete: () => {},
  onConfirmDelete: () => {},
  switchArmed: false,
  onArmSwitch: () => {},
  onCancelSwitch: () => {},
  onConfirmSwitch: () => {},
  error: null,
  buildIdentity: { version: "0.4.0-alpha.1", commit: "172d2a2", dirty: false },
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

  // ADR-0015 / docs/13: a platform runtime report is only evidence if it names
  // the version and commit of the build a human actually ran.
  it("states the exact build identity a runtime report has to quote", () => {
    const html = render();
    expect(html).toContain("About this build");
    expect(html).toContain("<strong>0.4.0-alpha.1</strong>");
    expect(html).toContain('data-build-commit="172d2a2"');
    // A dirty tree matches no published tag, so the copy has to say so.
    expect(
      render({ buildIdentity: { version: "0.4.0-alpha.1", commit: "172d2a2", dirty: true } }),
    ).toContain("modified working tree");
    // A failed read states no version rather than inventing one.
    expect(render({ buildIdentity: null })).toContain("Loading build information");
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
    // Issue #2: the in-app kana keyboard is a per-profile choice too.
    expect(render({ kanaKeyboard: "romaji-kana" })).toMatch(/checked="" value="romaji-kana"/);
    expect(render({ kanaKeyboard: "off" })).not.toMatch(/checked="" value="romaji-kana"/);
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

  it("labels an unpublished model honestly instead of offering a button (D5)", () => {
    const html = render({
      speechModels: [
        {
          id: "org.openlanguage.speech.whisper-ggml-small",
          version: "1.0.0",
          license_code: "MIT",
          installed: false,
          installable: false,
          size_bytes: 592997257,
        },
      ],
    });
    expect(html).toContain("not published in this build");
    expect(html).not.toContain("Download");
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

  it("I03: readiness is stated before the controls, with the alternative named", () => {
    // The finding was that a learner reached a control that could not work
    // before learning why. Readiness has to be readable above the picker.
    const html = render({
      microphoneEnabled: false,
      speechModel: "org.openlanguage.speech.whisper-ggml-tiny",
      speechModels: [
        {
          id: "org.openlanguage.speech.whisper-ggml-tiny",
          version: "1",
          license_code: "MIT",
          installed: false,
          installable: true,
          size_bytes: 86000000,
        },
      ],
    });
    expect(html.indexOf('data-testid="settings-speech-readiness"')).toBeLessThan(
      html.indexOf('id="speech-model"'),
    );
    expect(html).toContain(
      "Microphone: off — speaking activities abstain and nothing is recorded.",
    );
    expect(html).toContain(
      "is selected but not on this device yet — download it below, or speaking checks abstain.",
    );
  });

  it("I03: a ready device is reported as ready", () => {
    const html = render({
      microphoneEnabled: true,
      speechModel: "org.openlanguage.speech.whisper-ggml-tiny",
      speechModels: [
        {
          id: "org.openlanguage.speech.whisper-ggml-tiny",
          version: "1",
          license_code: "MIT",
          installed: true,
          installable: true,
          size_bytes: 86000000,
        },
      ],
    });
    expect(html).toContain("Microphone: allowed.");
    expect(html).toContain("org.openlanguage.speech.whisper-ggml-tiny is already on this device.");
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
    // F-04 (run L1): the accessible name must carry WHICH model the
    // button acts on — a focused "Remove"/"Download" alone says nothing.
    expect(html).toContain('aria-label="Remove Whisper Small — largest download and memory"');
    expect(html).toContain(
      'aria-label="Download Whisper Base — larger download and memory, about 141.1 megabytes"',
    );
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

  it("offers an output picker only when the runtime can actually route, and never an empty one", () => {
    // The base render (canRouteOutput=false) must not show a dead control.
    const blocked = render();
    expect(blocked).toContain('data-playback-route="system"');
    expect(blocked).toContain("cannot direct playback to a chosen device");
    expect(blocked).not.toContain('id="playback-device"');
    // A capable runtime with named outputs: the stored device is the
    // selected row, and System default stays reachable.
    const routed = render({
      canRouteOutput: true,
      playbackOutputs: [{ deviceId: "out-1", label: "Focusrite Line" }],
      playbackDevice: "out-1",
    });
    expect(routed).toContain('data-playback-route="picker"');
    expect(routed).toContain("Focusrite Line");
    expect(routed).toContain("System default");
    expect(routed).toMatch(/<option value="out-1"[^>]*selected|selected[^>]*value="out-1"/);
    // Capable but unnamed outputs: a sentence, not a dropdown of blanks.
    const empty = render({ canRouteOutput: true, playbackOutputs: [] });
    expect(empty).toContain("has not revealed any output names");
  });
  /// R05/R06 (DATA-002 reopen): the export copy names the saved words the
  /// bundle carries, and a restore is preview-first — the learner sees what
  /// the backup holds before anything is written, an unsupported backup gets
  /// no restore control, and the result states what the store holds after.
  it("names saved words in the export and shows a backup before restoring it", () => {
    expect(render()).toContain("saved words, and review schedule");

    // Nothing checked yet: no counts, no restore control.
    const idle = render({ restorePath: "/home/hunter/backup.json" });
    expect(idle).not.toContain("settings-restore-preview");
    expect(idle).not.toContain("Restore as a new profile");

    const backup = {
      format_version: 2,
      supported: true,
      source_profile_name: "Hunter",
      exported_at: "2026-10-14T09:00:00Z",
      events: 12,
      corrections: 1,
      goals: 3,
      mastery: 4,
      saved_words: 7,
      scheduled_items: 9,
      pack_installs: 2,
      selected_packs: 1,
      recordings: 0,
      warnings: [],
    };
    // Static markup splits interpolated text with comments; flatten it so the
    // sentence can be asserted as the learner reads it.
    const flat = (html: string) => html.replace(/<!--.*?-->/g, "");
    const checked = flat(
      render({ restorePath: "/home/hunter/backup.json", restorePreview: backup }),
    );
    expect(checked).toContain("Hunter");
    expect(checked).toContain("7 saved words");
    expect(checked).toContain("12 recorded attempts");
    expect(checked).toContain("9 scheduled reviews");
    expect(checked).toContain("2 language packs");
    expect(checked).toContain("Restore as a new profile");
    expect(checked).not.toContain("settings-restore-result");

    // A backup this build cannot read is explained, never offered.
    const future = flat(
      render({
        restorePath: "/home/hunter/future.json",
        restorePreview: {
          ...backup,
          supported: false,
          format_version: 999,
          warnings: [
            "this backup uses data format version 999, which this version of the app cannot read",
          ],
        },
      }),
    );
    expect(future).not.toContain("Restore as a new profile");
    expect(future).toContain("format version 999");
    expect(future).toContain("settings-restore-warnings");

    // After a restore the panel reports the restored state.
    const done = flat(
      render({
        restoreOutcome: {
          profile_id: "prof-restored",
          display_name: "Hunter",
          events: 12,
          goals: 3,
          saved_words: 7,
          scheduled_items: 9,
          warnings: [],
        },
      }),
    );
    expect(done).toContain("Restored as Hunter");
    expect(done).toContain("On this device now: 7 saved words, 12 recorded attempts");
    expect(done).toContain("always creates a new profile");
  });
});
