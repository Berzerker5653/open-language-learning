import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Onboarding, type OnboardingProps } from "./onboarding";

const base: OnboardingProps = {
  step: "welcome",
  notice: {
    title: "How this app handles your data",
    points: [
      "Everything runs on this device unless you enable an online provider.",
      "Recordings stay local; nothing is uploaded without your explicit choice.",
    ],
  },
  packs: [
    {
      pack_id: "org.openlanguage.ja-demo",
      display_name: "Japanese — demo lexicon (EDRDG-derived)",
      locale: "ja-JP",
      maturity: "community",
    },
  ],
  selectedPack: null,
  installedPacks: [],
  profileName: "",
  onProfileName: () => {},
  onCreateProfile: () => {},
  onSelectPack: () => {},
  onInstall: () => {},
  onEnableMic: () => {},
  onSkipMic: () => {},
  onContinue: () => {},
  onResume: () => {},
  onCreateNew: () => {},
};

function render(overrides: Partial<OnboardingProps>) {
  return renderToStaticMarkup(<Onboarding {...base} {...overrides} />);
}

describe("onboarding", () => {
  it("explains local processing and requires no account", () => {
    const html = render({});
    expect(html).toContain("How this app handles your data");
    expect(html).toContain("Everything runs on this device");
    expect(html).toContain("No account required");
    // No credential fields anywhere in the welcome step.
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain("email");
  });

  it("offers the Japanese pack for selection and installation", () => {
    const html = render({ step: "packs" });
    expect(html).toContain("Japanese — demo lexicon");
    expect(html).toContain("(ja-JP, community)");
    expect(html).toContain(">Install<");
    // Continue is gated until a pack is selected and installed.
    expect(html).toContain("disabled");
    const ready = render({
      step: "packs",
      selectedPack: "org.openlanguage.ja-demo",
      installedPacks: ["org.openlanguage.ja-demo"],
    });
    expect(ready).toContain(">Installed<");
    expect(ready).toContain(">Continue</button>");
    expect(ready).not.toContain('disabled="">Continue');
  });

  it("makes microphone setup skippable", () => {
    const html = render({ step: "microphone" });
    expect(html).toContain("Enable microphone");
    expect(html).toContain("Skip for now");
    expect(html).toContain("never required");
  });

  it("finishes without any account step", () => {
    const html = render({ step: "done" });
    expect(html).toContain("Profile created locally");
    expect(html).toContain("Start learning");
    expect(html).not.toContain("sign up");
    expect(html).not.toContain("log in");
  });

  it("offers existing profiles for resume before onboarding", () => {
    const html = render({
      step: "resume",
      profiles: [
        { id: "p1", display_name: "Hunter" },
        { id: "p2", display_name: "Aiko" },
      ],
    });
    expect(html).toContain("Welcome back");
    expect(html).toContain("Hunter");
    expect(html).toContain("Aiko");
    expect(html).toContain("Create a new profile");
    // Resume is not the onboarding wizard: no stepper, no account talk.
    expect(html).not.toContain('aria-label="Progress"');
    expect(html).not.toContain("sign up");
  });

  it("keeps an install failure from dead-ending the wizard", () => {
    const html = render({
      step: "packs",
      selectedPack: "org.openlanguage.ja-demo",
      installedPacks: [],
      error: "Could not install that pack: disk full",
    });
    // Visible, actionable path: retry the install or pick another pack
    // (the engine requires an installed pack, so "continue without" is
    // not offered as a fake way out).
    expect(html).toContain("Press Install again to retry");
    expect(html).toContain("select a different pack");
    expect(html).toContain('aria-describedby="packs-continue-note"');
    // Continue stays disabled while unmet — but explained, never silent.
    expect(html).toContain("disabled");
  });
});
