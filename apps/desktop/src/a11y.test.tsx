// ACC-001 automated accessibility audit (K-33). Static-markup semantics +
// palette contrast + motion/focus CSS invariants. The human screen-reader
// matrix (NVDA/VoiceOver/Orca) remains an owner gate (docs/11); automated
// checks supplement it and can never establish conformance alone.
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "@openlang/ui";
import { CanDoSummary, Home, ProgressView, type SessionPlan } from "./home";
import { PracticeRunner, type PracticeRunnerProps } from "./practice";
import { ScenarioPanel, type ScenarioPanelProps, type ScenarioView } from "./scenario";
import { PronunciationPractice, EMPTY_PITCH } from "./pronunciation";
import { WritingPractice } from "./writing";
import { Onboarding, type OnboardingProps } from "./onboarding";
import { PracticeHub } from "./hub";

import CSS from "../../../packages/ui/src/styles.css?raw";

const plan: SessionPlan = {
  items: [
    {
      item_id: "ja.lex.demo.a#recall-meaning",
      content_id: "ja.lex.demo.a",
      modality: "recall-meaning",
      reason: "due-review",
      kind: "review",
      est_seconds: 20,
    },
  ],
  total_seconds: 20,
  budget_minutes: 5,
  seed: 1,
  planner_version: "test",
};

const practice: PracticeRunnerProps = {
  task: {
    item_id: "ja.lex.demo.a#recall-meaning",
    surface: "あ",
    reading: "あ",
    choices: ["a", "i", "u"],
  },
  graded: true,
  correct: true,
  correctChoice: "a",
  routeHeading: "Practice",
  onChoose: () => {},
  onNext: () => {},
};

const active: ScenarioView = {
  scenario_id: "ja.scenario.demo.sc",
  title: "First meeting",
  situation: "Meeting someone",
  node: {
    id: "ja.scenario.demo.sc.open",
    prompt: "Greet them.",
    actions: ["greeting"],
    recovery: [],
  },
  ladder: [{ support_level: 0, description: "No supports" }],
  transfers: [],
  transfers_required: 1,
  support_used: [],
};

const scenario: ScenarioPanelProps = {
  scenarios: [
    {
      scenario_id: "ja.scenario.demo.sc",
      title: "First meeting",
      situation: "Meeting someone",
      goal_id: "ja.goal.demo.greet",
      goal_band: "on-ramp",
      readiness: "playable",
      unlocked: true,
      recommended: true,
    },
  ],
  active,
  lastStep: null,
  outcome: null,
  error: null,
  onStart: () => {},
  onAttempt: () => {},
  onSupport: () => {},
  onRecovery: () => {},
  onTransfer: () => {},
  onFinish: () => {},
  onBack: () => {},
};

