/**
 * FEEL-PROGRESS-001 contract — Progress tab feel.
 *
 * The audit's section-5 cluster: dim-progress bars snap to width, the 12-week
 * calendar is 84 anonymous boxes with no way to read a day, a fresh learner
 * gets an instrument strip of abstentions instead of a designed zero-state,
 * and placement results land as bare prose. This file pins the fixes: the
 * fill-in glide (styles.css rule-body pins, same discipline as
 * motion-contract.test.ts), legible calendar cells, the honest zero-state,
 * and the calm what-you-know band. The live proof (glide measured mid-fill,
 * a real CDP hover scaling a cell with its tip open, the zero-state on a
 * truly fresh profile) is scripts/feel-progress-capture.mjs against a real
 * engine. Motion stays motion: no celebration copy (ADR-0002, WARM-MOMENTS
 * owns the one sanctioned moment).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DimProgress } from "./dim-progress";
import { ActivityCalendar, ProgressZeroState } from "./memory-stats";
import { PlacementResultBand } from "./home";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");
const appTsx = readFileSync(repoRoot + "apps/desktop/src/App.tsx", "utf8");
const homeTsx = readFileSync(repoRoot + "apps/desktop/src/home.tsx", "utf8");
const memoryTsx = readFileSync(repoRoot + "apps/desktop/src/memory-stats.tsx", "utf8");

function ruleBody(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a "${selector}" rule`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

// ------------------------------------------------------------------ bars

describe("FEEL-PROGRESS-001 bar glide (mock legend: grow from last shown value)", () => {
  it(":root carries the --dur-glide data-fill token (token literal never sits in a decl)", () => {
    expect(ruleBody(":root")).toContain("--dur-glide: 400ms");
  });

  it("@keyframes dim-glide grows from the --fill-from custom property", () => {
    const m = /@keyframes\s+dim-glide\s*\{([\s\S]*?)\n\}/.exec(css);
    expect(m, "styles.css must define @keyframes dim-glide").not.toBeNull();
    expect((m![1] ?? "").replace(/\s+/g, " ")).toContain("width: var(--fill-from, 0px)");
  });

  it(".dim-progress-fill rides the glide on the shared tokens", () => {
    const body = ruleBody(".dim-progress-fill");
    expect(body).toContain("fill: var(--accent)");
    expect(body).toContain("animation: dim-glide var(--dur-glide) var(--ease-out)");
  });

  it("DimProgress keeps the identical instrument markup and aria semantics", () => {
    const html = renderToStaticMarkup(
      <DimProgress
        pct={45}
        keyId="t:goal-a:read"
        ariaLabel="Reading toward “Eat together”: 45% of the gate"
      />,
    );
    expect(html).toContain('class="dim-progress"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('data-progress-pct="45"');
    expect(html).toContain('class="dim-progress-track"');
    expect(html).toContain('class="dim-progress-fill"');
    // first visit to this bar: grows from zero, lands at 45% of 120 = 54
    expect(html).toContain("--fill-from:0px");
    expect(html).toContain('width="54"');
  });

  it("a later visit glides from the last shown value, not from zero", () => {
    renderToStaticMarkup(<DimProgress pct={80} keyId="t:goal-b:listen" ariaLabel="x" />);
    const html = renderToStaticMarkup(
      <DimProgress pct={20} keyId="t:goal-b:listen" ariaLabel="x" />,
    );
    expect(html).toContain("--fill-from:96px"); // 80% of 120
    expect(html).toContain('width="24"');
  });

  it("both instrument sites render through the shared DimProgress component", () => {
    expect(homeTsx, "goal-dimension bars must ride DimProgress").toContain("<DimProgress");
    expect(memoryTsx, "band-retention bars must ride DimProgress").toContain("<DimProgress");
    // the raw inline svgs are gone from both call sites
    expect(memoryTsx).not.toContain('className="dim-progress"');
    expect(homeTsx).not.toContain('className="dim-progress"');
  });
});

// -------------------------------------------------------------- calendar

const calHtml = renderToStaticMarkup(
  <ActivityCalendar
    days={[
      { date: "2026-11-20", events: 2 },
      { date: "2026-11-14", events: 1 },
      { date: "2026-11-03", events: 4 },
    ]}
    today="2026-11-23"
  />,
);

describe("FEEL-PROGRESS-001 calendar cells become legible", () => {
  it("every in-window cell carries a date + summary label (no more anonymous boxes)", () => {
    expect(calHtml).toContain('aria-label="Nov 20 · 2 exercises"');
    expect(calHtml).toContain('aria-label="Nov 14 · 1 exercise"');
    expect(calHtml).toContain('aria-label="Nov 3 · 4 exercises"');
    expect(calHtml).toContain('aria-label="Nov 10 · no practice"');
  });

  it("cells are reachable and the svg is no longer hidden from readers", () => {
    expect(calHtml).toContain('tabindex="0"');
    expect(calHtml).not.toContain('aria-hidden="true"');
    // the group summary label stays (screen readers still get the whole story)
    expect(calHtml).toContain("Activity calendar, last 12 weeks:");
  });

  it("hover/focus scales the cell 1.15x; the focus ring is the teal outline", () => {
    expect(css, "hovered cell must scale 1.15x").toMatch(
      /\.memory-cal-cell:hover[^{]*\{[^}]*transform:\s*scale\(1\.15\)/,
    );
    const body = ruleBody(".memory-cal-cell");
    expect(body).toContain("transform-box: fill-box");
    expect(body).toContain("transform-origin: center");
    expect(body).toContain("transition: transform var(--dur-fast) var(--ease-out)");
    const ring = ruleBody(".memory-cal-cell:focus-visible");
    expect(ring).toContain("stroke: var(--accent-ink)");
  });

  it("cells fill in on arrival with a capped stagger", () => {
    const m = /@keyframes\s+cal-in\s*\{[^}]*?from\s*\{([^}]*)\}/.exec(css);
    expect(m, "styles.css must define @keyframes cal-in").not.toBeNull();
    expect(m![1]).toContain("opacity: 0");
    const body = ruleBody(".memory-cal-cell");
    expect(body).toContain("animation: cal-in var(--dur) var(--ease-out)");
    expect(body).toContain("animation-delay: calc(var(--cell-i, 0) * 6ms)");
  });

  it("the tip chip is a dark rounded fade-in under the cell (shape + text, never color alone)", () => {
    const body = ruleBody(".memory-cal-tip");
    expect(body).toContain("position: absolute");
    expect(body).toContain("background: var(--ink)");
    expect(body).toContain("color: var(--surface)");
    expect(body).toContain("animation: tip-in var(--dur-fast) var(--ease-out)");
    const m = /@keyframes\s+tip-in\s*\{[^}]*?from\s*\{([^}]*)\}/.exec(css);
    expect(m, "styles.css must define @keyframes tip-in").not.toBeNull();
    expect(m![1]).toContain("opacity: 0");
    // the wrapper anchors the tip
    expect(ruleBody(".memory-calendar")).toContain("position: relative");
  });
});

// ------------------------------------------------------------ zero-state

describe("FEEL-PROGRESS-001 honest zero-state for fresh learners", () => {
  it("the card says nothing happened and points at Today — no invented numbers", () => {
    const html = renderToStaticMarkup(<ProgressZeroState />);
    expect(html).toContain('class="progress-zero"');
    expect(html).toContain("Nothing studied yet");
    expect(html).toContain("your first session is on");
    expect(html).toContain("<strong>Today</strong>");
    // honesty guard: no streak/score vocabulary in the zero-state
    expect(html.toLowerCase()).not.toMatch(/streak|points|score|day [0-9]/);
  });

  it("the card is a solid designed card, not a stray paragraph, and it fades up on --dur", () => {
    const body = ruleBody(".progress-zero");
    expect(body).toContain("border: 1px solid var(--line)");
    expect(body).not.toContain("dashed");
    expect(body).toContain("animation: fade-up var(--dur) var(--ease-out)");
    expect(body).toContain("box-shadow: var(--shadow)");
    expect(ruleBody(".progress-zero-ring")).toContain("border-radius: 50%");
  });

  it("App renders it from the engine's lifetime facts, never when the read failed", () => {
    expect(appTsx).toContain("<ProgressZeroState");
    expect(appTsx).toContain("days_active === 0");
    expect(appTsx).toContain("units_done === 0");
  });
});

// ----------------------------------------------------------- placement

describe("FEEL-PROGRESS-001 placement gets a calm what-you-know band", () => {
  it("the bare prose verdict is replaced by the band (no celebration copy)", () => {
    expect(appTsx).toContain("<PlacementResultBand");
    expect(appTsx, "the old bare paragraph must be gone").not.toContain("Placement complete:");
    const html = renderToStaticMarkup(<PlacementResultBand hits={3} total={8} />);
    expect(html).toContain('class="know-band"');
    expect(html.toLowerCase()).toContain("what you know");
    expect(html).toContain("3 of 8");
    expect(html).toContain("Known foundations unlock in Practice automatically.");
    // calm posture (ADR-0002): no celebration vocabulary anywhere in the band
    expect(html.toLowerCase()).not.toMatch(/congrats|congratul|great job|nice|🎉|amazing/);
  });

  it("zero hits stays honest — confirms nothing, takes nothing away", () => {
    const html = renderToStaticMarkup(<PlacementResultBand hits={0} total={8} />);
    expect(html).toContain("No foundations were confirmed");
    expect(html).toContain("Nothing was taken away");
  });

  it("the band is card treatment on the shared tokens", () => {
    const body = ruleBody(".know-band");
    expect(body).toContain("background: var(--surface)");
    expect(body).toContain("border: 1px solid var(--line)");
    expect(body).toContain("animation: fade-up var(--dur) var(--ease-out)");
    expect(ruleBody(".know-band-eyebrow")).toContain("text-transform: uppercase");
  });
});
