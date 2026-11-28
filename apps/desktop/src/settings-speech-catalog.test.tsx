// @vitest-environment happy-dom
/**
 * FIX-SPEECH-CATALOG-001 (D3) — behavior coverage for the ADR-0042 catalog
 * UI in Settings, which the SPEECH-CATALOG-001 lane shipped with none: the
 * per-locale model pickers, the catalog refresh affordance, and the error
 * path. Interactive walk on a real React root (same harness shape as
 * mywords-undo.test.tsx); the static contract pins stay in settings.test.tsx.
 */
import { describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Settings, type SettingsProps, type SpeechPref } from "./settings";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const TINY = "org.openlanguage.speech.whisper-ggml-tiny";

const base: SettingsProps = {
  microphoneEnabled: false,
  onSetMicrophone: () => {},
  explainSettings: null,
  onSetExplainEnabled: () => {},
  onSetExplainEndpoint: () => {},
  onSetExplainConsent: () => {},
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
  packDeclaresKanaKeyboard: true,
  packDeclaresRomanizationDisplay: true,
  micDetectUnavailableReason: null,
  speechModel: "off",
  speechModels: [
    {
      id: TINY,
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

const pref = (over: Partial<SpeechPref> = {}): SpeechPref => ({
  schema_version: 2,
  default_model: "off",
  per_language: {},
  ...over,
});

function mount(over: Partial<SettingsProps>): { host: HTMLElement; root: Root } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<Settings {...base} {...over} />);
  });
  return { host, root };
}

const localeRows = (host: HTMLElement) =>
  [...host.querySelectorAll("select")].filter((s) => s.id.startsWith("speech-model-"));

function pick(host: HTMLElement, id: string, value: string) {
  const select = host.querySelector<HTMLSelectElement>(`#${id}`);
  expect(select, `select #${id} must be rendered`).not.toBeNull();
  act(() => {
    select!.value = value;
    select!.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("per-locale speech model pickers (ADR-0042 / FIX-SPEECH-CATALOG-001 D3)", () => {
  it("renders one override row per installed pack locale", () => {
    const { host, root } = mount({
      speechPref: pref(),
      speechPackLocales: ["ja-JP", "ru-RU"],
      onSelectPackSpeechModel: () => {},
    });
    const rows = localeRows(host);
    expect(rows.map((s) => s.id)).toEqual(["speech-model-ja-JP", "speech-model-ru-RU"]);
    // Every row offers follow-default, off, and the catalog models.
    for (const row of rows) {
      const options = [...row.options].map((o) => o.value);
      expect(options).toEqual(["", "off", TINY]);
    }
    root.unmount();
  });

  it("selecting a model, off, or clearing calls back with the right args", () => {
    const onSelectPackSpeechModel = vi.fn();
    const { host, root } = mount({
      speechPref: pref(),
      speechPackLocales: ["ru-RU"],
      onSelectPackSpeechModel,
    });
    pick(host, "speech-model-ru-RU", TINY);
    expect(onSelectPackSpeechModel).toHaveBeenLastCalledWith("ru-RU", TINY);
    pick(host, "speech-model-ru-RU", "off");
    expect(onSelectPackSpeechModel).toHaveBeenLastCalledWith("ru-RU", "off");
    // The follow-default entry means "no override": null, never "".
    pick(host, "speech-model-ru-RU", "");
    expect(onSelectPackSpeechModel).toHaveBeenLastCalledWith("ru-RU", null);
    expect(onSelectPackSpeechModel).toHaveBeenCalledTimes(3);
    root.unmount();
  });

  it("shows the stored override as the selected option", () => {
    const { host, root } = mount({
      speechPref: pref({ per_language: { "ja-JP": TINY } }),
      speechPackLocales: ["ja-JP", "ru-RU"],
      onSelectPackSpeechModel: () => {},
    });
    expect(host.querySelector<HTMLSelectElement>("#speech-model-ja-JP")!.value).toBe(TINY);
    expect(host.querySelector<HTMLSelectElement>("#speech-model-ru-RU")!.value).toBe("");
    root.unmount();
  });
});

describe("catalog refresh affordance (FIX-SPEECH-CATALOG-001 D3)", () => {
  const refreshButton = (host: HTMLElement) =>
    host.querySelector<HTMLButtonElement>('[data-testid="settings-speech-refresh-catalog"]');

  it("is disabled with aria-busy while a check is in flight, live otherwise", () => {
    const onRefreshCatalog = vi.fn();
    const busy = mount({ onRefreshCatalog, catalogBusy: true });
    expect(refreshButton(busy.host)!.disabled).toBe(true);
    expect(refreshButton(busy.host)!.getAttribute("aria-busy")).toBe("true");
    expect(refreshButton(busy.host)!.textContent).toContain("Checking");
    busy.root.unmount();

    const idle = mount({ onRefreshCatalog, catalogBusy: false });
    expect(refreshButton(idle.host)!.disabled).toBe(false);
    expect(refreshButton(idle.host)!.hasAttribute("aria-busy")).toBe(false);
    act(() => {
      refreshButton(idle.host)!.click();
    });
    expect(onRefreshCatalog).toHaveBeenCalledTimes(1);
    idle.root.unmount();
  });

  it("surfaces a failed check through the settings alert", () => {
    const { host, root } = mount({
      onRefreshCatalog: () => {},
      catalogBusy: false,
      error: "The model list could not be refreshed: catalog fetch failed",
    });
    const alert = host.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("The model list could not be refreshed");
    root.unmount();
  });
});