const onboarding: OnboardingProps = {
  step: "welcome",
  notice: { title: "Data notice", points: ["Local by default."] },
  packs: [
    {
      pack_id: "org.openlanguage.ja-demo",
      display_name: "Japanese demo",
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
  speechComponents: [
    {
      id: "tiny",
      name: "Listening (speech recognition, tiny)",
      installed: false,
      installable: true,
      size_bytes: 77_691_713,
      role: "recognition",
    },
    {
      id: "asr",
      name: "Listening (speech recognition, sherpa)",
      installed: true,
      installable: true,
      size_bytes: 43_000_000,
      role: "recognition",
    },
  ],
  onContinue: () => {},
  onResume: () => {},
  onCreateNew: () => {},
};

/** Every rendered route surface, in one place for the semantic sweep. */
const surfaces: Record<string, string> = {
  shell: renderToStaticMarkup(
    <AppShell productName="OLP" nav={[{ id: "home", label: "Home" }]}>
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={5}
        onBudget={() => {}}
        onStart={() => {}}
      />
    </AppShell>,
  ),
  home: renderToStaticMarkup(
    <Home
      displayName="Hunter"
      plan={plan}
      activeBudget={5}
      onBudget={() => {}}
      onStart={() => {}}
      onStartSession={() => {}}
    />,
  ),
  progress: renderToStaticMarkup(
    <>
      <CanDoSummary
        goals={[]}
        rows={[
          {
            content_id: "ja.lex.demo.a",
            dimension: "recall-meaning",
            state: "supported",
            confidence: 0.6,
            needs_refresh: false,
          },
        ]}
        nextGoal={null}
      />
      <ProgressView
        rows={[
          {
            content_id: "ja.lex.demo.a",
            dimension: "recall-meaning",
            state: "supported",
            confidence: 0.6,
            needs_refresh: false,
          },
        ]}
      />
    </>,
  ),
  practice: renderToStaticMarkup(<PracticeRunner {...practice} />),
  hub: renderToStaticMarkup(<PracticeHub onOpen={() => {}} />),
  scenario: renderToStaticMarkup(<ScenarioPanel {...scenario} />),
  pronunciation: renderToStaticMarkup(
    <PronunciationPractice
      shortText="おばさん"
      longText="おばあさん"
      description="Contrastive long vowel: おばさん (aunt) vs おばあさん (grandmother)"
      featureId="ja.phon.vowel-length"
      measure="voiced-duration-ratio"
      recording={false}
      hasAttempt={false}
      result={null}
      onRecord={() => {}}
      onStop={() => {}}
      onPlayReference={() => {}}
      onPlayAttempt={() => {}}
    />,
  ),
  "pronunciation-feedback": renderToStaticMarkup(
    <PronunciationPractice
      shortText="おばさん"
      longText="おばあさん"
      description="Contrastive long vowel: おばさん (aunt) vs おばあさん (grandmother)"
      featureId="ja.phon.vowel-length"
      measure="voiced-duration-ratio"
      recording={false}
      hasAttempt={true}
      result={{
        corrections: [
          {
            feature_id: "ja.vowel.length",
            band: "needs-work",
            feedback_template_id: "speech.long-vowel.shorter",
          },
        ],
        abstain_reason: null,
        mode: "guided",
        mode_reason: "no-calibration-record",
        pitch: EMPTY_PITCH,
      }}
      onRecord={() => {}}
      onStop={() => {}}
      onPlayReference={() => {}}
      onPlayAttempt={() => {}}
    />,
  ),
  writing: renderToStaticMarkup(
    <WritingPractice
      task={{ item_id: "ja.lex.demo.a", prompt_text: "I" }}
      draft=""
      graded={true}
      correct={true}
      onDraft={() => {}}
      onSubmit={() => {}}
      onHint={() => {}}
    />,
  ),
  onboarding: renderToStaticMarkup(<Onboarding {...onboarding} />),
  "onboarding-speech": renderToStaticMarkup(
    <Onboarding {...onboarding} step="speech-setup" micChosen />,
  ),
};

function buttons(html: string): { tag: string; body: string }[] {
  const out: { tag: string; body: string }[] = [];
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push({ tag: m[1] ?? "", body: m[2] ?? "" });
  return out;
}

function textContent(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/g, "x")
    .trim();
}

describe("automated accessibility audit (ACC-001 auto portion)", () => {
  for (const [name, html] of Object.entries(surfaces)) {
    it(`${name}: no positive tabindex (focus order follows DOM order)`, () => {
      expect(html).not.toMatch(/tabindex="(?!-)/i);
    });
    it(`${name}: every button has an accessible name`, () => {
      for (const b of buttons(html)) {
        const named = /aria-label="[^"]+"/.test(b.tag) || textContent(b.body).length > 0;
        expect(named, `button without name in ${name}: ${b.tag}`).toBe(true);
      }
    });
    it(`${name}: every input/select/textarea is labeled`, () => {
      const labels = new Set(
        [...html.matchAll(/<label\b[^>]*for="([^"]+)"/g)].map((m) => m[1] ?? ""),
      );
      const fields = html.match(/<(input|select|textarea)\b[^>]*>/g) ?? [];
      for (const f of fields) {
        const named =
          /aria-label="[^"]+"/.test(f) ||
          /aria-labelledby=/.test(f) ||
          (/id="([^"]+)"/.test(f) && labels.has(RegExp.$1));
        expect(named, `unlabeled field in ${name}: ${f}`).toBe(true);
      }
    });
  }

  it("shell provides skip link + main landmark + banner + nav", () => {
    const html = surfaces.shell;
    expect(html).toContain('<a href="#main">');
    expect(html).toContain('<main id="main">');
    expect(html).toContain("<header>");
    expect(html).toContain('<nav aria-label="Primary">');
  });

  it("top-level routes carry exactly one h1", () => {
    // Route surfaces the static harness can build: home/progress/onboarding
    // plus the standalone runner (route usage carries routeHeading) and the
    // task-bearing route components. The inline App sections promoted in the
    // same change (Shadowing, Graded reading, My words, Placement, Kanji,
    // Writing empty/error states) are guarded by typecheck + review, not
    // this harness, until App is mountable.
    for (const name of [
      "home",
      "progress",
      "onboarding",
      "practice",
      "pronunciation",
      "pronunciation-feedback",
      "writing",
    ]) {
      const count = (surfaces[name]?.match(/<h1\b/g) ?? []).length;
      expect(count, `${name} h1 count`).toBe(1);
    }
  });

  it("feedback is announced, not color-only", () => {
    // practice verdicts carry text; live regions exist on status surfaces
    expect(surfaces.practice).toMatch(/role="(status|alert)"|aria-live=/);
    expect(surfaces.scenario).toMatch(/aria-live="polite"/);
    expect(surfaces["pronunciation-feedback"]).toMatch(/aria-live="polite"/);
    expect(surfaces.writing).toMatch(/aria-live="polite"/);
  });

  it("live regions pre-exist their content (WCAG 4.1.3 timing rule)", () => {
    // The mutation must land inside an element that was already in the tree;
    // regions that mount together with the verdict are never announced.
    const ungradedWriting = renderToStaticMarkup(
      <WritingPractice
        task={{ item_id: "ja.lex.demo.a", prompt_text: "I" }}
        draft=""
        graded={false}
        correct={false}
        onDraft={() => {}}
        onSubmit={() => {}}
        onHint={() => {}}
      />,
    );
    expect(ungradedWriting).toMatch(/aria-live="polite"/);
    expect(ungradedWriting).not.toContain("Correct");
    const noResult = renderToStaticMarkup(
      <PronunciationPractice
        shortText="おばさん"
        longText="おばあさん"
        description="Contrastive long vowel: おばさん (aunt) vs おばあさん (grandmother)"
        featureId="ja.phon.vowel-length"
        measure="voiced-duration-ratio"
        recording={false}
        hasAttempt={false}
        result={null}
        onRecord={() => {}}
        onStop={() => {}}
        onPlayReference={() => {}}
        onPlayAttempt={() => {}}
      />,
    );
    expect(noResult).toMatch(/aria-live="polite"/);
  });

  it("audio controls carry accessible names", () => {
    // names come from button text content (verified by the button sweep);
    // assert the reference-playback controls exist for both words
    expect(surfaces.pronunciation).toContain("Hear reference: おばさん");
    expect(surfaces.pronunciation).toContain("Hear reference: おばあさん");
  });

  // ---- palette contrast (WCAG 2.2 AA, body text >= 4.5:1) ----
  const vars = Object.fromEntries(
    [...CSS.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1] ?? "", m[2] ?? ""]),
  );
  const lum = (hex: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * (c[0] ?? 0) + 0.7152 * (c[1] ?? 0) + 0.0722 * (c[2] ?? 0);
  };
  const ratio = (a: string, b: string) =>
    (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

  const bodyPairs: [string, string][] = [
    ["ink", "bg"],
    ["ink", "surface"],
    ["ink-soft", "surface"],
    ["ink-soft", "bg"],
    ["ink-faint", "surface"],
    ["ink-faint", "bg"],
    ["ink", "surface-sunk"],
    ["accent", "surface"],
    ["accent-ink", "surface"],
    ["accent-ink", "accent-soft"],
    ["ok-ink", "ok-soft"],
    ["err", "err-soft"],
    ["warn", "warn-soft"],
    ["surface", "accent"],
    ["surface", "ok"],
    ["surface", "err"],
    ["surface", "warn"],
  ];
  for (const [fg, bg] of bodyPairs) {
    it(`contrast ${fg} on ${bg} >= 4.5:1`, () => {
      expect(vars[fg], `--${fg} missing`).toBeTruthy();
      expect(vars[bg], `--${bg} missing`).toBeTruthy();
      expect(ratio(vars[fg]!, vars[bg]!)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("reduced-motion and visible-focus rules exist", () => {
    expect(CSS).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(CSS).toMatch(/:focus-visible/);
    // skip link becomes visible on focus (docs/11: visible focus)
    expect(CSS).toMatch(/a\[href="#main"\]:focus/);
  });
});
