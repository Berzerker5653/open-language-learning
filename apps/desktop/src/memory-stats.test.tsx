// PROGRESS-STATS-001 (market audit U7/U14): the stats strip is an
// instrument the learner reads about their own memory — every figure local,
// every abstention honest, every chart dependency-free SVG with the same
// a11y semantics SessionChrome's progress row is tested for.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryStatsStrip, type MemoryStats } from "./memory-stats";

const stats = (over: Partial<MemoryStats> = {}): MemoryStats => ({
  due_today: 3,
  est_minutes: 2,
  band_retention: [
    { band: "on-ramp", retention_pct: 62, scheduled_items: 4 },
    { band: "a1", retention_pct: null, scheduled_items: 0 },
  ],
  activity_days: [
    { date: "2026-11-19", events: 3 },
    { date: "2026-11-20", events: 1 },
  ],
  ...over,
});

describe("MemoryStatsStrip", () => {
  it("names due work with the engine's own minute price, marked as an estimate", () => {
    const html = renderToStaticMarkup(<MemoryStatsStrip stats={stats()} today="2026-11-21" />);
    expect(html).toContain("3 cards are due today");
    expect(html).toContain("about 2 minutes of review");
    expect(html).toContain('data-due-today="3"');
  });

  it("says nothing is due without inventing a time figure", () => {
    const html = renderToStaticMarkup(
      <MemoryStatsStrip stats={stats({ due_today: 0, est_minutes: 0 })} today="2026-11-21" />,
    );
    expect(html).toContain("Nothing is due today");
    expect(html).not.toContain("about 0");
    expect(html).not.toContain("0 minutes");
  });

  it("draws retention bars with progressbar semantics, and abstains per band", () => {
    const html = renderToStaticMarkup(<MemoryStatsStrip stats={stats()} today="2026-11-21" />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="62"');
    expect(html).toContain('data-progress-pct="62"');
    // A band with nothing scheduled gets no bar and no invented 0%.
    expect(html).toContain("no scheduled material in this band yet");
    expect(html).not.toContain('aria-valuenow="0"');
  });

  it("renders the 12-week calendar as local counts only, with a summary label", () => {
    const html = renderToStaticMarkup(<MemoryStatsStrip stats={stats()} today="2026-11-21" />);
    expect(html).toContain(
      "Activity calendar, last 12 weeks: 2 active days, busiest day 3 exercises",
    );
    expect(html).toContain('data-date="2026-11-20"');
    expect(html).toContain('data-events="3"');
    expect(html).toContain("2 of the last 84 days had practice");
  });

  it("frames every figure as a local instrument, never a grade or certificate", () => {
    const html = renderToStaticMarkup(<MemoryStatsStrip stats={stats()} today="2026-11-21" />);
    expect(html).toContain("local data from your own practice");
    expect(html).toContain("not a grade or a certificate");
    expect(html).toContain('aria-label="Memory instruments"');
    // The n=1 framing stays; comparison and reward language stays out.
    expect(html).not.toMatch(/streak|xp|points|rank|league|top \d/i);
  });

  it("carries no runtime dependencies beyond the repo's existing react rendering", async () => {
    // The strip is built from plain JSX/SVG only; this import list is the
    // whole contract. If a chart library ever appears in this module, the
    // vite build (dependency scan) and this test's module graph change.
    const src = await import("./memory-stats?raw");
    const imports = (src.default.match(/^import .*$/gm) ?? []).join("\n");
    expect(imports).toContain('from "./home"');
    expect(imports).not.toMatch(/from "(?!react|\.\/|~)/);
  });
});
