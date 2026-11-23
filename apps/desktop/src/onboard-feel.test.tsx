/**
 * FEEL-ONBOARD-001 contract — profile/onboarding flow feel.
 *
 * The feel audit's section-7 cluster: the stepper has no notion of a
 * completed step (every dot looks the same until you are on it) and hard
 * cards snap between steps; pack install is a text-only notice with no
 * bar; profile cards carry no hover lift and entering the app after
 * Continue snaps; initials avatars are all one flat teal; the no-profiles
 * empty line is bare text. This file pins the fixes exactly like
 * motion-contract.test.ts pins rule bodies — the live proof (check drawn,
 * connector filled, bar easing mid-download, hover measured with a real
 * CDP mouse, app-in on entry) is scripts/feel-onboard-capture.mjs against
 * a real engine. Motion stays motion: warm, calm, no confetti (ADR-0002).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { avatarVariant, Onboarding, type OnboardingProps } from "./onboarding";
import { AppShell } from "@openlang/ui";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");
const appTsx = readFileSync(repoRoot + "apps/desktop/src/App.tsx", "utf8");

function ruleBody(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a "${selector}" rule`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

function keyframes(name: string): string {
  const m = new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css);
  expect(m, `styles.css must define @keyframes ${name}`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

const base: OnboardingProps = {
  step: "welcome",
  notice: { title: "How this app handles your data", points: ["Everything runs on this device."] },
  packs: [
    {
      pack_id: "org.openlanguage.ja-demo",
      display_name: "Japanese — demo lexicon",
      locale: "ja-JP",
      maturity: "community",
      rtl: false,
    },
  ],
  selectedPack: null,
  installed: [],
  profileName: "",
  onProfileName: () => {},
  onCreateProfile: () => {},
  onSelectPack: () => {},
  onInstall: () => {},
  onUpdatePack: () => {},
  onLocatePack: () => {},
  onSkipPack: () => {},
  onEnableMic: () => {},
  onSkipMic: () => {},
  onInstallSpeech: () => {},
  onSkipSpeech: () => {},
  onStartSpeech: () => {},
  speechComponents: [],
  onContinue: () => {},
  onResume: () => {},
  onCreateNew: () => {},
};

function render(overrides: Partial<OnboardingProps>) {
  return renderToStaticMarkup(<Onboarding {...base} {...overrides} />);
}

// ---------------------------------------------------------------- stepper

describe("FEEL-ONBOARD-001 stepper done-state (mock: drawn check 300ms, connector fill 250ms, ring 150ms)", () => {
  it("the completed circle fills ok and suppresses the number", () => {
    const body = ruleBody(".stepper li.stepper-done::before");
    expect(body).toContain("background: var(--ok)");
    expect(body).toContain("border-color: var(--ok-ink)");
    expect(body).toContain("color: transparent");
  });

  it("the check draws along its stroke over --dur-slow (300ms, mock legend)", () => {
    const path = ruleBody(".step-check path");
    expect(path).toContain("stroke-dasharray");
    expect(path).toContain("animation: check-draw var(--dur-slow) var(--ease-out)");
    expect(keyframes("check-draw")).toContain("stroke-dashoffset");
  });

  it("done connectors turn ok and fill left→right over --dur (250ms, mock legend)", () => {
    expect(ruleBody(".stepper li::after")).toContain("background: var(--line-strong)");
    const done = ruleBody(".stepper li.stepper-done::after");
    expect(done).toContain("background: var(--ok)");
    expect(done).toContain("animation: link-fill var(--dur) var(--ease-out)");
    expect(done).toContain("transform-origin: left");
    expect(keyframes("link-fill")).toContain("transform: scaleX(0)");
  });

  it("the active dot wears the soft accent ring fading in over --dur-fast (150ms)", () => {
    const active = ruleBody('.stepper li[aria-current="step"]::before');
    expect(active).toContain("box-shadow: 0 0 0 4px var(--accent-soft)");
    expect(active).toContain("animation: ring-in var(--dur-fast) var(--ease-out)");
    expect(keyframes("ring-in")).toContain("box-shadow: 0 0 0 0 var(--accent-soft)");
  });

  it("completed steps carry the stepper-done class + inline drawn check, labels unchanged", () => {
    const html = render({ step: "packs" });
    expect(html).toContain('class="stepper-done"');
    expect(html).toContain('class="step-check"');
    expect(html).toContain("<path");
    // Labels stay plain text nodes inside the li (existing SSR pins live).
    expect(html).toContain(">Welcome<");
    expect(html).toContain(">Language<");
    // aria-current semantics unchanged.
    expect(html).toContain('aria-current="step">Language');
    expect(html).toContain('aria-label="Progress"');
  });

  it("the resume chooser still renders NO stepper", () => {
    const html = render({ step: "resume", profiles: [] });
    expect(html).not.toContain('aria-label="Progress"');
  });
});

// ------------------------------------------------------------ step cards

describe("FEEL-ONBOARD-001 step-change glide (cards move, no hard cut)", () => {
  it(".card--step enters with step-in on the calm duration", () => {
    expect(ruleBody(".card--step")).toContain("animation: step-in var(--dur) var(--ease-out)");
    expect(keyframes("step-in")).toContain("translateY(0.5rem)");
  });

  it("every onboarding step card carries the glide class", () => {
    for (const step of ["welcome", "packs", "microphone", "speech-setup", "done"] as const) {
      const html = render({ step, micChosen: true });
      expect(html, `${step} card must glide`).toContain('class="card card--step"');
    }
  });
});

// ----------------------------------------------------------- install bar

describe("FEEL-ONBOARD-001 pack-install progress bar (honest to EngineProgress)", () => {
  it("the track + fill exist with the easing transition from the mock legend", () => {
    expect(ruleBody(".install-bar")).toMatch(/border-radius:/);
    const fill = ruleBody(".install-bar-fill");
    expect(fill).toContain("background: var(--accent)");
    expect(fill).toContain("transition: width var(--dur) var(--ease-out)");
  });

  it("a percent-bearing stage renders a real bar with progressbar values", () => {
    const html = render({
      step: "packs",
      progress: {
        operation: "install-pack",
        subject: "org.openlanguage.ru-ru.reference",
        stage: "fetch",
        percent: 45,
      },
    });
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="45"');
    expect(html).toContain("width:45%");
    expect(html).toContain('class="install-bar-fill"');
    // The honest progressLine text stays.
    expect(html).toContain("Downloading the language pack — 45% done");
  });

  it("a percent-less stage claims no value and sweeps indeterminate (pulse-named loop)", () => {
    const html = render({
      step: "packs",
      progress: {
        operation: "install-pack",
        subject: "org.openlanguage.ru-ru.reference",
        stage: "prepare",
        percent: null,
      },
    });
    expect(html).toContain("install-bar--unknown");
    expect(html).not.toContain("aria-valuenow");
    const unknown = ruleBody(".install-bar--unknown .install-bar-fill");
    expect(unknown).toContain("pulse-sweep");
  });
});

// ------------------------------------------------- cards, entry, avatars

describe("FEEL-ONBOARD-001 profile cards, app entry, avatars, warm empty", () => {
  it("profile cards lift on hover and the pinned press still wins", () => {
    expect(ruleBody(".profile-card:hover")).toContain("transform: translateY(-1px)");
    // Source order: :active must come AFTER :hover so a press still presses.
    const hover = css.indexOf(".profile-card:hover");
    const active = css.indexOf(".profile-card:active");
    expect(hover).toBeGreaterThan(-1);
    expect(active).toBeGreaterThan(hover);
  });

  it("entering the app glides via app-in on the content page", () => {
    expect(ruleBody(".app-enter")).toContain("animation: app-in var(--dur-slow) var(--ease-out)");
    expect(keyframes("app-in")).toContain("translateY(0.75rem)");
    // AppShell supports the content class and App passes it for the app branch.
    expect(appTsx).toContain('contentClassName="app-enter"');
    const html = renderToStaticMarkup(
      <AppShell productName="T" nav={[]} contentClassName="app-enter">
        <p>x</p>
      </AppShell>,
    );
    expect(html).toContain('class="page app-enter"');
  });

  it("initials avatars vary deterministically per profile id over existing token pairs", () => {
    expect(avatarVariant("p1")).toBe(avatarVariant("p1"));
    expect(avatarVariant("aiko-7")).toBe(avatarVariant("aiko-7"));
    const variants = new Set(["p1", "p2", "hunter", "aiko"].map((id) => avatarVariant(id)));
    // Variation, not decoration: the small fixture set must not collapse to one color.
    expect(variants.size).toBeGreaterThan(1);
    for (const v of variants) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4);
    }
  });

  it("profile cards carry the variant class next to the base avatar class", () => {
    const html = render({
      step: "resume",
      profiles: [
        { id: "p1", display_name: "Hunter" },
        { id: "p2", display_name: "Aiko" },
      ],
    });
    expect(html).toContain(`profile-avatar profile-avatar--v${avatarVariant("p1")}`);
    expect(html).toContain(`profile-avatar profile-avatar--v${avatarVariant("p2")}`);
  });

  it("the v1..v3 palettes reuse pinned token pairs only (no new color tokens)", () => {
    expect(ruleBody(".profile-avatar--v1")).toContain("background: var(--ok-soft)");
    expect(ruleBody(".profile-avatar--v1")).toContain("color: var(--ok-ink)");
    expect(ruleBody(".profile-avatar--v2")).toContain("background: var(--warn-soft)");
    expect(ruleBody(".profile-avatar--v3")).toContain("background: var(--surface-sunk)");
    expect(css).not.toMatch(/--avatar-[a-z-]*:\s*#/);
  });

  it("the first-run empty state is a warm designed block, sentence unchanged", () => {
    const html = render({ step: "resume", profiles: [] });
    expect(html).toContain("empty--warm");
    expect(html).toContain("No profiles on this device yet.");
    expect(html).toContain('class="empty-glyph"');
    expect(ruleBody(".empty--warm")).toContain("animation: fade-up var(--dur) var(--ease-out)");
    expect(ruleBody(".empty-glyph")).toContain("color: var(--accent)");
  });
});
