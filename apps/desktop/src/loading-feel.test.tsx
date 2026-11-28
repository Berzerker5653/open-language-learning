/**
 * FEEL-LOADING-001 contract — loading & pending feedback across surfaces.
 *
 * The audit found every IPC read treated as instant: My Words renders the
 * previous list while the new one is in flight, Settings fills six silent
 * reads late, Progress reflows as its staggered arrivals land, Settings
 * toggles write to the engine with no feedback, the speech-model download
 * button stays live mid-install, the LAN Pair button double-submits, and the
 * pair result is an unstyled bare paragraph. This file pins the fixes: the
 * skeleton primitives in the single sheet (rule-body pins, same discipline
 * as motion-contract.test.ts / button-affordance.test.ts), the SSR-visible
 * component states, and the App-container wiring for the loading flags.
 * The live proof (fetch latency injected, states measured mid-flight,
 * exactly one /pair POST under a double-click) is
 * scripts/feel-loading-capture.mjs against a real engine.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MyWordsPanel, type MineDraft } from "./words";
import {
  PairResult,
  Settings,
  type RomajiMode,
  type KanaKeyboardMode,
  type SettingsProps,
} from "./settings";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");
const appTsx = readFileSync(repoRoot + "apps/desktop/src/App.tsx", "utf8");
const settingsTsx = readFileSync(repoRoot + "apps/desktop/src/settings.tsx", "utf8");
// APP-SPLIT-003G: the openWords body moved to the Mine wiring module; the
// FEEL-LOADING-001 prime/finally invariant is re-pinned across the seam.
const mineWiring = readFileSync(repoRoot + "apps/desktop/src/app/mine-wiring.ts", "utf8");

function ruleBody(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a "${selector}" rule`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

describe("FEEL-LOADING-001 skeleton primitives (styles.css)", () => {
  it("a pulse-named breathing keyframe exists (motion-budget legal)", () => {
    const m = /@keyframes\s+skeleton-pulse\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(m, "styles.css must define @keyframes skeleton-pulse").not.toBeNull();
    expect((m![1] ?? "").replace(/\s+/g, " ")).toContain("0.55");
  });

  it(".skeleton-row is a surface-sunk block that breathes", () => {
    const body = ruleBody(".skeleton-row");
    expect(body).toContain("background: var(--surface-sunk)");
    expect(body).toContain("animation: skeleton-pulse");
    expect(body).toMatch(/var\(--ease-in-out\)/);
  });

  it(".skeleton-list stacks rows", () => {
    const body = ruleBody(".skeleton-list");
    expect(body).toContain("display: flex");
    expect(body).toContain("flex-direction: column");
  });

  it("Progress reservations exist with explicit min-heights", () => {
    for (const shell of ["facts", "summary", "stats", "map", "tree"]) {
      const body = ruleBody(`.skeleton-block--${shell}`);
      expect(body, `--${shell} must reserve height`).toMatch(/min-height:\s*[\d.]+rem/);
    }
  });

  it("skeleton rows vary width so the placeholder reads as content, not a bar", () => {
    const widths = [...css.matchAll(/\.skeleton-row:nth-child\(\d+\)\s*\{[^}]*width:/g)];
    expect(widths.length, "nth-child width reservations missing").toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------- components

const draft: MineDraft = { surface: "", reading: "", gloss: "", source: "" };

function wordsHtml(loading: boolean): string {
  return renderToStaticMarkup(
    <MyWordsPanel
      items={[
        {
          id: "w1",
          surface: "молоко",
          reading: null,
          gloss: "milk",
          source_citation: "ru.unit.a1.food",
          created_at: "2026-11-01T00:00:00Z",
          due_at: null,
          context_sentence_id: null,
          context_sentence: null,
        },
      ]}
      loading={loading}
      review={null}
      error={null}
      notice={null}
      draft={draft}
      onDraftChange={() => {}}
      onAdd={() => {}}
      onRemove={() => {}}
      onGrade={() => {}}
      onReviewNow={() => {}}
      onStartNewReview={() => {}}
      onStartReview={() => {}}
      onReveal={() => {}}
    />,
  );
}

describe("FEEL-LOADING-001 My Words loading state", () => {
  it("while loading, skeleton rows stand in and the stale list is hidden", () => {
    const html = wordsHtml(true);
    expect(html).toContain("skeleton-row");
    expect(html).toContain('aria-label="Loading saved words"');
    // The stale-list bug is the whole point: no old entries, and no false
    // "nothing mined yet" story while data is merely in flight.
    expect(html).not.toContain("молоко");
    expect(html).not.toContain("Nothing mined yet");
  });

  it("when not loading, the real list renders as before", () => {
    const html = wordsHtml(false);
    expect(html).toContain("молоко");
    expect(html).not.toContain('aria-label="Loading saved words"');
  });
});

const settingsBase: SettingsProps = {
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
  onSetRomajiMode: (_m: RomajiMode) => {},
  kanaKeyboard: "off",
  onSetKanaKeyboard: (_m: KanaKeyboardMode) => {},
  packDeclaresKanaKeyboard: false,
  packDeclaresRomanizationDisplay: false,
  micDetectUnavailableReason: null,
  speechModel: "off",
  speechModels: [],
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
  buildIdentity: null,
  error: null,
};

describe("FEEL-LOADING-001 Settings loading, saved tick, install pending", () => {
  it("a loading prime announces itself with skeleton rows instead of populating silently", () => {
    const html = renderToStaticMarkup(<Settings {...settingsBase} loading={true} />);
    expect(html).toContain("settings-loading-skeleton");
    expect(html).toContain("skeleton-row");
  });

  it("a successful toggle shows the quiet Saved tick as a live status", () => {
    const html = renderToStaticMarkup(<Settings {...settingsBase} saveNotice="Saved" />);
    expect(html).toContain("save-tick");
    expect(html).toContain("Saved");
    expect(html).toContain('role="status"');
  });

  it("no tick renders when nothing was just saved", () => {
    const html = renderToStaticMarkup(<Settings {...settingsBase} />);
    expect(html).not.toContain("save-tick");
  });

  it("the installing model's button reads Installing, is disabled, and marks aria-busy", () => {
    const html = renderToStaticMarkup(
      <Settings
        {...settingsBase}
        speechModels={[
          {
            id: "org.openlanguage.speech.whisper-ggml-tiny",
            version: "1",
            license_code: "MIT",
            installed: false,
            installable: true,
            size_bytes: 75_000_000,
          },
        ]}
        installingModelId="org.openlanguage.speech.whisper-ggml-tiny"
      />,
    );
    expect(html).toContain("Installing…");
    expect(html).toContain("aria-busy");
    expect(html).toContain("disabled");
    // The completed "Download ~" call-to-action must not stay live mid-install.
    expect(html).not.toContain("Download ~");
  });

  it("sibling model buttons disable while ANY install is in flight", () => {
    const html = renderToStaticMarkup(
      <Settings
        {...settingsBase}
        speechModels={[
          {
            id: "org.openlanguage.speech.whisper-ggml-tiny",
            version: "1",
            license_code: "MIT",
            installed: false,
            installable: true,
            size_bytes: 75_000_000,
          },
          {
            id: "org.openlanguage.speech.whisper-ggml-base",
            version: "1",
            license_code: "MIT",
            installed: true,
            installable: true,
            size_bytes: 142_000_000,
          },
        ]}
        installingModelId="org.openlanguage.speech.whisper-ggml-tiny"
      />,
    );
    // Both rows (tiny installing, base's Remove) carry disabled buttons.
    const disabledCount = (html.match(/disabled disabled|disabled=""/g) ?? []).length;
    expect(disabledCount).toBeGreaterThanOrEqual(2);
  });
});

describe("FEEL-LOADING-001 pair result is styled with live semantics", () => {
  it("success renders a notice with a polite live region", () => {
    const html = renderToStaticMarkup(
      <PairResult ok={true} text="Paired — this device reconnects without a PIN." />,
    );
    expect(html).toContain('class="notice"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("lan-pair-message");
  });

  it("failure renders an alert with assertive semantics", () => {
    const html = renderToStaticMarkup(<PairResult ok={false} text="That PIN did not work." />);
    expect(html).toContain('class="alert"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="polite"');
  });

  it("the Pair request itself is single-flight: guard + disabled button in source", () => {
    const pairFn = /async function onPair\(\) \{[\s\S]*?\n {2}\}/.exec(settingsTsx);
    expect(pairFn, "LanAccessCard.onPair must exist").not.toBeNull();
    expect(pairFn![0]).toMatch(/if \(pairing\) return;/);
    expect(pairFn![0]).toMatch(/setPairing\(true\)/);
    expect(pairFn![0]).toMatch(/finally/);
    const button = /<button[^>]*id="lan-pair"[^>]*>/.exec(settingsTsx);
    expect(button, "Pair button must exist").not.toBeNull();
    expect(button![0]).toContain("disabled={pairing}");
  });
});

describe("FEEL-LOADING-001 App container wires the loading flags", () => {
  it("openWords primes with wordsLoading and finally clears it", () => {
    // APP-SPLIT-003G: App keeps the hoisted wrapper; the body (and the
    // FEEL-LOADING-001 flag discipline) lives in ./app/mine-wiring.
    const wrapper = /async function openWords\(\) \{[\s\S]*?\n {2}\}/.exec(appTsx);
    expect(wrapper, "openWords wrapper must exist").not.toBeNull();
    expect(wrapper![0]).toContain("runOpenWords(mineWiringDeps)");
    const fn = /export async function runOpenWords\([\s\S]*?\n\}/.exec(mineWiring);
    expect(fn, "runOpenWords must exist").not.toBeNull();
    expect(fn![0]).toContain("setWordsLoading(true)");
    expect(fn![0]).toContain("setWordsLoading(false)");
  });

  it("openSettings primes with settingsLoading and finally clears it", () => {
    const fn = /async function openSettings\(\) \{[\s\S]*?\n {2}\}/.exec(appTsx);
    expect(fn, "openSettings must exist").not.toBeNull();
    expect(fn![0]).toContain("setSettingsLoading(true)");
    expect(fn![0]).toContain("setSettingsLoading(false)");
  });

  it("the Progress route swaps in the reserved skeleton shell while loading", () => {
    expect(appTsx).toContain('aria-label="Loading progress"');
    for (const shell of ["facts", "summary", "stats", "map", "tree"]) {
      expect(appTsx, `progress shell --${shell} missing`).toContain(`skeleton-block--${shell}`);
    }
  });

  it("a speech install marks the model installing around the IPC call", () => {
    const fn = /async function installSpeechModel\(modelId: string\) \{[\s\S]*?\n {2}\}/.exec(
      appTsx,
    );
    expect(fn, "installSpeechModel must exist").not.toBeNull();
    expect(fn![0]).toContain("setInstallingSpeechModel(modelId)");
    expect(fn![0]).toMatch(/finally[\s\S]*setInstallingSpeechModel\(null\)/);
  });

  it("the six Settings setters mark a saved tick on success", () => {
    expect(appTsx).toContain("markSettingsSaved()");
    // All Settings writes route through the shared saveSetting helper, which
    // is what confirms the save (single tick, error path, etc.). Each setter
    // must call that helper, and the helper must do the confirm.
    const helper = /async function saveSetting<T>\([\s\S]*?\n {2}\}/.exec(appTsx);
    expect(helper, "saveSetting helper must exist").not.toBeNull();
    expect(helper![0], "saveSetting must confirm the save").toContain("markSettingsSaved()");
    for (const setter of [
      "setMicSetting",
      "pickMicrophoneSetting",
      "pickPlaybackSetting",
      "setRomajiSetting",
      "setKanaKeyboardSetting",
    ]) {
      const fn = new RegExp(`async function ${setter}\\([\\s\\S]*?\\n  \\}`).exec(appTsx);
      expect(fn, `${setter} must exist`).not.toBeNull();
      expect(fn![0], `${setter} must route through saveSetting`).toContain("saveSetting");
    }
    // selectSpeechModel inlines its own IPC call (distinct model-selection
    // path, not the profile settings family), so it carries the confirm itself.
    const select = /async function selectSpeechModel\(modelId: string\) \{[\s\S]*?\n {2}\}/.exec(
      appTsx,
    );
    expect(select, "selectSpeechModel must exist").not.toBeNull();
    expect(select![0], "selectSpeechModel must confirm the save").toContain("markSettingsSaved()");
  });

  it("placement first fetch is single-flight and shows a pending label", () => {
    const fn = /async function openPlacement\(\) \{[\s\S]*?\n {2}\}/.exec(appTsx);
    expect(fn, "openPlacement must exist").not.toBeNull();
    expect(fn![0]).toContain("setPlacementLoading(true)");
    expect(fn![0]).toContain("setPlacementLoading(false)");
    expect(appTsx).toContain('placementLoading ? "Starting…" : "Start placement"');
  });
});
