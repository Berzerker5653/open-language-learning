// EMPTY-STATES-001: every empty-state surface renders a designed empty
// state — a line-art glyph, one honest one-line title, and (where the
// surface offers one) an action-appropriate affordance. No emojis, no
// inline hex; all paint through the app's existing tokens.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { EmptyState, EmptyGlyph } from "./empty-state";
import { Home } from "./home";
import { PracticeHub } from "./hub";
import { MyWordsPanel } from "./words";
import { ProgressZeroState } from "./memory-stats";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const stylesCss = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");

const EMPTY_GLYPH_KINDS = ["ring", "compass", "book", "path", "sprout"] as const;

describe("EmptyState shared contract", () => {
  it("renders a glyph, an honest one-line title, and the affordance", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        glyph="compass"
        title="No pack is active yet."
        copy="Choose a pack first."
        actionLabel="Choose a pack"
        onAction={() => undefined}
        dataTestId="t"
      />,
    );
    expect(html).toContain("empty empty--warm empty-state");
    expect(html).toContain("<svg");
    expect(html).toContain("No pack is active yet.");
    expect(html).toContain("Choose a pack");
    expect(html).toContain('role="status"');
    expect(html).toContain('data-testid="t"');
  });

  it("every glyph kind renders as a 1.5px line-art SVG, currentColor, aria-hidden", () => {
    for (const kind of EMPTY_GLYPH_KINDS) {
      const html = renderToStaticMarkup(<EmptyGlyph kind={kind} />);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('stroke="currentColor"');
      expect(html).toContain('viewBox="0 0 32 32"');
      expect(html).not.toMatch(/emoji|🪙|⭐|🎉/);
    }
  });

  it("the copy/title/action layer carries no inline hex or font-size override", () => {
    const body = stylesCss.match(/\.empty-state-title\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(body).toContain("var(--font-display)");
  });

  it("anchor affordance renders a real link (My Words add-word case)", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        glyph="book"
        title="Nothing mined yet."
        actionLabel="Add a word"
        actionHref="#mine-surface"
      />,
    );
    expect(html).toContain('href="#mine-surface"');
  });
});

describe("Practice hub (no pack installed)", () => {
  it("renders the designed empty state instead of the mode list, with a way out", () => {
    const html = renderToStaticMarkup(
      <PracticeHub onOpen={() => undefined} noPack onOpenLanguagePacks={() => undefined} />,
    );
    expect(html).toContain("hub-empty");
    expect(html).toContain("No language pack is active");
    expect(html).toContain("Choose a pack");
    expect(html).not.toContain("Pronunciation");
    expect(html).not.toContain("Scenarios");
  });

  it("keeps the mode list when a pack is active", () => {
    const html = renderToStaticMarkup(<PracticeHub onOpen={() => undefined} />);
    expect(html).toContain("Pronunciation");
    expect(html).not.toContain("hub-empty");
  });
});

describe("My words (nothing mined yet)", () => {
  const items: any[] = [];
  it("renders the designed empty state with an anchor to the add form", () => {
    const html = renderToStaticMarkup(
      <MyWordsPanel
        items={items}
        loading={false}
        flashId={null}
        review={null}
        intervalPreview={null}
        error={null}
        notice={null}
        draft={{ surface: "", reading: "", gloss: "", source: "" }}
        onDraftChange={() => undefined}
        onAdd={() => undefined}
        onRemove={() => undefined}
        onGrade={() => undefined}
        onStartReview={() => undefined}
        onReviewNow={() => undefined}
        onStartNewReview={() => undefined}
        onReveal={() => undefined}
      />,
    );
    expect(html).toContain("mywords-empty");
    expect(html).toContain("Nothing mined yet.");
    expect(html).toContain('href="#mine-surface"');
  });
});

describe("Progress (no session history)", () => {
  it("renders the designed glyph and an honest affordance", () => {
    const html = renderToStaticMarkup(<ProgressZeroState onStart={() => undefined} />);
    expect(html).toContain("progress-zero");
    expect(html).toContain("<svg");
    expect(html).toContain("Nothing studied yet");
    expect(html).toContain("Start your first session");
    // honesty guard: no streak/score vocabulary
    expect(html.toLowerCase()).not.toMatch(/streak|points|score|day [0-9]/);
  });
});

describe("Today / path view (fresh, no plan)", () => {
  it("renders the designed no-due empty state with the explore affordance", () => {
    const html = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={{ items: [], total_seconds: 0, budget_minutes: 5, seed: 1, planner_version: "v" }}
        activeBudget={5}
        onBudget={() => undefined}
        onExplore={() => undefined}
      />,
    );
    expect(html).toContain("no-due-empty");
    expect(html).toContain("Nothing is due right now.");
    expect(html).toContain("Open practice modes");
  });

  it("renders the designed no-learning-path empty state with a way out", () => {
    const html = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={{ items: [], total_seconds: 0, budget_minutes: 5, seed: 1, planner_version: "v" }}
        activeBudget={5}
        onBudget={() => undefined}
        nextGoal={null}
        onChooseLanguage={() => undefined}
      />,
    );
    expect(html).toContain("path-empty");
    expect(html).toContain("This pack declares no learning path yet.");
    expect(html).toContain("Choose a pack");
  });
});
