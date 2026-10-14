// RTL-001 (ADR-0029): direction behaviour for a right-to-left pack.
// The fixture mirrors examples/ar-ma — pack_id org.openlanguage.ar.scaffold,
// target_locale ar-MA, capabilities.rtl true — because the acceptance is about
// a non-Japanese RTL pack. The ja-JP render is the control that proves an LTR
// pack gains no direction flip.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { AppShell } from "@openlang/ui";
import { Home, type SessionPlan } from "./home";
import { PracticeRunner, type PracticeTaskView } from "./practice";
import { ReadingPanel, type ReadingPanelProps, type Story } from "./reading";
import { ScenarioPanel, type ScenarioView } from "./scenario";
import { ShadowingPanel, type ShadowTarget } from "./shadowing";
import { MyWordsPanel, type MineItem } from "./words";

const arabicPlan: SessionPlan = {
  items: [
    {
      item_id: "ar.lex.salam#recall-meaning",
      content_id: "ar.lex.salam",
      modality: "recall-meaning",
      reason: "due-review",
      kind: "review",
      est_seconds: 20,
      surface: "السلام",
      gloss: "peace",
    },
  ],
  total_seconds: 20,
  budget_minutes: 5,
  seed: 0,
  planner_version: "session-planner-0.1.0",
};

const japanesePlan: SessionPlan = {
  ...arabicPlan,
  items: [
    {
      item_id: "ja.lex.watashi#recall-meaning",
      content_id: "ja.lex.watashi",
      modality: "recall-meaning",
      reason: "due-review",
      kind: "review",
      est_seconds: 20,
      surface: "私",
      gloss: "I",
    },
  ],
};

const arabicTask: PracticeTaskView = {
  item_id: "ar.lex.salam#recall-meaning",
  surface: "السلام",
  reading: "وعليكم السلام",
  romaji: "as-salamu alaykum",
  choices: ["وعليكم", "peace"],
};

function shell(dir: "ltr" | "rtl", locale: string, children: ReactNode): string {
  return renderToStaticMarkup(
    <AppShell
      productName="Open Language Learning Platform"
      nav={[]}
      packDirection={dir}
      packLocale={locale}
    >
      {children}
    </AppShell>,
  );
}

