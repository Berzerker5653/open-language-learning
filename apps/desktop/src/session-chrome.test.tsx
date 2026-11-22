// SESSION-CHROME-001 (visual-ui-audit U3/U6): the in-session chrome, the
// end-of-session summary card, dues-as-minutes, the graded/formative badge,
// and the FSRS next-interval preview on review grade buttons.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { remainingPlanSeconds, remainingTimeLabel, SessionChrome } from "./session-chrome";
import { Home, summarizeForms, type PlannedItem, type SessionPlan } from "./home";
import { PracticeHub } from "./hub";
import { MyWordsPanel, previewIntervalLabel, type MineDraft, type MineItem } from "./words";

const item = (id: string, extra: Partial<PlannedItem> = {}): PlannedItem => ({
  item_id: `ja.lex.demo.${id}#recall-meaning`,
  content_id: `ja.lex.demo.${id}`,
  modality: "recall-meaning",
  reason: "due-review",
  kind: "review",
  est_seconds: 20,
  ...extra,
});

const plan: SessionPlan = {
  items: [item("a"), item("b"), item("c", { reason: "progression", kind: "introduction" })],
  total_seconds: 60,
  budget_minutes: 10,
  seed: 1,
  planner_version: "session-planner-0.1.0",
};

describe("remainingPlanSeconds (SESSION-TIMER-001 derivation)", () => {
  const priced = (s: number) => ({ est_seconds: s });

  it("prices the WHOLE queue at session start, so the header opens with a real estimate", () => {
    const items = [priced(20), priced(20), priced(60)];
    expect(remainingPlanSeconds(items, 0)).toBe(100);
    const html = renderToStaticMarkup(
      <SessionChrome
        done={0}
        total={items.length}
        remainingSeconds={remainingPlanSeconds(items, 0)}
        status="running"
      />,
    );
    expect(html).toContain("~2 min left");
    expect(html).not.toMatch(/(^|[^\d])0 min left/);
  });

  it("drops completed items as the session advances, keeping the open one priced", () => {
    const items = [priced(20), priced(60), priced(40)];
    expect(remainingPlanSeconds(items, 1)).toBe(100);
    expect(remainingPlanSeconds(items, items.length)).toBe(0);
  });

  it("derives to zero for an unpriced queue and the chrome then prints no time, never '0 min left'", () => {
    const items = [{ est_seconds: 0 }];
    expect(remainingPlanSeconds(items, 0)).toBe(0);
    const html = renderToStaticMarkup(
      <SessionChrome
        done={0}
        total={1}
        remainingSeconds={remainingPlanSeconds(items, 0)}
        status="running"
      />,
    );
    expect(html).toContain("1 of 1");
    expect(html).not.toMatch(/min left/);
  });

  it("floors a short positive remainder at ~1 minute rather than 0", () => {
    const html = renderToStaticMarkup(
      <SessionChrome
        done={3}
        total={4}
        remainingSeconds={remainingPlanSeconds([priced(20)], 0)}
        status="running"
      />,
    );
    expect(html).toContain("~1 min left");
    expect(html).not.toMatch(/(^|[^\d])0 min left/);
  });
});

