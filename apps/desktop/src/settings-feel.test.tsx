/**
 * FEEL-SETTINGS-001 contract: settings-screen consistency.
 *
 * Closes audit section 6: desktop selects rendered as raw UA chrome inside
 * the designed cards (the only select rule in the sheet sat inside the
 * phone media query), details/summary disclosures hard-cut open with no
 * motion or rotation, and the long Settings scroll offered no way to hop
 * between domains.
 *
 * Like motion-contract.test.ts, this pins RULE BODIES in the single sheet
 * (packages/ui/src/styles.css) — the live-computed proof is the real-engine
 * capture (scripts/feel-settings-capture.mjs); this file makes regressions
 * cheap and blameless. The desktop select is pinned at column 0 on purpose:
 * an @media-only select rule does NOT close the desktop hole.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Settings, type SettingsProps } from "./settings";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");

function ruleBody(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a "${selector}" rule`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

/** A rule for exactly this selector at top level (column 0, NOT inside any
 *  @media block) — the distinction the audit finding hinges on. */
function topLevelRuleBody(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a top-level "${selector}" rule`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

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

describe("FEEL-SETTINGS-001 desktop select styling", () => {
  it("a top-level (not @media) select rule restyles every select", () => {
    const body = topLevelRuleBody("select");
    expect(body).toContain("appearance: none");
    expect(body).toContain("-webkit-appearance: none");
    // drawn chevron replaces the UA arrow (inline SVG, no UA chrome)
    expect(body).toMatch(/background-image:\s*url\(["']?data:image\/svg\+xml/);
    expect(body).toContain("background-repeat: no-repeat");
    expect(body).toContain("background-color: var(--surface)");
    expect(body).toContain("color: var(--ink)");
    expect(body).toContain("border: 1px solid var(--line-strong)");
    expect(body).toContain("border-radius: var(--radius-sm)");
    expect(body).toMatch(/padding:[^;]*\d/);
    // the halo arrives, it does not snap: tokens only, never a duration literal
    expect(body).toMatch(/transition:[^;]*border-color var\(--dur-fast\)/);
    expect(body).toMatch(/box-shadow var\(--dur-fast\)/);
  });

  it("focus puts the accent border plus accent-soft halo on the select", () => {
    const body = ruleBody("select:focus-visible");
    expect(body).toContain("border-color: var(--accent)");
    expect(body).toContain("box-shadow: 0 0 0 3px var(--accent-soft)");
  });

  it("the phone-width column-fit select rule stays", () => {
    // The desktop rule must not replace the phone rule — selects still ride
    // the column at 390px (WEB-HISTORY: a 479px intrinsic select caused
    // document-level horizontal scroll).
    const media = /@media \(max-width: 44rem\)[\s\S]*?\n\s*select\s*\{([^}]*)\}/.exec(css);
    expect(media, "phone-width select rule must remain").not.toBeNull();
    expect((media![1] ?? "").replace(/\s+/g, " ")).toContain("width: 100%");
  });
});

describe("FEEL-SETTINGS-001 disclosure expand motion", () => {
  it("the native marker is hidden for the prose disclosures", () => {
    expect(ruleBody("details.prose-note > summary")).toContain("list-style: none");
    expect(ruleBody("details.prose-note > summary::-webkit-details-marker")).toContain(
      "display: none",
    );
  });

  it("a drawn chevron rotates 180 degrees when the disclosure opens", () => {
    expect(ruleBody("details.prose-note > summary::before")).toMatch(
      /background-image:\s*url\(["']?data:image\/svg\+xml/,
    );
    const open = ruleBody("details.prose-note[open] > summary::before");
    expect(open).toContain("transform: rotate(180deg)");
  });

  it("the body reveals over --dur ease-out via disclosure-reveal", () => {
    expect(css).toMatch(/@keyframes\s+disclosure-reveal\s*\{/);
    expect(ruleBody("details.prose-note[open] > p")).toContain(
      "animation: disclosure-reveal var(--dur) var(--ease-out)",
    );
  });
});

describe("FEEL-SETTINGS-001 contents jump row", () => {
  const always = [
    "settings-mic",
    "settings-profile",
    "settings-speech",
    "settings-runtimes",
    "settings-build",
  ];

  it("a labelled contents nav offers one chip per visible card", () => {
    const html = render();
    expect(html).toContain('aria-label="Settings sections"');
    expect(html).toContain('class="settings-contents"');
    for (const id of [...always, "settings-romaji", "settings-kana"]) {
      expect(html, `card anchor ${id} missing`).toContain(`id="${id}"`);
      expect(html, `anchor marker for ${id} missing`).toContain(`data-settings-anchor="${id}"`);
    }
    for (const label of [
      "Microphone",
      "Romaji",
      "Kana keyboard",
      "Profile data",
      "Speech",
      "Speech runtimes",
      "About this build",
    ]) {
      expect(html, `chip button for ${label} missing`).toMatch(
        new RegExp(`class="contents-chip"[^>]*>${label}</button>`),
      );
    }
  });

  it("conditional cards get a chip exactly when their card renders", () => {
    const hidden = render({
      packDeclaresRomanizationDisplay: false,
      packDeclaresKanaKeyboard: false,
    });
    expect(hidden).not.toContain('id="settings-romaji"');
    expect(hidden).not.toMatch(/class="contents-chip"[^>]*>Romaji</);
    expect(hidden).not.toContain('id="settings-kana"');
    expect(hidden).not.toMatch(/class="contents-chip"[^>]*>Kana keyboard</);
  });

  it("chips are buttons — the screen-router hash is never touched", () => {
    const html = render();
    // mobile-screens.tsx reads location.hash for screen routing; an in-page
    // hash anchor would route, not scroll.
    expect(html).not.toMatch(/href="#settings/);
    expect(html).toMatch(/<nav[^>]*class="settings-contents"[^>]*>.*<button/s);
  });

  it("jump targets land below the sticky header", () => {
    expect(ruleBody("[data-settings-anchor]")).toMatch(/scroll-margin-top:/);
  });
});
