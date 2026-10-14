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
import { ScenarioPanel, type ScenarioView } from "./scenario";

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
});