describe("SessionChrome (U3 in-session progress bar)", () => {
  it("shows a progressbar with the true done/total and the n-of-N step", () => {
    const html = renderToStaticMarkup(
      <SessionChrome done={1} total={3} remainingSeconds={40} status="running" />,
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain('aria-valuemax="3"');
    expect(html).toContain("2 of 3");
    expect(html).toContain("~1 min left");
    expect(html).toContain('style="width:33%"');
  });

  it("prints no time figure at all when the engine has no estimate", () => {
    const html = renderToStaticMarkup(
      <SessionChrome done={0} total={2} remainingSeconds={null} status="running" />,
    );
    expect(html).toContain("1 of 2");
    expect(html).not.toMatch(/min left/);
  });

  it("marks a paused session as paused and parks the counter at N of N", () => {
    const paused = renderToStaticMarkup(
      <SessionChrome done={1} total={2} remainingSeconds={20} status="paused" />,
    );
    expect(paused).toContain("Session paused");
    const last = renderToStaticMarkup(
      <SessionChrome done={2} total={2} remainingSeconds={0} status="running" />,
    );
    expect(last).toContain("2 of 2");
    expect(last).not.toContain("3 of 2");
  });

  it("never carries XP, streak, or reward language (ADR-0002)", () => {
    const html = renderToStaticMarkup(
      <SessionChrome done={1} total={3} remainingSeconds={90} status="running" />,
    );
    expect(html).not.toMatch(/xp|streak|points|reward|badge|celebrat/i);
  });

  it("remainingTimeLabel rounds up to at least one honest minute", () => {
    expect(remainingTimeLabel(null)).toBeNull();
    expect(remainingTimeLabel(0)).toBeNull();
    expect(remainingTimeLabel(30)).toBe("~1 min left");
    expect(remainingTimeLabel(600)).toBe("~10 min left");
  });
});

describe("Home session summary card and dues budget (U3/U6)", () => {
  it("the end card states activities done, measured time, and forms surfaced", () => {
    const html = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={10}
        onBudget={() => undefined}
        sessionOutcome={{
          done: 2,
          total: 3,
          reason: "finished",
          notRunnable: 0,
          minutes: 7,
          forms: ["猫", "食べる"],
        }}
      />,
    );
    expect(html).toContain("Session finished — 2 of 3 activities.");
    expect(html).toContain("About 7 minutes on the activities.");
    expect(html).toContain("Forms you saw: 猫, 食べる");
    // No reward mechanics on the summary either.
    expect(html).not.toMatch(/xp|streak|congratul/i);
  });

  it("a sub-minute session says under a minute, and no time renders when unknown", () => {
    const short = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={10}
        onBudget={() => undefined}
        sessionOutcome={{
          done: 1,
          total: 1,
          reason: "finished",
          notRunnable: 0,
          minutes: 0,
          forms: [],
        }}
      />,
    );
    expect(short).toContain("Under a minute on the activities.");
    const unknown = renderToStaticMarkup(
      <Home
        displayName="Hunter"
        plan={plan}
        activeBudget={10}
        onBudget={() => undefined}
        sessionOutcome={{ done: 1, total: 1, reason: "stopped", notRunnable: 0 }}
      />,
    );
    expect(unknown).not.toMatch(/on the activities/);
  });

  it("the review group header prices the dues in minutes from the engine estimates", () => {
    const html = renderToStaticMarkup(
      <Home displayName="Hunter" plan={plan} activeBudget={10} onBudget={() => undefined} />,
    );
    // Two review items at 20s each: the line states the count AND ~minutes.
    expect(html).toContain("2 due · about 1 min");
  });

  it("summarizeForms caps the list honestly instead of silently truncating", () => {
    const many = Array.from({ length: 15 }, (_, i) => `w${i}`);
    const s = summarizeForms(many);
    expect(s).toContain("w11");
    expect(s).not.toContain("w12");
    expect(s).toContain("(15 in all)");
  });
});

describe("PracticeHub graded/formative badges (U3)", () => {
  it("every mode card carries a graded/formative badge, not prose only", () => {
    const html = renderToStaticMarkup(<PracticeHub onOpen={() => undefined} />);
    const badges = html.match(/data-grade-kind="(graded|formative)"/g) ?? [];
    expect(badges).toHaveLength(8);
    expect(html).toContain(">Graded<");
    expect(html).toContain(">Formative<");
  });

  it("formative modes are badged formative", () => {
    const html = renderToStaticMarkup(<PracticeHub onOpen={() => undefined} />);
    // Each formative blurb sits right after its formative badge.
    expect(html).toMatch(
      /data-grade-kind="formative"[^>]*>Formative<\/span><span class="meta"> — Read a sentence aloud/,
    );
    expect(html).toMatch(
      /data-grade-kind="formative"[^>]*>Formative<\/span><span class="meta"> — Speak along/,
    );
  });

  it("no formative card promises a score or grade in its own copy", () => {
    const html = renderToStaticMarkup(<PracticeHub onOpen={() => undefined} />);
    const formativeCards = html
      .split("data-grade-kind=")
      .filter((c) => c.startsWith('"formative"'));
    for (const card of formativeCards) {
      // Scope the slice to THIS card's blurb: without the </li> bound the
      // text runs into the next card, whose badge class name contains
      // "grade" and would trip the assertion from markup, not copy.
      const blurb = (card.split('<span class="meta"> — ')[1] ?? "").split("</li>")[0] ?? "";
      // Scoring vocabulary is allowed ONLY inside a sentence that explicitly
      // negates it ("nothing is scored or saved") — a disclaimer is honest,
      // a promise is not. Any other sentence with score language fails.
      for (const sentence of blurb.split(/(?<=[.!?])\s+/)) {
        if (/\b(score|scored|score|grade|graded)\b/i.test(sentence)) {
          expect(sentence).toMatch(/\b(no|not|nothing|never)\b/i);
        }
      }
    }
  });
});

