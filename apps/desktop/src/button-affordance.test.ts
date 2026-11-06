import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * BUTTON-AFFORDANCE-001 contract: every working control must read as
 * clickable and every disabled control must read as disabled, for each
 * file that uses the bare `btn` class. The bare `.btn` base therefore
 * carries the full rest/hover/disabled treatment; this test pins that
 * treatment and pins the inventory of bare-`btn` call sites so a new
 * call site cannot quietly dodge the contract.
 */

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(repoRoot + "packages/ui/src/styles.css", "utf8");

function ruleBody(selector: string): string {
  // match a top-level rule for exactly this selector
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^${esc}\\s*\\{([^}]*)\\}`, "m").exec(css);
  expect(m, `styles.css must define a "${selector}" rule`).not.toBeNull();
  return m![1] ?? "";
}

describe("button affordance contract", () => {
  it("bare .btn has a defined rest treatment (visible border, surface, ink, pointer)", () => {
    const rest = ruleBody(".btn");
    expect(rest).toContain("cursor: pointer");
    expect(rest).toMatch(/border:\s*1px solid var\(--line-strong\)/);
    expect(rest).toContain("background: var(--surface)");
    expect(rest).toContain("color: var(--ink)");
    expect(rest).not.toContain("solid transparent");
  });

  it("bare .btn has a distinct hover treatment", () => {
    const hover = ruleBody(".btn:hover:not(:disabled)");
    expect(hover).toContain("background: var(--surface-sunk)");
    expect(hover).toContain("border-color: var(--ink-faint)");
  });

  it("disabled .btn reads as disabled and differs from rest beyond opacity", () => {
    const rest = ruleBody(".btn");
    const disabled = ruleBody(".btn:disabled");
    expect(disabled).toContain("cursor: not-allowed");
    expect(disabled).toMatch(/opacity:\s*0?\.\d+/);
    // background must visibly differ from the enabled surface
    expect(disabled).toContain("background: var(--surface-sunk)");
    expect(rest).toContain("background: var(--surface)");
    // and the distinction is not color-blind-only: text and border change too
    expect(disabled).toContain("color: var(--ink-soft)");
    expect(disabled).toContain("border-color: var(--line)");
  });

  it("primary variant hover still wins over the base hover", () => {
    const primaryHover = ruleBody(".btn--primary:hover:not(:disabled)");
    expect(primaryHover).toContain("background: var(--accent-ink)");
  });

  it("bare-btn call sites stay inside the reviewed inventory", () => {
    const appSrc = repoRoot + "apps/desktop/src/";
    const files = readdirSync(appSrc)
      .filter((f) => /\.(tsx|ts)$/.test(f) && !f.includes(".test."))
      .filter((f) => readFileSync(appSrc + f, "utf8").includes('className="btn"'))
      .sort();
    expect(files).toEqual(
      [
        "App.tsx",
        "hub.tsx",
        "lesson.tsx",
        "onboarding.tsx",
        "settings.tsx",
        "shadowing.tsx",
        "words.tsx",
      ].sort(),
    );
  });
});
