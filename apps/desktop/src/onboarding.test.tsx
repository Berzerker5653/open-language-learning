import { describe, expect, it, vi } from "vitest";
import { isValidElement as isElement, type ReactElement, type ReactNode } from "react";
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

// vitest runs in node here — this suite has no DOM (see the App.test.tsx
// header). So a "click" is the onClick prop on the element tree the
// component produced, which is exactly what a browser click would invoke.
// The other assertions keep inspecting the rendered markup as before.
function tree(overrides: Partial<OnboardingProps>): ReactElement {
  // `Onboarding` is presentational and hook-free, so calling it returns the
  // element tree a render would produce — which is what the walk below needs.
  // Rendering `<Onboarding …/>` instead would yield one opaque element whose
  // props carry no children, and the walk would see nothing.
  return Onboarding({ ...base, ...overrides });
}

function childNodes(el: ReactElement): ReactNode[] {
  const props: unknown = el.props;
  if (props && typeof props === "object" && "children" in props) {
    const kids: unknown = props.children;
    return Array.isArray(kids) ? (kids as ReactNode[]) : [kids as ReactNode];
  }
  return [];
}

function collectButtons(node: ReactNode, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) {
    for (const child of node) collectButtons(child, out);
    return out;
  }
  if (!isElement(node)) return out;
  if (node.type === "button") out.push(node);
  collectButtons(childNodes(node), out);
  return out;
}