describe("review grade buttons with FSRS interval preview (U6)", () => {
  const mine: MineItem = {
    id: "mine-00000000-0000-0000-0000-000000000001",
    surface: "猫",
    reading: null,
    gloss: "cat",
    source_citation: "ja.story.demo.first-meeting",
    created_at: "2026-11-20T00:00:00Z",
    due_at: "2026-11-20T12:00:00Z",
    context_sentence_id: null,
    context_sentence: null,
  };
  const draft: MineDraft = { surface: "", reading: "", gloss: "", source: "" };

  const renderReview = (preview?: { again_seconds: number; good_seconds: number } | null) =>
    renderToStaticMarkup(
      <MyWordsPanel
        items={[mine]}
        review={{ item: mine, revealed: true }}
        error={null}
        notice={null}
        draft={draft}
        onDraftChange={() => undefined}
        onAdd={() => undefined}
        onRemove={() => undefined}
        onGrade={() => undefined}
        onReviewNow={() => undefined}
        onStartNewReview={() => undefined}
        onStartReview={() => undefined}
        onReveal={() => undefined}
        intervalPreview={preview}
      />,
    );

  it("each grade button prints the scheduler's predicted next interval", () => {
    const html = renderReview({
      again_seconds: 600,
      good_seconds: 4 * 86_400,
    });
    expect(html).toContain("I knew it");
    expect(html).toContain("back in ~4 days");
    expect(html).toContain("Again");
    expect(html).toContain("back in ~10 min");
  });

  it("buttons stay plain when no prediction is available", () => {
    const html = renderReview(null);
    expect(html).not.toMatch(/back in ~|soon/);
  });

  it("previewIntervalLabel picks an honest unit and never a bare number", () => {
    expect(previewIntervalLabel(90)).toBe("back in ~2 min");
    expect(previewIntervalLabel(7200)).toBe("back in ~2 h");
    expect(previewIntervalLabel(86_400 * 10)).toBe("back in ~10 days");
    expect(previewIntervalLabel(0)).toBe("soon");
  });
});

describe("drill context replay (VOCAB-BUILDER-001)", () => {
  const bare: MineItem = {
    id: "mine-ctx",
    surface: "猫",
    reading: null,
    gloss: "cat",
    source_citation: "ja.story.demo.first-meeting",
    created_at: "2026-11-20T00:00:00Z",
    due_at: "2026-11-20T12:00:00Z",
    context_sentence_id: "ja.sent.demo.first-meeting.1",
    context_sentence: "猫です。",
  };
  const noCtx: MineItem = { ...bare, context_sentence_id: null, context_sentence: null };
  const draft: MineDraft = { surface: "", reading: "", gloss: "", source: "" };

  const render = (item: MineItem) =>
    renderToStaticMarkup(
      <MyWordsPanel
        items={[item]}
        review={{ item, revealed: true }}
        error={null}
        notice={null}
        draft={draft}
        onDraftChange={() => undefined}
        onAdd={() => undefined}
        onRemove={() => undefined}
        onGrade={() => undefined}
        onReviewNow={() => undefined}
        onStartNewReview={() => undefined}
        onStartReview={() => undefined}
        onReveal={() => undefined}
        onPlayContext={() => undefined}
      />,
    );

  it("a lookup-mined word replays its context sentence after reveal", () => {
    const html = render(bare);
    expect(html).toContain("In this sentence:");
    expect(html).toContain("猫です。");
    expect(html).toContain(">Play</button>");
  });
  it("a manually mined word states no context it does not have", () => {
    const html = render(noCtx);
    expect(html).not.toContain("In this sentence:");
  });
});