describe("pack direction (RTL-001, ADR-0029)", () => {
  it("renders pack content right-to-left for a pack that declares rtl", () => {
    const html = shell(
      "rtl",
      "ar-MA",
      <Home
        displayName="Hunter"
        plan={arabicPlan}
        activeBudget={5}
        onBudget={() => {}}
        activePack={{ name: "Arabic (Morocco) Starter", posture: "community-reviewed" }}
      />,
    );
    // The pack-sourced run flips and carries the manifest locale.
    expect(html).toContain('<strong dir="rtl" lang="ar-MA" class="plan-surface">السلام</strong>');
    // The Latin gloss in the same row stays left-to-right.
    expect(html).toContain('<span dir="ltr" lang="en">peace</span>');
  });

  it("keeps the shell itself left-to-right for an RTL pack", () => {
    const html = shell(
      "rtl",
      "ar-MA",
      <Home
        displayName="Hunter"
        plan={arabicPlan}
        activeBudget={5}
        onBudget={() => {}}
        activePack={{ name: "Arabic (Morocco) Starter", posture: "community-reviewed" }}
      />,
    );
    const banner = html.slice(0, html.indexOf("<main"));
    expect(banner).not.toContain("dir=");
    // App-authored chrome inside the content region gains no direction either.
    expect(html).toContain("<h1>Hi Hunter</h1>");
    expect(html).toContain('<p class="prompt">what to practice now</p>');
  });

  it("leaves an LTR pack unflipped but still language-tagged", () => {
    const html = shell(
      "ltr",
      "ja-JP",
      <Home
        displayName="Hunter"
        plan={japanesePlan}
        activeBudget={5}
        onBudget={() => {}}
        activePack={{ name: "Japanese demo", posture: "community-reviewed" }}
      />,
    );
    expect(html).toContain('<strong lang="ja-JP" class="plan-surface">私</strong>');
    expect(html).not.toContain('dir="rtl"');
  });

  it("flips the practice prompt and choices while romanization stays LTR", () => {
    const html = shell(
      "rtl",
      "ar-MA",
      <PracticeRunner
        task={arabicTask}
        graded={false}
        correct={false}
        correctChoice="وعليكم"
        onChoose={() => {}}
        onNext={() => {}}
      />,
    );
    expect(html).toContain('<p class="prompt" dir="rtl" lang="ar-MA">');
    expect(html).toContain('<span dir="rtl" lang="ar-MA">وعليكم</span>');
    // Romanization is the one run in the same block that must stay LTR.
    expect(html).toContain('<span dir="ltr" lang="en">as-salamu alaykum</span>');
  });

  it("flips scenario dialogue but not the support chrome", () => {
    const arabicScenario: ScenarioView = {
      scenario_id: "ar.sc.salam",
      title: "السلام عليكم",
      situation: "لقاء أول",
      node: { id: "n1", prompt: "كيف حالك؟", actions: ["بخير"], recovery: [] },
      ladder: [{ support_level: 1, description: "Show an example" }],
      transfers: [],
      transfers_required: 0,
      support_used: [],
    };
    const html = shell(
      "rtl",
      "ar-MA",
      <ScenarioPanel
        scenarios={[]}
        active={arabicScenario}
        lastStep={null}
        outcome={null}
        error={null}
        onStart={() => {}}
        onAttempt={() => {}}
        onSupport={() => {}}
        onRecovery={() => {}}
        onTransfer={() => {}}
        onFinish={() => {}}
        onBack={() => {}}
      />,
    );
    expect(html).toContain('<h2 dir="rtl" lang="ar-MA">السلام عليكم</h2>');
    expect(html).toContain('<p aria-live="polite" class="prompt" dir="rtl" lang="ar-MA">');
    expect(html).toContain('<span dir="rtl" lang="ar-MA">بخير</span>');
    // The support ladder is app chrome: no direction of its own.
    expect(html).toContain("<legend>Support</legend>");
  });

  // The three surfaces that used to live inline in App.tsx: extracted into
  // panels so this direction contract is testable at all, then fixed.
  const arabicStory: Story = {
    id: "ar.story.salam",
    title: "السلام عليكم",
    status: "draft",
    sentences: [
      {
        content_id: "ar.sentence.1",
        text: "كيف حالك؟",
        furigana: null,
        romaji: "kayfa haluk?",
        faded_by_mastery: false,
        gloss: "How are you?",
        status: "draft",
        known: [
          {
            id: "ar.lex.hal",
            surface: "حالك",
            reading: null,
            romaji: "haluk",
            gloss: "your condition",
            status: "draft",
          },
        ],
      },
    ],
  };

  function readingPanel(overrides: Partial<ReadingPanelProps> = {}) {
    return (
      <ReadingPanel
        storyList={[
          {
            id: arabicStory.id,
            title: arabicStory.title,
            description: null,
            status: "draft",
            sentence_count: 1,
          },
        ]}
        storyActive={arabicStory}
        storyLookup="ar.sentence.1"
        storyError={null}
        onOpenStory={() => {}}
        onBack={() => {}}
        onPlaySentence={() => {}}
        onToggleLookup={() => {}}
        onMine={() => {}}
        {...overrides}
      />
    );
  }

  it("flips story titles, sentences and looked-up words, but not the reading prose", () => {
    const html = shell("rtl", "ar-MA", readingPanel());
    // Story title inside the app's own h1: the heading stays, the run flips.
    expect(html).toContain('<h1><span dir="rtl" lang="ar-MA">السلام عليكم</span></h1>');
    // Sentence surface (Ruby renders bare text, so the container carries it).
    expect(html).toContain('<span dir="rtl" lang="ar-MA">كيف حالك؟</span>');
    // Looked-up pack word flips with the sentence it came from.
    expect(html).toContain('<span dir="rtl" lang="ar-MA">حالك</span>');
    // Romaji and the English gloss stay readable inside the RTL block.
    expect(html).toContain('<span dir="ltr" lang="en">kayfa haluk?</span>');
    expect(html).toContain('<span dir="ltr" lang="en">How are you?</span>');
    // Explanatory prose is app chrome.
    expect(html).toContain('<p class="empty">Read along at your level.');
  });

  it("names each story in the pack direction and leaves an LTR pack unflipped", () => {
    const listHtml = shell("rtl", "ar-MA", readingPanel({ storyActive: null, storyLookup: null }));
    expect(listHtml).toContain('<span dir="rtl" lang="ar-MA">السلام عليكم</span> (1)');
    const japaneseStory: Story = { ...arabicStory, title: "はじめまして", sentences: [] };
    const jaHtml = shell(
      "ltr",
      "ja-JP",
      readingPanel({ storyActive: japaneseStory, storyLookup: null }),
    );
    expect(jaHtml).toContain('<span lang="ja-JP">はじめまして</span>');
    expect(jaHtml).not.toContain('dir="rtl"');
  });

  it("flips the shadowing target and reading scaffold while romanization stays LTR", () => {
    const targets: ShadowTarget[] = [
      {
        content_id: "ar.audio.salam",
        surface: "السلام عليكم",
        reading: "وعليكم السلام",
        romaji: "as-salamu alaykum",
      },
      {
        content_id: "ar.audio.marhaban",
        surface: "مرحبا",
        reading: null,
        romaji: "marhaban",
      },
    ];
    const html = shell(
      "rtl",
      "ar-MA",
      <ShadowingPanel
        items={targets}
        index={0}
        error={null}
        audioMsg={null}
        recording={false}
        attemptUrl={null}
        onRetry={() => {}}
        onOpenSetup={() => {}}
        onPlayModel={() => {}}
        onRecord={() => {}}
        onStop={() => {}}
        onPlayAttempt={() => {}}
        onStep={() => {}}
      />,
    );
    expect(html).toContain('<p dir="rtl" lang="ar-MA" class="surface">السلام عليكم</p>');
    expect(html).toContain('<p class="reading" dir="rtl" lang="ar-MA">وعليكم السلام</p>');
    // The first target has a pack-script reading; romanization is not shown.
    expect(html).not.toContain("as-salamu alaykum");
  });

  it("shows the romanization-only shadowing target left-to-right", () => {
    const targets: ShadowTarget[] = [
      { content_id: "ar.audio.marhaban", surface: "مرحبا", reading: null, romaji: "marhaban" },
    ];
    const html = shell(
      "rtl",
      "ar-MA",
      <ShadowingPanel
        items={targets}
        index={0}
        error={null}
        audioMsg={null}
        recording={false}
        attemptUrl={null}
        onRetry={() => {}}
        onOpenSetup={() => {}}
        onPlayModel={() => {}}
        onRecord={() => {}}
        onStop={() => {}}
        onPlayAttempt={() => {}}
        onStep={() => {}}
      />,
    );
    expect(html).toContain('<p dir="rtl" lang="ar-MA" class="surface">مرحبا</p>');
    expect(html).toContain('<p class="reading"><span dir="ltr" lang="en">marhaban</span></p>');
  });

  it("carries pack direction through the review card and the add-word inputs", () => {
    const item: MineItem = {
      id: "mine-1",
      surface: "حالك",
      reading: "حالك",
      gloss: "your condition",
      source_citation: "ar.story.salam#1",
      created_at: "2026-10-14T00:00:00Z",
      due_at: null,
    };
    const html = shell(
      "rtl",
      "ar-MA",
      <MyWordsPanel
        items={[item]}
        review={{ item, revealed: true }}
        error={null}
        notice={null}
        draft={{ surface: "مرحبا", reading: "", gloss: "hello", source: "" }}
        onDraftChange={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
        onGrade={() => {}}
        onStartReview={() => {}}
        onReveal={() => {}}
      />,
    );
    expect(html).toContain('<p dir="rtl" lang="ar-MA" class="prompt">حالك</p>');
    expect(html).toMatch(/<input id="mine-surface"[^>]*dir="rtl"/);
    expect(html).toMatch(/<input id="mine-reading"[^>]*lang="ar-MA"/);
    // The learner's own meaning/citation notes are not pack text.
    expect(html).toMatch(/<input id="mine-gloss"[^>]*value="hello"[^>]*\/>/);
    expect(html).not.toMatch(/<input id="mine-gloss"[^>]*dir=/);
    expect(html).not.toMatch(/<input id="mine-source"[^>]*dir=/);
  });
});