function buttonLabeled(
  root: ReactElement,
  label: string,
): ReactElement<{ disabled?: boolean; onClick?: () => void }> {
  const found = collectButtons(root).find((el) =>
    childNodes(el).some((k) => typeof k === "string" && k.includes(label)),
  );
  if (!found) throw new Error(`no button labeled "${label}"`);
  // The walk finds elements by tag name alone, so the button props this file
  // reads (`disabled`, `onClick`) are asserted here once.
  return found as ReactElement<{ disabled?: boolean; onClick?: () => void }>;
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

  it("names the stage an install reported instead of leaving a silent window", () => {
    // K-62: the owner clicked the language install and the window said nothing
    // for the whole operation. The line must appear, be announced to assistive
    // technology, and never show a percentage the engine withheld.
    const running = render({
      step: "packs",
      progress: {
        operation: "install-pack",
        subject: "org.openlanguage.ja-demo",
        stage: "prepare",
        percent: null,
      },
    });
    expect(running).toContain('aria-live="polite"');
    expect(running).not.toMatch(/\d+\s*%/);
    // Nothing running: no element pretending an operation is underway.
    expect(render({ step: "packs" })).not.toContain('aria-live="polite"');
  });

  // K-72: saying "yes" to the microphone must lead into the speech
  // setup, never leave the learner to discover the downloads later.
  // K-90: the catalog ships recognition models only — spoken audio comes
  // from pack media, never from an installed synthesis payload.
  const missing = [
    {
      id: "tiny",
      name: "Listening (speech recognition, tiny)",
      installed: false,
      installable: true,
      size_bytes: 77_691_713,
      role: "recognition" as const,
    },
    {
      id: "base",
      name: "Listening (speech recognition, base)",
      installed: false,
      installable: true,
      size_bytes: 147_951_465,
      role: "recognition" as const,
    },
    {
      id: "asr",
      name: "Listening (speech recognition, sherpa)",
      installed: true,
      installable: true,
      size_bytes: 43_000_000,
      role: "recognition" as const,
    },
  ];

  it("lists the speech components with honest pinned sizes when chaining from the mic", () => {
    const html = render({ step: "speech-setup", micChosen: true, speechComponents: missing });
    expect(html).toContain("Speech setup");
    expect(html).toContain("Listening (speech recognition, tiny)");
    expect(html).toContain("not installed (78 MB");
    expect(html).toContain("not installed (148 MB");
    // The already-installed component says so; no fake pending state.
    expect(html).toContain("installed</span>");
    // The stepper gained the Speech step only because the mic was chosen.
    expect(html).toContain(">Speech<");
  });

  it("start-with-speech is gated on a recognition model only (K-90)", () => {
    // Recognition installed means speaking works; pack media covers spoken
    // responses on top and its absence never locks the start.
    const html = render({ step: "speech-setup", micChosen: true, speechComponents: missing });
    expect(html).not.toMatch(/disabled=""[^>]*>\s*Start with speech/);
    expect(html).toContain("Skip for now");
    // Without a recognition model the start is honestly locked.
    const noAsr = missing.map((c) => ({ ...c, installed: false }));
    const locked = render({ step: "speech-setup", micChosen: true, speechComponents: noAsr });
    expect(locked).toMatch(/disabled=""[^>]*>\s*Start with speech/);
  });

  it("locks and labels the install button while speech components download", () => {
    const html = render({
      step: "speech-setup",
      micChosen: true,
      speechInstalling: true,
      speechComponents: missing,
    });
    expect(html).toContain("Installing…");
    expect(html).toContain("aria-busy");
  });

  it("offers Start with speech once a recognition model is installed", () => {
    const all = missing.map((c) => ({ ...c, installed: true }));
    const html = render({ step: "speech-setup", micChosen: true, speechComponents: all });
    expect(html).not.toMatch(/disabled=""[^>]*>\s*Start with speech/);
    // Nothing left to install: the install button is honestly disabled.
    expect(html).toMatch(/disabled=""[^>]*>\s*Install speech components/);
  });

  // Owner regression (2026-10-12): the wizard list now includes imported
  // and catalog-installed packs, and the container populates installedPacks
  // — so a pack already on this device is selectable straight to Continue,
  // with no redundant Install click.
  it("unlocks Continue when a listed pack is already installed and selected", () => {
    const html = render({
      step: "packs",
      packs: [
        {
          pack_id: "org.openlanguage.imported-ja",
          display_name: "Imported Japanese pack",
          locale: "ja-JP",
          maturity: "community",
        },
      ],
      selectedPack: "org.openlanguage.imported-ja",
      installedPacks: ["org.openlanguage.imported-ja"],
    });
    expect(html).toContain("Imported Japanese pack");
    expect(html).toContain("(ja-JP, community)");
    // The install control becomes an honest done-state: labeled, locked.
    expect(html).toMatch(/disabled=""[^>]*>\s*Installed</);
    // No install click needed: Continue is live and the explanatory note is gone.
    expect(html).toContain(">Continue</button>");
    expect(html).not.toMatch(/disabled=""[^>]*>\s*Continue/);
    expect(html).not.toContain('data-testid="packs-continue-note"');
  });

  it("offers the locate-a-file path on the same step as the pack choice", () => {
    const html = render({ step: "packs" });
    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".lpk"');
    expect(html).toContain('aria-label="Locate a language pack file"');
  });

  it("keeps Skip for now available with nothing installed and wires it to the container", () => {
    const skipPack = vi.fn();
    const html = render({ step: "packs", installedPacks: [] });
    expect(html).toContain("Skip for now");
    const skip = buttonLabeled(tree({ step: "packs", onSkipPack: skipPack }), "Skip for now");
    // A learner with no installed pack is never trapped: the skip control
    // is present and enabled, whatever else the step looks like.
    expect(skip.props.disabled).toBeFalsy();
    skip.props.onClick?.();
    expect(skipPack).toHaveBeenCalledTimes(1);
  });

  it("still explains a locked Continue when nothing is selected or installed", () => {
    const html = render({ step: "packs" });
    expect(html).toContain('data-testid="packs-continue-note"');
    expect(html).toContain("Select an installed pack to continue");
    expect(html).toContain('aria-describedby="packs-continue-note"');
    expect(html).toMatch(/disabled=""[^>]*>\s*Continue/);
  });
});
