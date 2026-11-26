import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * DRILL-HIERARCHY-001 contract: the drill screen's visual hierarchy.
 *
 * The UI-VERIFY-2026-11-23 audit (defect 2) measured Pause/Stop styled
 * IDENTICALLY to the answer tiles (same 44px height, same 15px type, same
 * surface fill), tiles only 44px tall in a wrap-row, and the listening
 * Play button ending at 329 against the 374 content grid. This card's
 * fix: tiles become the dominant stacked tappable objects (56px, 2px
 * border, full content grid), the session exit drops to quiet chrome
 * under a hairline divider (smaller type, soft ink, transparent fill,
 * 44px tap floor kept), and the audio row stretches to the tiles' grid.
 *
 * Same idiom as drill-feel.test.ts: pin RULE BODIES in the single sheet
 * plus the wiring that uses them; the live proof is
 * scripts/drill-hierarchy-capture.mjs (red-at-HEAD numbers committed in
 * state/evidence/DRILL-HIERARCHY-001/audit-red.json). The FEEL-DRILL
 * reveal semantics (the .btn.choice--correct/.choice--dim re-declaration
 * AFTER the generic .btn:disabled rule) are pinned HERE as a guard: this
 * lane may never re-rank them.
 */

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");
const practice = readFileSync(repoRoot + "apps/desktop/src/practice.tsx", "utf8");
const appTsx = readFileSync(repoRoot + "apps/desktop/src/App.tsx", "utf8");

function ruleBody(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\s*${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a "${selector}" rule`).not.toBeNull();
  return (m![1] ?? "").replace(/\s+/g, " ").trim();
}

describe("DRILL-HIERARCHY-001 answer tiles dominate", () => {
  it("the choices group stacks as one full-width column", () => {
    const body = ruleBody(".drill-choices");
    expect(body).toContain("flex-direction: column");
    expect(body).toContain("align-items: stretch");
  });

  it("tiles ride a 56px height with a 2px border and left-set type", () => {
    const body = ruleBody(".drill-choices .btn");
    expect(body).toContain("min-height: 3.5rem");
    expect(body).toContain("border-width: 2px");
    expect(body).toContain("font-size: 1rem");
    expect(body).toContain("justify-content: flex-start");
  });

  it("the hierarchy rules never declare graded STATE properties", () => {
    // The reveal (fill, ring color, dim opacity) belongs to the pinned
    // FEEL-DRILL rules; a hierarchy rule that touched color/fill/shadow
    // at equal-or-higher specificity could re-rank the cascade (run 205).
    const body = ruleBody(".drill-choices .btn");
    expect(body).not.toMatch(/border-color|background|box-shadow|opacity/);
  });

  it("the hierarchy rules are declared AFTER the FEEL-DRILL state rules", () => {
    const state = css.indexOf(".btn.choice--correct {");
    const dim = css.indexOf(".btn.choice--dim {");
    const hier = css.indexOf(".drill-choices .btn {");
    expect(state).toBeGreaterThan(-1);
    expect(dim).toBeGreaterThan(-1);
    expect(hier).toBeGreaterThan(state);
    expect(hier).toBeGreaterThan(dim);
    // ...and the pinned state re-declarations still sit after the generic
    // disabled rule — the FEEL-DRILL-001 (run 205) shape, unbroken.
    expect(css.indexOf(".btn.choice--correct {")).toBeGreaterThan(css.indexOf(".btn:disabled {"));
  });
});

describe("DRILL-HIERARCHY-001 session controls are quiet chrome", () => {
  it("the exit row sits under a hairline divider, right-aligned", () => {
    const body = ruleBody(".session-exit");
    expect(body).toContain("border-top: 1px solid var(--line)");
    expect(body).toContain("justify-content: flex-end");
  });

  it("exit controls are smaller, soft-ink and unfilled but keep the 44px floor", () => {
    const body = ruleBody(".session-exit .btn");
    expect(body).toContain("min-height: 2.75rem"); // 44px tap floor
    expect(body).toContain("font-size: 0.8125rem"); // strictly under the tile's 1rem
    expect(body).toContain("color: var(--ink-soft)");
    expect(body).toContain("background: transparent");
  });
});

describe("DRILL-HIERARCHY-001 audio row rides the content grid", () => {
  it("the Play control stretches across the grid the tiles sit on", () => {
    expect(ruleBody(".audio-row .btn")).toContain("flex: 1 1 100%");
  });
});

describe("DRILL-HIERARCHY-001 wiring", () => {
  it("the choices group carries the drill-choices hook", () => {
    expect(practice).toContain('aria-label="Choices" className="btn-row drill-choices"');
  });

  it("the listening audio row carries the audio-row hook", () => {
    expect(practice).toContain('<div className="btn-row audio-row">');
  });

  it("the session exit row carries the session-exit hook over pause/stop", () => {
    expect(appTsx).toMatch(
      /<div className="btn-row session-exit">\s*<button[^>]*data-session-pause/,
    );
    expect(appTsx).toMatch(/data-session-stop/);
  });
});
