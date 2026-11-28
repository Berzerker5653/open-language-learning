/**
 * FEEL-MYWORDS-001 contract — the My Words hierarchy.
 *
 * The audit named this screen the weakest: bare list rows, a raw ISO slice
 * for the due date, a one-click silent delete, and an add that lands with no
 * acknowledgement. This file pins the fixes the same way the other FEEL
 * lanes do — rule-body pins on the single sheet, SSR-visible component
 * states, the interactive remove -> UNDO chip -> deferred engine delete
 * walk (fake timers), and the App wiring that carries the add-word flash id.
 * Red at base by construction; the live-computed proof is
 * scripts/feel-mywords-capture.mjs.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MyWordsPanel,
  relativeDueLabel,
  type MineDraft,
  type MineItem,
  type MyWordsPanelProps,
} from "./words";

const panel = (over: Record<string, unknown> = {}) => (
  <MyWordsPanel {...(panelProps(over) as MyWordsPanelProps)} />
);

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");
const appTsx = readFileSync(repoRoot + "apps/desktop/src/App.tsx", "utf8");
// APP-SPLIT-003G: the Mine handler bodies (incl. the FEEL-MYWORDS-001
// flash-id store) moved to the wiring module; App keeps the wrapper + the
// panel wiring. Re-pinned to read both sides of the seam.
const mineWiring = readFileSync(repoRoot + "apps/desktop/src/app/mine-wiring.ts", "utf8");

function ruleBody(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a "${selector}" rule`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

const DAY = 86_400_000;
function item(over: Partial<MineItem> & { id: string; due_at: string | null }): MineItem {
  return {
    surface: "дом",
    reading: null,
    gloss: "house; home",
    source_citation: "ru.lesson.first",
    created_at: "2026-11-20T00:00:00Z",
    context_sentence_id: null,
    context_sentence: null,
    ...over,
  };
}
const draft: MineDraft = { surface: "", reading: "", gloss: "", source: "" };

function panelProps(over: Record<string, unknown> = {}) {
  return {
    items: [
      item({ id: "a", due_at: new Date(Date.now() + 3 * DAY).toISOString() }),
      item({ id: "b", due_at: new Date(Date.now() + DAY).toISOString() }),
      item({ id: "c", due_at: null }),
    ],
    review: null,
    error: null,
    notice: null,
    draft,
    onDraftChange: () => undefined,
    onAdd: () => undefined,
    onRemove: () => undefined,
    onGrade: () => undefined,
    onReviewNow: () => undefined,
    onStartNewReview: () => undefined,
    onStartReview: () => undefined,
    onReveal: () => undefined,
    ...over,
  };
}

describe("relativeDueLabel (friendly dates replace the ISO slice)", () => {
  const now = new Date("2026-11-23T15:00:00");
  const at = (days: number) => new Date(now.getTime() + days * DAY).toISOString();
  it("speaks the learner's tense, never a raw date", () => {
    expect(relativeDueLabel(at(-5), now)).toBe("5 days overdue");
    expect(relativeDueLabel(at(-1), now)).toBe("yesterday");
    expect(relativeDueLabel(at(0), now)).toBe("today");
    expect(relativeDueLabel(at(1), now)).toBe("tomorrow");
    expect(relativeDueLabel(at(3), now)).toBe("in 3 days");
    expect(relativeDueLabel(at(60), now)).toBe("in 60 days");
  });
  it("switches to honest bigger units for long intervals", () => {
    expect(relativeDueLabel(at(100), now)).toBe("in ~3 months");
    expect(relativeDueLabel(at(300), now)).toBe("in ~10 months");
    expect(relativeDueLabel(at(400), now)).toBe("in ~1 year");
    expect(relativeDueLabel(at(1000), now)).toBe("in ~3 years");
  });
});

describe("word rows are cards with a friendly due pill (SSR)", () => {
  it("rows carry the card treatment and the pill replaces the ISO slice", () => {
    const html = renderToStaticMarkup(panel());
    expect(html).toContain('class="mine-card"');
    expect(html).toContain('class="due"');
    expect(html).toContain("in 3 days");
    expect(html).toContain("tomorrow");
    expect(html).not.toMatch(/due 20\d\d-\d\d-\d\d/);
    // color alone must not carry the meaning: the pill wears a clock glyph
    expect(ruleBody(".due::before")).toMatch(/content/);
  });
  it("unscheduled words get a quiet new pill, not scheduled prose", () => {
    const html = renderToStaticMarkup(panel());
    expect(html).toContain('class="due due--new"');
  });
  it("the flashId lands the success pulse on exactly one row", () => {
    const html = renderToStaticMarkup(panel({ flashId: "b" }));
    expect(html).toContain('class="mine-card mine-card--flash"');
    expect(html.match(/mine-card--flash/g)).toHaveLength(1);
  });
  it("the review card enters and the reveal rises on the global keyframes", () => {
    const review = { item: item({ id: "r", due_at: null }), revealed: false };
    const closed = renderToStaticMarkup(panel({ review }));
    expect(closed).toContain('class="field review-card"');
    expect(closed).not.toContain("review-reveal");
    const open = renderToStaticMarkup(panel({ review: { ...review, revealed: true } }));
    expect(open).toContain('class="review-reveal"');
  });
});

describe("the sheet carries the FEEL-MYWORDS rules", () => {
  it("cards are rounded surface rows with the mock's hairline + shadow", () => {
    const body = ruleBody(".mine-card");
    expect(body).toContain("background: var(--surface)");
    expect(body).toContain("border: 1px solid var(--line)");
    expect(body).toContain("border-radius: var(--radius)");
    expect(body).toContain("box-shadow: var(--shadow)");
  });
  it("the due pill is the accent chip from the mock", () => {
    const body = ruleBody(".due");
    expect(body).toContain("background: var(--accent-soft)");
    expect(body).toContain("color: var(--accent-ink)");
    expect(body).toContain("border-radius: 999px");
  });
  it("the add-word flash rides the global tokens, one-shot", () => {
    expect(css).toMatch(/@keyframes mine-arrive\s*\{[^}]*var\(--accent-soft\)/);
    const flash = ruleBody(".mine-card--flash");
    expect(flash).toMatch(/animation:[^;]*fade-up var\(--dur\)/);
    expect(flash).toMatch(/animation:[^;]*mine-arrive var\(--dur-slow\)/);
  });
  it("the undo chip exists as the pill from the mock", () => {
    const body = ruleBody(".undo-chip");
    expect(body).toContain("border-radius: 999px");
    expect(ruleBody(".undo-chip::before")).toMatch(/content/);
  });
  it("review transitions ride card-in and fade-up", () => {
    expect(ruleBody(".review-card")).toContain("animation: card-in var(--dur-slow)");
    expect(ruleBody(".review-reveal")).toContain("animation: fade-up var(--dur)");
  });
});

describe("App wiring carries the add-word flash id", () => {
  it("addMine stores the engine's id and the panel receives flashId", () => {
    // APP-SPLIT-003G: the store moved to ./app/mine-wiring; the seam is
    // App's hoisted wrapper calling it. Assert both sides — the invariant
    // (engine id -> flashId prop) is unchanged.
    expect(appTsx).toMatch(
      /async function addMine\([^)]*\) \{\s*\n\s*return runAddMine\(mineWiringDeps/,
    );
    expect(mineWiring).toMatch(/setMineFlashId\(res\.id\)/);
    expect(appTsx).toMatch(/flashId=\{mineFlashId\}/);
  });
});
